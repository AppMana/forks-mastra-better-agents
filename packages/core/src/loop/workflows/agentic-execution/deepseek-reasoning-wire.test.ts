import { createOpenAICompatible } from '@ai-sdk/openai-compatible-v5';
import { describe, expect, it } from 'vitest';

import { convertFullStreamChunkToMastra } from '../../../stream/aisdk/v5/transform';
import { buildMessagesFromChunks } from './build-messages-from-chunks';
import type { CollectedChunk } from './build-messages-from-chunks';

/**
 * A DeepSeek V4 turn, from the wire to the part that gets stored.
 *
 * The chip that folds thinking away is downstream of three translations, and
 * a break in any of them looks identical in the UI: the thinking shows up as
 * ordinary reply text. So this drives the REAL decoders end to end rather than
 * asserting on a hand-built part.
 *
 *   SSE bytes                     (this file's fixtures)
 *     -> @ai-sdk/openai-compatible chat model      reasoning_content -> reasoning-delta
 *     -> convertFullStreamChunkToMastra            AI SDK part -> Mastra chunk
 *     -> buildMessagesFromChunks                   chunks -> stored MastraDBMessage
 *
 * The stored shape this produces (`reasoning: ''` plus the text in `details`)
 * is the one the playground converter reads; the chip itself is covered by
 * packages/playground/src/lib/ai-ui/messages/__tests__/reasoning.test.tsx.
 *
 * The fixtures are the OpenAI-compatible streaming contract vLLM serves, which
 * is also what the provider's own decoder is written against: thinking rides
 * on `delta.reasoning_content`, the reply on `delta.content`. They are not a
 * capture from the jarvis deployment.
 */

const CHUNK_HEAD = {
  id: 'chatcmpl-dsv4-1',
  object: 'chat.completion.chunk',
  created: 1_786_060_000,
  model: 'deepseek-v4-int4-int8',
};

const sse = (deltas: Record<string, unknown>[]): string =>
  deltas
    .map(delta => `data: ${JSON.stringify({ ...CHUNK_HEAD, choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`)
    .join('') +
  `data: ${JSON.stringify({ ...CHUNK_HEAD, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n` +
  'data: [DONE]\n\n';

const modelOver = (body: string) =>
  createOpenAICompatible({
    name: 'vllm',
    baseURL: 'http://deepseek-v4-int4-int8.inference.svc.cluster.local:8000/v1',
    fetch: async () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
  }).chatModel('deepseek-v4-int4-int8');

/** Run the wire through every real translation and return what would be stored. */
async function storedPartsFor(body: string) {
  const { stream } = await modelOver(body).doStream({
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'What is in the file?' }] }],
  });

  const chunks: CollectedChunk[] = [];
  for await (const part of stream as ReadableStream<any> & AsyncIterable<any>) {
    const mastraChunk = convertFullStreamChunkToMastra(part, { runId: 'run-1' });
    if (mastraChunk) chunks.push(mastraChunk as CollectedChunk);
  }

  const [message] = buildMessagesFromChunks({ chunks, messageId: 'assistant-1' });
  return message.content.parts;
}

const THINKING_A = 'The user is asking about a file. ';
const THINKING_B = 'Let me read it before answering.';
const REPLY = "I'll read the file now.";

describe('a DeepSeek V4 turn keeps thinking out of the reply', () => {
  it('turns reasoning_content deltas into a reasoning part, and content into the text part', async () => {
    const parts = await storedPartsFor(
      sse([
        { role: 'assistant', content: null, reasoning_content: THINKING_A },
        { reasoning_content: THINKING_B },
        { content: '\n\n' },
        { content: REPLY },
      ]),
    );

    const reasoning = parts.find(part => part.type === 'reasoning');
    expect(reasoning, 'no reasoning part was stored, so the chip has nothing to render').toBeDefined();

    // The stored shape the playground converter reads: flat field empty, text in details.
    expect(reasoning).toMatchObject({
      type: 'reasoning',
      reasoning: '',
      details: [{ type: 'text', text: THINKING_A + THINKING_B }],
    });

    // ...and the thinking is NOT in anything the user reads as the reply.
    const visible = parts
      .filter(part => part.type === 'text')
      .map(part => (part as { text: string }).text)
      .join('');
    expect(visible.trim()).toBe(REPLY);
    expect(visible).not.toContain('Let me read it before answering');
  });

  it('interleaved thinking stays one reasoning part per span, not merged into the reply', async () => {
    // vLLM alternates reasoning_content and content within a single response;
    // the provider carries both under fixed ids ("reasoning-0" / "txt-0"), so a
    // span that reopens must not append into the earlier text part.
    const parts = await storedPartsFor(
      sse([{ reasoning_content: THINKING_A }, { content: REPLY }, { reasoning_content: THINKING_B }]),
    );

    const visible = parts
      .filter(part => part.type === 'text')
      .map(part => (part as { text: string }).text)
      .join('');
    expect(visible).toBe(REPLY);
    expect(visible).not.toContain(THINKING_A);
    expect(visible).not.toContain(THINKING_B);
  });

  it('is the failure the user sees: thinking sent as content has no reasoning part to fold', async () => {
    // The same turn with thinking inline in `content` — what a backend that is
    // not separating reasoning emits. Nothing downstream can recover it, which
    // is why an absent reasoning part is a BACKEND symptom and not a renderer
    // bug. This pins the distinction so the two are never conflated again.
    const parts = await storedPartsFor(sse([{ content: THINKING_A + THINKING_B }, { content: `\n\n${REPLY}` }]));

    expect(parts.find(part => part.type === 'reasoning')).toBeUndefined();

    const visible = parts
      .filter(part => part.type === 'text')
      .map(part => (part as { text: string }).text)
      .join('');
    expect(visible).toContain(THINKING_A);
  });
});

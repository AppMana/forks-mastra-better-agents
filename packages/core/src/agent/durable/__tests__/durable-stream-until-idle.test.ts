import { describe, expect, it } from 'vitest';
import { RequestContext, MASTRA_THREAD_ID_KEY } from '../../../request-context';
import { runDurableStreamUntilIdle } from '../durable-stream-until-idle';

/**
 * The dispatch race: a continuation's inner stream can end before the task it
 * just spawned announces `background-task-running`. Idleness must therefore be
 * decided against task storage, not the wrapper's local bookkeeping — closing
 * on the local set kills the stream while the run continues, and every part
 * after that is invisible to the subscriber.
 */

function streamOf(chunks: any[]): ReadableStream<any> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

/** A bg-event stream the test scripts by hand. */
function controlledStream(): { stream: ReadableStream<any>; emit: (c: any) => void; end: () => void } {
  let controller!: ReadableStreamDefaultController<any>;
  const stream = new ReadableStream<any>({
    start(c) {
      controller = c;
    },
  });
  return {
    stream,
    emit: c => controller.enqueue(c),
    end: () => controller.close(),
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('runDurableStreamUntilIdle', () => {
  it('does not close while storage still reports a live task', async () => {
    const requestContext = new RequestContext();
    requestContext.set(MASTRA_THREAD_ID_KEY, 'thread-1');

    // Turn scripts: the initial turn dispatches task t1 and ends; the first
    // continuation dispatches t2 and ends WITHOUT emitting a started event
    // (the race); the second continuation is the final answer.
    const turns: ReadableStream<any>[] = [
      streamOf([{ type: 'text-delta', payload: { text: 'dispatching t1' } }]),
      streamOf([{ type: 'text-delta', payload: { text: 'dispatching t2' } }]),
      streamOf([{ type: 'text-delta', payload: { text: 'final answer' } }]),
    ];
    let turn = 0;
    const agent = {
      id: 'agent-1',
      getMemory: async () => ({}),
      getDefaultOptions: async () => ({ requestContext }),
      stream: async () => ({
        runId: `run-${turn}`,
        cleanup: () => {},
        fullStream: turns[turn++]!,
        output: {},
      }),
    };

    // Storage truth: t1 live until its terminal event, then t2 live until
    // the test completes it. The local set never learns about t2's start.
    let liveTasks: Array<{ id: string }> = [];
    const bg = controlledStream();
    const bgManager = {
      stream: () => bg.stream,
      listTasks: async () => ({ tasks: liveTasks, total: liveTasks.length }),
    };

    const result = await runDurableStreamUntilIdle(
      agent as any,
      [{ role: 'user', content: 'go' }],
      { requestContext } as any,
      { activeStreams: new Map(), bgManager: bgManager as any },
    );

    const seen: any[] = [];
    let ended = false;
    void (async () => {
      const reader = result.fullStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        seen.push(value);
      }
      ended = true;
    })();

    // t1 runs, then completes; t2 is already live in storage when the
    // continuation ends, but no running event has arrived yet.
    liveTasks = [{ id: 't1' }];
    bg.emit({ type: 'background-task-running', payload: { taskId: 't1' } });
    await sleep(20);
    liveTasks = [{ id: 't2' }];
    bg.emit({ type: 'background-task-completed', payload: { taskId: 't1', toolCallId: 'c1' } });
    await sleep(50);

    expect(ended, 'closed during the dispatch race while storage reported t2 live').toBe(false);

    // t2 completes; the final continuation runs and the wrapper closes.
    liveTasks = [];
    bg.emit({ type: 'background-task-completed', payload: { taskId: 't2', toolCallId: 'c2' } });
    await sleep(50);

    expect(ended).toBe(true);
    const text = seen.map(c => c?.payload?.text).filter(Boolean);
    expect(text).toContain('final answer');
  });
});

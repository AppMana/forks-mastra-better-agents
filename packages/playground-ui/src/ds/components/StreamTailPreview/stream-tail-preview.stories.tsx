import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';

import { StreamTailPreview } from './stream-tail-preview';

const meta: Meta<typeof StreamTailPreview> = {
  title: 'Composite/StreamTailPreview',
  component: StreamTailPreview,
  decorators: [
    Story => (
      <div className="w-full max-w-3xl p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A bounded, live-tailing preview of a growing text stream — the last N lines of a running command, ' +
          'not a terminal. Memory and DOM size are capped by `maxLines`, a single pathological line is truncated ' +
          'at `maxLineLength`, ANSI escapes are stripped, and auto-scroll follows the tail only while the user ' +
          'is at the bottom.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StreamTailPreview>;

const CommandHeader = ({ command }: { command: string }) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="shrink-0 text-icon3">$</span>
    <code className="truncate font-mono text-ui-xs text-icon6">{command}</code>
  </div>
);

/**
 * Drives a stream at a fixed rate so the stories exercise the live path rather
 * than a static string. Returns the chunks accumulated so far.
 */
const useSimulatedStream = (chunks: readonly string[], intervalMs = 120) => {
  const [emitted, setEmitted] = useState<string[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setEmitted([]);
    const timer = setInterval(() => {
      const next = chunks[indexRef.current];
      if (next === undefined) {
        clearInterval(timer);
        return;
      }
      indexRef.current++;
      setEmitted(previous => [...previous, next]);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [chunks, intervalMs]);

  return { emitted, isDone: emitted.length === chunks.length };
};

const buildLog = [
  '> mastra@1.0.0 build\n',
  '> tsc -p tsconfig.build.json && vite build\n',
  '\n',
  'vite v7.3.1 building for production...\n',
  'transforming (1) src/index.ts\n',
  'transforming (248) src/ds/components/index.ts\n',
  'transforming (1024) src/domains/traces/index.ts\n',
  '\x1b[32m✓\x1b[0m 1620 modules transformed.\n',
  'rendering chunks...\n',
  'computing gzip size...\n',
  'dist/index.es.js   2,431.02 kB │ gzip: 612.44 kB\n',
  'dist/index.css        94.18 kB │ gzip:  15.02 kB\n',
  '\x1b[32m✓\x1b[0m built in 8.42s\n',
];

/** The common case: a build streaming in while the tool call is still running. */
export const Streaming: Story = {
  render: () => {
    const { emitted, isDone } = useSimulatedStream(buildLog);
    return (
      <StreamTailPreview
        source={emitted}
        header={<CommandHeader command="pnpm build" />}
        isStreaming={!isDone}
        done={isDone}
      />
    );
  },
};

/** Nothing has arrived yet — the sandbox is still starting. */
export const Empty: Story = {
  args: {
    source: '',
    header: <CommandHeader command="pnpm test" />,
    isStreaming: true,
    emptyLabel: 'Waiting for output…',
  },
};

/** A finished command: the last line has no trailing newline and is flushed. */
export const Completed: Story = {
  args: {
    source: buildLog.join('') + 'Done in 8.9s',
    header: <CommandHeader command="pnpm build" />,
    done: true,
  },
};

/**
 * 20,000 lines through a 200-line window. The DOM holds 200 rows regardless,
 * and the banner states what is not being shown.
 */
export const RingBufferOverflow: Story = {
  args: {
    source: Array.from({ length: 20_000 }, (_, i) => `[${i}] compiling module ${i}\n`).join(''),
    header: <CommandHeader command="pnpm -r build" />,
    done: true,
  },
};

/**
 * A single 50,000-character line — a minified bundle echoed to stdout, or a
 * base64 blob. It must not blow up layout or memory, and the omission must be
 * visible rather than silent.
 */
export const PathologicalLongLine: Story = {
  args: {
    source: `normal line\n${'lorem ipsum dolor sit amet '.repeat(2_000)}\nanother normal line\n`,
    maxLineLength: 300,
    header: <CommandHeader command="cat dist/bundle.min.js" />,
    done: true,
  },
};

/** ANSI colors, cursor moves and OSC titles are stripped by default. */
export const AnsiStripped: Story = {
  args: {
    source:
      '\x1b]0;build\x07\x1b[1m\x1b[34mINFO\x1b[0m  starting\n' +
      '\x1b[2K\x1b[1G\x1b[33mWARN\x1b[0m  deprecated option\n' +
      '\x1b[31mERROR\x1b[0m module not found\n',
    header: <CommandHeader command="pnpm lint" />,
    done: true,
  },
};

/** `\r` progress rewrites collapse to the final state instead of stacking rows. */
export const CarriageReturnProgress: Story = {
  render: () => {
    const chunks = Array.from({ length: 21 }, (_, i) => `\rDownloading model  ${(i * 5).toString().padStart(3)}%`);
    const { emitted, isDone } = useSimulatedStream([...chunks, '\rDownloading model  100%\nComplete.\n'], 80);
    return (
      <StreamTailPreview
        source={emitted}
        header={<CommandHeader command="huggingface-cli download" />}
        isStreaming={!isDone}
      />
    );
  },
};

/**
 * Scroll up in this story: following stops and a "Jump to latest" control
 * appears, so a user reading an error is never yanked back to the end.
 */
export const ScrollAwayToUnpin: Story = {
  render: () => {
    const chunks = Array.from({ length: 400 }, (_, i) => `[${String(i).padStart(3, '0')}] still working…\n`);
    const { emitted, isDone } = useSimulatedStream(chunks, 60);
    return (
      <StreamTailPreview
        source={emitted}
        header={<CommandHeader command="pnpm test --watch" />}
        isStreaming={!isDone}
        maxHeight="12rem"
      />
    );
  },
};

/** A tiny window, for embedding a preview under a collapsed tool badge. */
export const CompactWindow: Story = {
  args: {
    source: buildLog.join(''),
    maxLines: 4,
    maxHeight: '6rem',
    done: true,
  },
};

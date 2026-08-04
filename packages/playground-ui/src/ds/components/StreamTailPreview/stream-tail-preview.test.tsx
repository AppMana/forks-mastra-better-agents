// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { StreamTailPreview } from './stream-tail-preview';

/**
 * jsdom has no layout: `scrollHeight` and `clientHeight` are always 0, so the
 * pinned/unpinned decision can never be exercised through real scrolling.
 * Define them as configurable so each test can state the geometry it means.
 */
const setGeometry = (element: HTMLElement, geometry: { scrollHeight: number; clientHeight: number }) => {
  Object.defineProperty(element, 'scrollHeight', { value: geometry.scrollHeight, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: geometry.clientHeight, configurable: true });
};

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => cleanup());

const lineTexts = () => screen.queryAllByTestId('stream-tail-preview-line').map(node => node.textContent);

describe('StreamTailPreview', () => {
  it('renders each completed line of a string source', () => {
    render(<StreamTailPreview source={'alpha\nbeta\ngamma\n'} />);

    expect(lineTexts()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('renders the trailing partial line separately from completed lines', () => {
    render(<StreamTailPreview source={'alpha\npart'} />);

    expect(lineTexts()).toEqual(['alpha']);
    expect(screen.getByTestId('stream-tail-preview-pending').textContent).toBe('part');
  });

  it('promotes the partial line to a real line once done', () => {
    render(<StreamTailPreview source={'alpha\npart'} done />);

    expect(lineTexts()).toEqual(['alpha', 'part']);
    expect(screen.queryByTestId('stream-tail-preview-pending')).toBeNull();
  });

  it('shows the empty label until output arrives', () => {
    render(<StreamTailPreview source="" emptyLabel="nothing yet" />);

    expect(screen.getByTestId('stream-tail-preview-empty').textContent).toBe('nothing yet');
  });

  it('accepts an append-only chunk array', () => {
    render(<StreamTailPreview source={['one\ntw', 'o\nthree\n']} />);

    expect(lineTexts()).toEqual(['one', 'two', 'three']);
  });

  it('appends only the new suffix when a string source grows', () => {
    const { rerender } = render(<StreamTailPreview source={'a\n'} />);
    rerender(<StreamTailPreview source={'a\nb\n'} />);

    expect(lineTexts()).toEqual(['a', 'b']);
  });

  it('appends only the new chunks when a chunk array grows', () => {
    const { rerender } = render(<StreamTailPreview source={['a\n']} />);
    rerender(<StreamTailPreview source={['a\n', 'b\n']} />);

    expect(lineTexts()).toEqual(['a', 'b']);
  });

  it('restarts when a string source is replaced rather than extended', () => {
    const { rerender } = render(<StreamTailPreview source={'old\n'} />);
    rerender(<StreamTailPreview source={'fresh\n'} />);

    expect(lineTexts()).toEqual(['fresh']);
  });

  it('does not spin when the caller passes a fresh array identity with identical content', () => {
    // Consumers build the chunk list with `parts.filter(...)` inside render, so
    // the identity changes on every render while the content does not. If that
    // published new state each time, the component would re-render forever.
    let renders = 0;
    const Harness = ({ chunks }: { chunks: string[] }) => {
      renders++;
      return <StreamTailPreview source={[...chunks]} />;
    };

    const { rerender } = render(<Harness chunks={['a\n']} />);
    const rendersAfterMount = renders;

    rerender(<Harness chunks={['a\n']} />);

    expect(lineTexts()).toEqual(['a']);
    // One render for the explicit rerender, and no state-driven follow-up.
    expect(renders).toBe(rendersAfterMount + 1);
  });

  it('restarts when a chunk array shrinks', () => {
    const { rerender } = render(<StreamTailPreview source={['a\n', 'b\n']} />);
    rerender(<StreamTailPreview source={['c\n']} />);

    expect(lineTexts()).toEqual(['c']);
  });

  it('caps the rendered rows at maxLines, however much output arrives', () => {
    const source = Array.from({ length: 5_000 }, (_, i) => `line ${i}\n`).join('');
    render(<StreamTailPreview source={source} maxLines={5} />);

    expect(lineTexts()).toEqual(['line 4995', 'line 4996', 'line 4997', 'line 4998', 'line 4999']);
  });

  it('says how many earlier lines it dropped', () => {
    render(<StreamTailPreview source={'1\n2\n3\n4\n5\n'} maxLines={2} />);

    expect(screen.getByTestId('stream-tail-preview-dropped').textContent).toContain('3 earlier lines hidden');
  });

  it('uses the singular form for a single dropped line', () => {
    render(<StreamTailPreview source={'1\n2\n3\n'} maxLines={2} />);

    expect(screen.getByTestId('stream-tail-preview-dropped').textContent).toContain('1 earlier line hidden');
  });

  it('does not mention dropped lines when nothing was dropped', () => {
    render(<StreamTailPreview source={'1\n2\n'} maxLines={5} />);

    expect(screen.queryByTestId('stream-tail-preview-dropped')).toBeNull();
  });

  it('truncates a pathological single line instead of rendering 50k characters', () => {
    render(<StreamTailPreview source={`${'x'.repeat(50_000)}\n`} maxLineLength={20} />);

    const [line] = screen.getAllByTestId('stream-tail-preview-line');
    expect(line!.textContent).toBe(`${'x'.repeat(20)}… +49980`);
  });

  it('announces the truncation for assistive technology', () => {
    render(<StreamTailPreview source={`${'x'.repeat(100)}\n`} maxLineLength={10} />);

    expect(screen.getByLabelText('line truncated, 90 more characters')).not.toBeNull();
  });

  it('strips ANSI escapes by default', () => {
    render(<StreamTailPreview source={'\x1b[31mred\x1b[0m\n'} />);

    expect(lineTexts()).toEqual(['red']);
  });

  it('keeps ANSI escapes when ansi is preserve, for a downstream renderer', () => {
    render(<StreamTailPreview source={'\x1b[31mred\n'} ansi="preserve" />);

    expect(lineTexts()).toEqual(['\x1b[31mred']);
  });

  it('collapses carriage-return progress rewrites to the final state', () => {
    render(<StreamTailPreview source={'10%\r50%\r100%\n'} />);

    expect(lineTexts()).toEqual(['100%']);
  });

  it('renders a custom line renderer when provided', () => {
    render(<StreamTailPreview source={'hi\n'} renderLine={line => <b>{line.text.toUpperCase()}</b>} />);

    expect(lineTexts()).toEqual(['HI']);
  });

  it('renders the header inside the frame', () => {
    render(<StreamTailPreview source="" header={<span>pnpm build</span>} />);

    expect(screen.getByText('pnpm build')).not.toBeNull();
  });

  it('marks the region busy and polite while streaming', () => {
    render(<StreamTailPreview source={'a\n'} isStreaming />);

    const region = screen.getByTestId('stream-tail-preview');
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('stops announcing once the stream is no longer live', () => {
    render(<StreamTailPreview source={'a\n'} />);

    const region = screen.getByTestId('stream-tail-preview');
    expect(region.getAttribute('aria-busy')).toBeNull();
    expect(region.getAttribute('aria-live')).toBe('off');
  });

  it('is keyboard reachable so the output can be scrolled without a pointer', () => {
    render(<StreamTailPreview source={'a\n'} />);

    expect(screen.getByTestId('stream-tail-preview').getAttribute('tabindex')).toBe('0');
  });
});

describe('StreamTailPreview auto-scroll pinning', () => {
  it('starts pinned, with no jump control', () => {
    render(<StreamTailPreview source={'a\n'} />);

    expect(screen.getByTestId('stream-tail-preview').getAttribute('data-pinned')).toBe('true');
    expect(screen.queryByTestId('stream-tail-preview-jump')).toBeNull();
  });

  it('follows new output to the bottom while pinned', () => {
    const { rerender } = render(<StreamTailPreview source={'a\n'} />);
    const region = screen.getByTestId('stream-tail-preview');
    setGeometry(region, { scrollHeight: 1000, clientHeight: 100 });

    rerender(<StreamTailPreview source={'a\nb\n'} />);

    expect(region.scrollTop).toBe(1000);
  });

  it('unpins when the user scrolls away from the bottom', () => {
    render(<StreamTailPreview source={'a\n'} />);
    const region = screen.getByTestId('stream-tail-preview');
    setGeometry(region, { scrollHeight: 1000, clientHeight: 100 });

    // A programmatic scroll happened on mount; the first event is consumed as
    // ours, so scroll twice to model a real user gesture.
    fireEvent.scroll(region);
    region.scrollTop = 200;
    fireEvent.scroll(region);

    expect(region.getAttribute('data-pinned')).toBe('false');
    expect(screen.getByTestId('stream-tail-preview-jump')).not.toBeNull();
  });

  it('stops following once unpinned, so a user reading an error is not yanked away', () => {
    const { rerender } = render(<StreamTailPreview source={'a\n'} />);
    const region = screen.getByTestId('stream-tail-preview');
    setGeometry(region, { scrollHeight: 1000, clientHeight: 100 });

    fireEvent.scroll(region);
    region.scrollTop = 200;
    fireEvent.scroll(region);

    rerender(<StreamTailPreview source={'a\nb\nc\n'} />);

    expect(region.scrollTop).toBe(200);
  });

  it('re-pins when the user scrolls back to within the threshold of the bottom', () => {
    render(<StreamTailPreview source={'a\n'} />);
    const region = screen.getByTestId('stream-tail-preview');
    setGeometry(region, { scrollHeight: 1000, clientHeight: 100 });

    fireEvent.scroll(region);
    region.scrollTop = 200;
    fireEvent.scroll(region);
    expect(region.getAttribute('data-pinned')).toBe('false');

    region.scrollTop = 895; // 1000 - 895 - 100 = 5px from the bottom
    fireEvent.scroll(region);

    expect(region.getAttribute('data-pinned')).toBe('true');
  });

  it('jump to latest scrolls to the bottom and re-pins', () => {
    render(<StreamTailPreview source={'a\n'} />);
    const region = screen.getByTestId('stream-tail-preview');
    setGeometry(region, { scrollHeight: 1000, clientHeight: 100 });

    fireEvent.scroll(region);
    region.scrollTop = 0;
    fireEvent.scroll(region);

    act(() => {
      screen.getByTestId('stream-tail-preview-jump').click();
    });

    expect(region.scrollTop).toBe(1000);
    expect(region.getAttribute('data-pinned')).toBe('true');
    expect(screen.queryByTestId('stream-tail-preview-jump')).toBeNull();
  });
});

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Distance from the bottom, in pixels, still considered "at the bottom".
 * Sub-pixel layout and fractional line heights mean an exact comparison never
 * holds, and a user who is one pixel off the bottom still means "follow along".
 */
const PIN_THRESHOLD_PX = 16;

export interface UsePinnedScrollResult<T extends HTMLElement> {
  /** Attach to the scrolling element. */
  ref: React.RefObject<T | null>;
  /** True while the view is following new content. */
  isPinned: boolean;
  /** Scroll to the bottom and re-pin. Wire to a "jump to latest" control. */
  scrollToBottom: () => void;
  /** Attach to the scrolling element's `onScroll`. */
  onScroll: () => void;
}

/**
 * Follow-the-tail scrolling that yields to the user.
 *
 * The rule: the view auto-scrolls only while it is pinned to the bottom, and it
 * unpins the moment the user scrolls away. Unlike a plain
 * "scrollTop = scrollHeight on every update", this never yanks a user who has
 * scrolled up to read an error back down to the end of a running build.
 *
 * Pin state is React state (not a ref) precisely so a "jump to latest"
 * affordance can render when following stops.
 *
 * @param revision Bump this whenever content changes; the effect re-scrolls.
 */
export const usePinnedScroll = <T extends HTMLElement>(revision: number): UsePinnedScrollResult<T> => {
  const ref = useRef<T | null>(null);
  const [isPinned, setIsPinned] = useState(true);
  // Mirrors `isPinned` for use inside effects without re-subscribing them.
  const pinnedRef = useRef(true);
  // Set while we are the ones moving the scroll position, so the resulting
  // scroll event is not mistaken for the user scrolling away.
  const programmaticRef = useRef(false);

  const setPinned = useCallback((next: boolean) => {
    pinnedRef.current = next;
    setIsPinned(previous => (previous === next ? previous : next));
  }, []);

  const scrollToBottom = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    programmaticRef.current = true;
    element.scrollTop = element.scrollHeight;
    setPinned(true);
  }, [setPinned]);

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    if (programmaticRef.current) {
      programmaticRef.current = false;
      return;
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setPinned(distanceFromBottom <= PIN_THRESHOLD_PX);
  }, [setPinned]);

  // Layout effect so the jump happens in the same frame the new line paints;
  // a passive effect shows one frame of the pre-scroll position and flickers.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !pinnedRef.current) return;
    programmaticRef.current = true;
    element.scrollTop = element.scrollHeight;
  }, [revision]);

  // A container that grows (a wrapping line, a font load) moves the bottom
  // without any content change, so re-pin on resize too.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!pinnedRef.current) return;
      programmaticRef.current = true;
      element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isPinned, scrollToBottom, onScroll };
};

"use client";

import { useEffect, useRef, useState } from "react";

export type PresenceStatus = "open" | "closing";

interface PresenceState {
  /** Whether the overlay should be in the DOM (true while open AND while
   *  the exit animation is still playing). */
  isMounted: boolean;
  /** "open" while entering/idle, "closing" while the exit animation runs. */
  status: PresenceStatus;
}

/**
 * Keeps a closing overlay mounted long enough to play its exit animation,
 * then unmounts it — giving overlays symmetric, interruptible enter/exit
 * without pulling in an animation library.
 *
 * Re-opening mid-exit cancels the pending unmount (interruptible), so a
 * fast toggle never strands the overlay in a half-closed state.
 *
 * `exitDurationMs` must match the CSS exit animation duration so the node
 * is removed exactly as the animation lands.
 */
export function usePresence(isOpen: boolean, exitDurationMs: number): PresenceState {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [status, setStatus] = useState<PresenceStatus>(isOpen ? "open" : "closing");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMounted(true);
      setStatus("open");
      return;
    }

    // Closing: only schedule an unmount if something is currently mounted.
    if (!isMounted) {
      return;
    }
    setStatus("closing");
    timeoutRef.current = window.setTimeout(() => {
      setIsMounted(false);
      timeoutRef.current = null;
    }, exitDurationMs);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // `isMounted` intentionally omitted: we react to open/close edges, not
    // to our own mount flips (which would reschedule the unmount timer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exitDurationMs]);

  return { isMounted, status };
}

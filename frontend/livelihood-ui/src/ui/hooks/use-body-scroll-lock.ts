import { useEffect } from "react";

/**
 * Locks the page's own scroll while `locked` is true — a plain CSS lock,
 * deliberately not Radix's `Dialog modal` scroll-lock (that one installs a
 * global wheel-event interceptor that doesn't recognize content portalled
 * outside the dialog, such as a `Popover` list opened from within it, and
 * ends up blocking wheel-scroll on that content too). Pair with
 * `Dialog modal={false}` to keep the background from scrolling without
 * reintroducing that conflict.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}

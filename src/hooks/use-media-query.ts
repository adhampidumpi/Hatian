"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. Returns `false` during server rendering,
 * so pass the query for the less common case (e.g. desktop) and render the
 * mobile UI by default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `lg` breakpoint (64rem), where the sidebar layout starts. */
export const DESKTOP_QUERY = "(min-width: 64rem)";

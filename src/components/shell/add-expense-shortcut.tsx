"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { addExpenseHref, isEditorRoute } from "./nav-items";

/** Press N anywhere (outside a text field) to add an expense. */
export function AddExpenseShortcut() {
  const router = useRouter();
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // `key` can be missing on synthetic events (e.g. browser autofill).
      if (typeof event.key !== "string" || event.key.toLowerCase() !== "n")
        return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      if (isEditorRoute(window.location.pathname)) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest("input, textarea, select, [role='dialog']")
      ) {
        return;
      }
      event.preventDefault();
      router.push(addExpenseHref(window.location.pathname));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  return null;
}

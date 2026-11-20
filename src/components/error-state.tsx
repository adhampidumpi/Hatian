"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * What an error boundary shows: what happened, a reference to quote, and
 * Try again (`retry()` re-fetches the segment's data, then re-renders).
 */
export function ErrorState({
  error,
  retry,
  Heading = "h1",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** h2 when the page around it already has its h1 (a group's tabs). */
  Heading?: "h1" | "h2";
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <Heading className="text-[22px] font-bold tracking-[-0.02em]">
        Something went wrong
      </Heading>
      <p className="text-[15px] text-ink-2">
        That didn&apos;t load. Your data is safe: try again, and if it keeps
        happening, come back in a few minutes.
      </p>
      {error.digest && (
        <p className="text-[13px] text-ink-3">
          Reference: <span className="amount">{error.digest}</span>
        </p>
      )}
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}

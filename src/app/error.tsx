"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

/** Fallback for unexpected errors anywhere below the root layout. */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-5 py-10">
      <Logo />
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">
        Something went wrong
      </h1>
      <p className="text-[15px] text-ink-2">
        That didn&apos;t work. Your data is safe; try again, and if it keeps
        happening, come back in a few minutes.
      </p>
      {error.digest && (
        <p className="text-[13px] text-ink-3">
          Reference: <span className="amount">{error.digest}</span>
        </p>
      )}
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}

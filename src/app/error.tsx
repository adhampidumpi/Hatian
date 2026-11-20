"use client";

import { ErrorState } from "@/components/error-state";
import { Logo } from "@/components/logo";

/** Errors outside the app shell (sign-in, invite links). */
export default function RootError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Logo />
      <ErrorState {...props} />
    </main>
  );
}

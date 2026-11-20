import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-5 py-10">
      <Logo />
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">
        Page not found
      </h1>
      <p className="text-[15px] text-ink-2">
        This page doesn&apos;t exist, or it belongs to a group you&apos;re not
        in.
      </p>
      <Link
        href="/"
        className="flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-[15px] font-semibold text-paper"
      >
        Back to Home
      </Link>
    </main>
  );
}

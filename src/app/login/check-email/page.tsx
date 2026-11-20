import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-5 py-10">
      <Logo />
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">
        Check your email
      </h1>
      <p className="text-[15px] text-ink-2">
        We sent you a sign-in link. It works once and expires in 24 hours.
      </p>
      {process.env.NODE_ENV !== "production" && (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-[14px] text-ink-2">
          Running locally without an email key? The link is printed in the
          terminal running <code className="amount">pnpm dev</code>.
        </p>
      )}
      <Link href="/login" className="py-3 text-[15px] font-medium underline">
        Use a different email
      </Link>
    </main>
  );
}

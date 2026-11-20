import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/server/auth";
import { signInAsDemo, signInWithGoogle } from "./actions";
import { EmailForm } from "./email-form";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used.",
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method.",
  CredentialsSignin: "The demo account isn't set up yet. Run the seed script.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-3">
        <Logo />
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">
          Split it fairly, settle it fast.
        </h1>
        <p className="text-[15px] text-ink-2">
          Sign in to see your groups and balances.
        </p>
      </div>

      <Suspense>
        <ErrorMessage searchParams={searchParams} />
      </Suspense>

      <section
        aria-label="Sign in"
        className="flex flex-col gap-4 rounded-[20px] border border-line bg-card p-5"
      >
        {authOptions.email && <EmailForm />}

        {authOptions.email && (authOptions.google || authOptions.demo) && (
          <div className="flex items-center gap-3 text-[13px] text-ink-3">
            <span className="h-px flex-1 border-t border-dashed border-line-strong" />
            or
            <span className="h-px flex-1 border-t border-dashed border-line-strong" />
          </div>
        )}

        {authOptions.google && (
          <form action={signInWithGoogle}>
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-full"
            >
              Continue with Google
            </Button>
          </form>
        )}

        {authOptions.demo && (
          <form action={signInAsDemo}>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Try the demo account
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-owe/30 bg-card px-4 py-3 text-[14px] text-owe"
    >
      {errorMessages[error] ??
        "Something went wrong signing you in. Try again."}
    </p>
  );
}

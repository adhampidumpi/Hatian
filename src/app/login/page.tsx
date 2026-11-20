import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/server/auth";
import { safeCallbackPath } from "@/lib/validation/invites";
import { getSessionUser } from "@/server/session";
import { signInAsDemo, signInWithGoogle } from "@/features/auth/actions";
import { EmailForm } from "@/features/auth/email-form";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used.",
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method.",
  CredentialsSignin: "The demo is busy right now. Try again in a few minutes.",
  AccessDenied: "Sign-in was cancelled.",
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
        className="flex min-h-[188px] flex-col gap-4 rounded-[20px] border border-line bg-card p-5"
      >
        <Suspense fallback={<OptionsSkeleton />}>
          <SignInOptions searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

/**
 * Rendered per request, not prerendered: which providers are on depends on
 * runtime environment variables, and signed-in visitors are sent home.
 */
async function SignInOptions({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  await connection();
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl) ?? "/";
  if (await getSessionUser()) redirect(callbackUrl);
  const returnTo = (
    <input type="hidden" name="callbackUrl" value={callbackUrl} />
  );

  const { email, google, demo } = authOptions;
  if (!email && !google && !demo) {
    return (
      <p className="text-[15px] text-ink-2">
        Sign-in isn&apos;t configured. Set AUTH_RESEND_KEY or the Google keys.
      </p>
    );
  }

  return (
    <>
      {email && <EmailForm callbackUrl={callbackUrl} />}

      {email && (google || demo) && (
        <div className="flex items-center gap-3 text-[13px] text-ink-3">
          <span className="h-px flex-1 border-t border-dashed border-line-strong" />
          or
          <span className="h-px flex-1 border-t border-dashed border-line-strong" />
        </div>
      )}

      {google && (
        <form action={signInWithGoogle}>
          {returnTo}
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>
      )}

      {demo && (
        <form action={signInAsDemo}>
          {returnTo}
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
    </>
  );
}

function OptionsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <span className="h-4 w-12 animate-pulse rounded bg-line-soft" />
      <span className="h-11 animate-pulse rounded-lg bg-line-soft" />
      <span className="h-[46px] animate-pulse rounded-lg bg-line-soft" />
    </div>
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

"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeCallbackPath } from "@/lib/validation/invites";
import { authOptions, EMAIL_LINK_MAX_AGE, signIn } from "@/server/auth";
import { db } from "@/server/db";

const emailSchema = z.email();

/** At most this many sign-in links per address per window. */
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_MS = 10 * 60 * 1000;

export type EmailFormState = { error?: string } | undefined;

export async function signInWithEmail(
  _: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  if (!authOptions.email) return { error: "Email sign-in is turned off." };

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const email = parsed.data.trim().toLowerCase();

  // Each link is a VerificationToken that expires EMAIL_LINK_MAX_AGE after it
  // was created, so tokens expiring late enough were sent within the window.
  const recent = await db.verificationToken.count({
    where: {
      identifier: email,
      expires: {
        gt: new Date(Date.now() + EMAIL_LINK_MAX_AGE * 1000 - EMAIL_WINDOW_MS),
      },
    },
  });
  if (recent >= EMAIL_LIMIT) {
    return {
      error:
        "We've sent several links to this address. Check your inbox, or try again in 10 minutes.",
    };
  }

  try {
    // Redirects to /login/check-email on success.
    await signIn("resend", { email, redirectTo: callbackFrom(formData) });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "We couldn't send the link. Try again in a moment." };
    }
    throw error; // includes Next's redirect
  }
}

export async function signInWithGoogle(formData: FormData) {
  if (!authOptions.google) redirect("/login");
  await signInOrShowError("google", callbackFrom(formData));
}

export async function signInAsDemo(formData: FormData) {
  if (!authOptions.demo) redirect("/login");
  await signInOrShowError("demo", callbackFrom(formData));
}

/** The page to return to after signing in (e.g. an invite link). */
function callbackFrom(formData: FormData) {
  return safeCallbackPath(formData.get("callbackUrl")) ?? "/";
}

/**
 * Server-action sign-in re-throws Auth.js errors instead of redirecting to
 * the error page, so map them to /login?error=… ourselves.
 */
async function signInOrShowError(provider: string, redirectTo: string) {
  try {
    await signIn(provider, { redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent(error.type)}`);
    }
    throw error; // includes Next's redirect
  }
}

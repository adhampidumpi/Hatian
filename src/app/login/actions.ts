"use server";

import { z } from "zod";
import { signIn } from "@/server/auth";

const emailSchema = z.email();

export async function signInWithEmail(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  // Redirects to /login/check-email on success.
  await signIn("resend", { email: email.data, redirectTo: "/" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signInAsDemo() {
  await signIn("demo", { redirectTo: "/" });
}

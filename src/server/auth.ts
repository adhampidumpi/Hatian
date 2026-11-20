import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { db } from "./db";
import { startDemo } from "./services/demo";

/** How long a magic link stays valid, in seconds (Auth.js default: 24h). */
export const EMAIL_LINK_MAX_AGE = 24 * 60 * 60;

const isDev = process.env.NODE_ENV !== "production";
const hasResend = Boolean(process.env.AUTH_RESEND_KEY);
const hasGoogle = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

/** Which sign-in options the login page should show. */
export const authOptions = {
  email: hasResend || isDev,
  google: hasGoogle,
  demo: process.env.AUTH_DEMO_ENABLED !== "false",
};

const providers: NextAuthConfig["providers"] = [];

if (authOptions.email) {
  providers.push(
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "Hatian <login@example.com>",
      maxAge: EMAIL_LINK_MAX_AGE,
      // Without a Resend key (local dev), print the magic link instead.
      ...(!hasResend && {
        apiKey: "dev",
        sendVerificationRequest: ({ identifier, url }) => {
          console.log(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
        },
      }),
    }),
  );
}

if (authOptions.google) providers.push(Google);

if (authOptions.demo) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo account",
      credentials: {},
      // No password: each visitor gets a private copy of the sample data.
      authorize: () => startDemo(),
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT sessions: required for the credentials (demo) provider, and they keep
  // a session check to a cookie decode instead of a database read.
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

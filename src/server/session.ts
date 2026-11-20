import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * The signed-in user, or null. The single source of truth for "is someone
 * signed in", used by both protected pages and the login page so they can
 * never disagree (and loop).
 *
 * Sessions are JWTs, so the cookie can outlive its user (for example after a
 * database reset). The user is re-read from the database to catch that, which
 * also keeps name and email fresh. Reads the request: call it inside a
 * <Suspense> boundary, never at the top of a layout.
 */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  // Auth.js touches crypto.getRandomValues() before it reads the cookie, which
  // Cache Components rejects during prerendering. Mark the request first.
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true },
  });
});

/** Data access layer entry point: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

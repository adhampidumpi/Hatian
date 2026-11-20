import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * Data access layer entry point: the signed-in user, or a redirect to /login.
 * Reads the request, so with Cache Components call it inside a <Suspense>
 * boundary, never at the top of a layout.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  // Auth.js touches crypto.getRandomValues() before it reads the cookie, which
  // Cache Components rejects during prerendering. Mark the request first.
  await connection();
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login");
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };
});

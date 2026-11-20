import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import pg from "pg";

/**
 * Test users who sign in by cookie: a real Auth.js session token signed
 * with AUTH_SECRET, so the app treats them exactly like a magic-link user.
 * Lets one test use two people (invite and claim) without an inbox.
 */
export type TestUser = { id: string; name: string; email: string };

const SESSION_COOKIE = "authjs.session-token";

function client() {
  return new pg.Client({ connectionString: process.env.DATABASE_URL });
}

export async function createUser(name: string): Promise<TestUser> {
  const id = `e2e_${randomUUID()}`;
  const user = { id, name, email: `${id}@example.test` };
  const db = client();
  await db.connect();
  await db.query(
    `INSERT INTO "User" (id, name, email, "updatedAt") VALUES ($1, $2, $3, now())`,
    [user.id, user.name, user.email],
  );
  await db.end();
  return user;
}

export async function signInAs(context: BrowserContext, user: TestUser) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is needed to sign test users in");
  const token = await encode({
    token: { sub: user.id, name: user.name, email: user.email },
    secret,
    salt: SESSION_COOKIE,
  });
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * The sample account `pnpm db:seed` creates (Maria Santos with the Siargao
 * Trip). Faster than "Try the demo", which builds a fresh copy each time.
 */
export const seededUser: TestUser = {
  id: "you",
  name: "Maria Santos",
  email: "demo@hatian.app",
};

/** Delete everything the given test users created. */
export async function removeUsers(users: TestUser[]) {
  const ids = users.map((u) => u.id);
  const db = client();
  await db.connect();
  const groups = `SELECT id FROM "Group" WHERE "createdById" = ANY($1)`;
  await db.query(
    `DELETE FROM "ExpenseShare" WHERE "expenseId" IN (SELECT id FROM "Expense" WHERE "groupId" IN (${groups}))`,
    [ids],
  );
  await db.query(`DELETE FROM "Expense" WHERE "groupId" IN (${groups})`, [ids]);
  await db.query(`DELETE FROM "Payment" WHERE "groupId" IN (${groups})`, [ids]);
  await db.query(`DELETE FROM "Group" WHERE "createdById" = ANY($1)`, [ids]);
  await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
  await db.end();
}

/** Call a tRPC procedure as the page's signed-in user (for test setup). */
export async function api<T>(
  page: Page,
  path: string,
  input: unknown,
  kind: "mutation" | "query" = "mutation",
): Promise<T> {
  const response =
    kind === "mutation"
      ? await page.request.post(`/api/trpc/${path}`, {
          data: { json: input },
        })
      : await page.request.get(
          `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
        );
  const body = await response.json();
  if (!response.ok()) throw new Error(`${path}: ${JSON.stringify(body)}`);
  return body.result.data.json as T;
}

/**
 * A fixed exchange rate for today (in both the browser's and UTC's
 * calendar), so currency tests never call the real API. Today's rates are
 * rechecked after an hour, so this can't linger in a dev database.
 */
export async function seedTodaysRate(
  base: string,
  quote: string,
  rate: string,
) {
  const local = new Date().toLocaleDateString("en-CA");
  const utc = new Date().toISOString().slice(0, 10);
  const db = client();
  await db.connect();
  for (const date of new Set([local, utc])) {
    await db.query(
      `INSERT INTO "CurrencyRate" (base, quote, date, rate, "fetchedAt")
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (base, quote, date) DO UPDATE SET rate = $4, "fetchedAt" = now()`,
      [base, quote, date, rate],
    );
  }
  await db.end();
}

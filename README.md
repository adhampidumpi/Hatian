# Hatian

Split shared expenses with friends, housemates and trip groups. Four split
modes, balances that always add up, settle-up suggestions with the fewest
payments, and live updates as your friends add expenses.

> Work in progress: phases 1–3 (foundation, core money, real-time and polish)
> are done. Next: the hosted demo and a Lighthouse pass. Planning docs are in
> `docs/`, screen designs in `design/`.

## What it does

- **Groups** with friends added by name. They join later with an invite link
  and pick "I'm Dan" to take over Dan's expenses.
- **Expenses** split equally, by shares, by percent or by exact amounts, with a
  live preview that says who gets the extra centavo. Anyone in the group can
  edit; every change is logged as before → after, and deletes can be undone.
- **Balances and settle up**: who's up and down, suggested payments (simplified
  or one per pair), Remind via the phone's share sheet, and recording full or
  partial payments by Cash, GCash, Maya or bank.
- **Activity** for each group and across groups, with filters.
- **Live**: balances, lists and activity update as soon as someone else saves,
  and "Bea is adding an expense…" shows while a friend has the form open.
- **Other currencies**: pay in dollars on a peso trip; the form shows
  "≈ ₱6,369.50 · 1 USD = ₱63.695" and the expense keeps its original amount.
- **Export CSV** per group, with each person's share, original currency and rate.
- **Dark mode** (light, dark or follow the device), an offline notice, and
  errors that keep the app usable around them.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · tRPC 11 +
TanStack Query · PostgreSQL + Prisma 7 · Auth.js v5 · Tailwind CSS v4 +
shadcn/ui (Radix) + vaul · Vitest + fast-check · Playwright + axe · GitHub
Actions

## Run it locally

Requirements: Node 24+, pnpm (`npm i -g pnpm`).

```bash
pnpm install
cp .env.example .env   # then fill in DATABASE_URL and AUTH_SECRET
pnpm db:deploy
pnpm db:seed
pnpm dev
```

No Postgres? Use a free [Neon](https://neon.tech) database, `docker compose up -d`,
or `pnpm db:local` (real Postgres 17 from npm, no Docker). Open
http://localhost:3000 and choose **Try the demo account**.

## How the money works

All amounts are integers in minor units (centavos). The rules live in
`src/lib/money/` and are covered by unit and property tests:

- **Splitting** (`split.ts`): equal, shares, percent (basis points) or exact
  amounts. Rounding uses the largest-remainder method, so shares always add up
  to the total and nobody pays more than a centavo over their exact share.
  dinero.js `allocate()` was tried first, but a fast-check property test showed
  it gives leftover centavos to the largest *ratio* rather than the largest
  remainder.
- **The server recomputes every split.** The form sends the amount, mode and
  per-person inputs; the server runs the same `allocateShares` the preview uses
  and ignores anything else, so saved shares always add up.
- **Balances** (`balances.ts`): computed on read from expense shares and
  payments, rather than stored in a balances table. Simpler and always
  consistent; worth revisiting only for very large groups.
- **Settle up**: with "Simplify debts" on, a greedy biggest-debtor →
  biggest-creditor match with a stable order (the Siargao sample needs 4
  payments instead of 10). Off, debts are netted per pair only.
- **Other currencies** (`convert.ts`): the split is checked in the currency it
  was paid in, the total is converted at that day's rate with exact integer
  maths (rounded half up), and the shares are re-spread over the converted
  total by largest remainder, so they still add up to the centavo. Rates come
  from [Frankfurter](https://frankfurter.dev) (ECB reference rates) and are
  cached per currency pair and day; an edit keeps the expense's rate unless
  its currency or date changes. Home converts other-currency groups at today's
  rate and marks the total "≈".

## Design decisions

- **Members, not users, hold the money.** Expenses and payments point at group
  members, so a friend can be split with before they sign up; claiming a
  placeholder keeps their history. Members with history are never deleted,
  only marked as removed, and only once their balance is zero.
- **Activity stores snapshots**, not references, so the feed can show what an
  expense looked like at the time and render edits as before → after.
- **Authorisation in one place**: every group-scoped service starts with
  `requireMembership`, which answers "not found" for groups you aren't in, so
  ids of other people's groups don't leak.
- **Invite tokens are 144 random bits** (Prisma's default `cuid()` isn't
  meant to be unguessable).
- **Live updates use Postgres itself**: `pg_notify` runs inside the same
  transaction as the change, so an update is announced only if it commits.
  Each server keeps one `LISTEN` connection and streams events to browsers
  over a tRPC subscription (server-sent events). Events carry ids only; the
  browser refetches through the normal, authorised queries. No extra hosted
  service, at the cost of one direct database connection per server.

## Tests

- `pnpm test`: unit tests for the money maths, split editor state, activity
  wording, CSV and dates (pure code, no database).
- `pnpm test:integration`: the service rules against real Postgres (access,
  splits, removing members with a balance, deleting groups, claiming invites,
  currency conversion and the rate cache, live events reaching only members
  and only after commit).
- `pnpm e2e`: Playwright flows at phone and desktop sizes (create a group and
  split, payments with undo, edit and delete with undo, invite and claim, an
  expense in another currency, two browsers seeing each other live) plus an
  axe accessibility scan of every screen in light and dark mode.

## Scripts

See the Commands table in [`CLAUDE.md`](CLAUDE.md).

# Hatian

Split shared expenses with friends, housemates and trip groups. Four split
modes, balances that always add up, and settle-up suggestions with the fewest
payments.

> Work in progress: phases 1 (foundation) and 2 (core money) are done.
> Real-time updates, multi-currency and dark mode are next. Planning docs are in
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
- **Export CSV** per group, with each person's share.

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

## Tests

- `pnpm test`: unit tests for the money maths, split editor state, activity
  wording, CSV and dates (pure code, no database).
- `pnpm test:integration`: the service rules against real Postgres (access,
  splits, removing members with a balance, deleting groups, claiming invites).
- `pnpm e2e`: Playwright flows at phone and desktop sizes (create a group and
  split, payments with undo, edit and delete with undo, invite and claim) plus
  an axe accessibility scan of every screen.

## Scripts

See the Commands table in [`CLAUDE.md`](CLAUDE.md).

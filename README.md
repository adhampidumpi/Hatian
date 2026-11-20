# Hatian

Split shared expenses with friends, housemates and trip groups. Real-time
balances, four split modes, multi-currency, and settle-up suggestions with the
fewest payments.

> Work in progress: phase 1 (foundation) is done. Planning docs are in `docs/`,
> screen designs in `design/`.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · PostgreSQL +
Prisma 7 · Auth.js v5 · Tailwind CSS v4 + shadcn/ui (Radix) + vaul · Vitest +
fast-check · Playwright · GitHub Actions

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
or `pnpm db:local` (Prisma's local Postgres, no Docker). Open
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
- **Balances** (`balances.ts`): computed on read from expense shares and
  payments, rather than stored in a balances table. Simpler and always
  consistent; worth revisiting only for very large groups.
- **Settle up**: with "Simplify debts" on, a greedy biggest-debtor →
  biggest-creditor match with a stable order (the Siargao sample needs 4
  payments instead of 10). Off, debts are netted per pair only.

## Scripts

See the Commands table in [`CLAUDE.md`](CLAUDE.md).

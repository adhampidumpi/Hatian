# Hatian — expense splitter (portfolio project)

@AGENTS.md

Hatian (Tagalog for "a split") is a full-stack web app for splitting shared expenses
with friends, housemates and trip groups, in the spirit of Splitwise. It is a
**portfolio project** aimed at full-stack developer roles, so code quality, tests,
CI, a live demo and a clear README matter as much as features.

The UI is already designed (see `design/`), and the research and feature plan are
in `docs/`. Read these before starting any feature:

- `docs/product-spec.md`: features (v1 vs later), screens, user flows, sample data
- `docs/design-system.md`: colors, type, spacing, components, responsive UX rules
- `docs/research.md`: how Spliit and SplitPro (open source) solved the same problems
- `docs/data-model.md`: proposed database schema and the money rules
- `design/*.dc.html`: source of each designed screen (see `design/README.md`)

## Ground rules

1. **Don't hand-roll a feature that a proven library or a reference project already
   solves.** Check `docs/research.md` first. Use the libraries listed below; if
   something isn't listed, look at how Spliit or SplitPro did it before writing it.
2. **Money is always integer minor units** (centavos), never floats. Format only at
   the edge. Split with `allocateShares()` in `src/lib/money/split.ts`
   (largest remainder, as in Spliit), so shares always add up exactly to the total.
   Don't swap in dinero.js `allocate()`: it gives leftover units to the largest
   *ratios*, not the largest remainders (a property test caught this). dinero.js is
   still used for currency data.
3. **Match the design.** Recreate the screens in `design/` with the tokens in
   `docs/design-system.md`. No gradients, glassmorphism, emoji icons or
   left-border accent cards. Every amount uses the mono font with tabular figures.
4. **Mobile first, every device.** Bottom tab bar under `lg`, sidebar at `lg`+.
   Pickers and forms open as a bottom-sheet drawer (vaul) on mobile and a dialog on
   desktop. Touch targets ≥ 44px.
5. **Accessible by default:** real buttons, links, labels; colour is never the only
   signal (owed/owe always has a text label); 4.5:1 text contrast.
6. **Every money calculation has unit tests** (split modes, rounding, balances,
   debt simplification). Main flows have Playwright tests.
7. Small, focused commits with clear messages. Keep `README.md` current.

## Stack (decided)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) |
| API | tRPC + TanStack Query |
| DB / ORM | PostgreSQL + Prisma |
| Auth | Auth.js (email magic link + Google) |
| UI | Tailwind CSS + shadcn/ui (Radix), vaul for drawers, lucide-react icons |
| Forms | react-hook-form + zod (shared schemas client/server) |
| Money | dinero.js (amounts, `allocate()` for splits, currency) |
| Exchange rates | Frankfurter API (free, no key), cached in DB |
| Real-time | tRPC subscriptions (SSE) or a hosted service (Supabase Realtime / Pusher). Decide in phase 3 |
| Dates | date-fns |
| Tests | Vitest + Testing Library, Playwright for e2e |
| Tooling | ESLint, Prettier, Docker Compose (Postgres) for local dev, GitHub Actions CI |
| Hosting | Vercel + Neon (or Railway) |

## Build phases

1. **Foundation:** scaffold, Docker Postgres, Prisma schema, Auth.js, design tokens in
   Tailwind, app shell (bottom tabs / sidebar), CI (lint, typecheck, test, build).
2. **Core money:** groups + invite links, add/edit/delete expense with the 4 split
   modes, balances, settle up with the simplify toggle, record payment, activity log.
   Seed script with the Siargao Trip sample data from `docs/product-spec.md`.
3. **Real-time + polish:** live updates and "X is adding an expense…" presence,
   multi-currency, empty/loading/error states, dark mode.
4. **Portfolio finish:** demo account with seeded data, README with architecture
   diagram and trade-offs, deploy, Lighthouse/accessibility pass.
5. **Later:** recurring expenses, stats, receipt scanning (AI), installable PWA, push.

## Commands

Package manager is **pnpm** (`npm i -g pnpm`; Node 26 has no corepack).
`pnpm dlx` fails on this machine; use `npx` for one-off CLIs (e.g. `npx shadcn@latest add …`).

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm build` / `pnpm start` | Production build / serve it |
| `pnpm lint` | ESLint (Next + TypeScript + Prettier compat) |
| `pnpm format` / `pnpm format:check` | Prettier (Markdown and `design/` are ignored) |
| `pnpm typecheck` | `next typegen` then `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (`src/**/*.test.ts`) |
| `pnpm e2e` | Playwright against `pnpm start` on port 3100; build first and seed the DB |
| `pnpm db:local` | Local Postgres without Docker (`prisma dev`, PGlite) |
| `pnpm db:migrate` | Create/apply a migration (`prisma migrate dev`) |
| `pnpm db:deploy` | Apply migrations (CI / production) |
| `pnpm db:seed` | Wipe groups and seed the demo data (dev/demo DBs only) |
| `pnpm db:studio` | Prisma Studio |

Notes:
- Copy `.env.example` to `.env`. Without `AUTH_RESEND_KEY`, magic links print to the dev
  server terminal; "Try the demo account" signs in as `demo@hatian.app`.
- The `prisma dev` database handles one connection well: stop `pnpm dev` before
  `pnpm e2e`, run e2e with `--workers=1`, and restart it (`pnpm prisma dev stop hatian`,
  then `pnpm db:local`) if you see "Connection terminated unexpectedly".
- Prisma is pinned to **7.10.1** (the `latest` tag points at an 8.0 RC with a new
  architecture). The client is generated to `src/generated/prisma` on install.

## Next.js 16 gotchas (Cache Components is on)

- Anything that reads the request (session, `searchParams`, `params`, `usePathname()` on
  dynamic routes) must sit inside `<Suspense>`; layouts must not read the session.
- Get the user with `requireUser()` from `src/server/session.ts` (it calls `connection()`
  before `auth()`; Auth.js uses crypto first, which prerendering rejects).
- Middleware is now `proxy.ts`. We don't use it: pages authorise via `requireUser()`.

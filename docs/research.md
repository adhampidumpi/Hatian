# Research: open-source Splitwise alternatives

Two mature open-source projects were cloned and read. Use them as references
before writing any feature from scratch. Both are MIT licensed.

- **Spliit**: https://github.com/spliit-app/spliit
- **SplitPro**: https://github.com/oss-apps/split-pro

## Comparison

| Area | Spliit | SplitPro | Hatian decision |
|---|---|---|---|
| Framework | Next.js App Router, tRPC, Prisma, shadcn/ui | Next.js Pages Router (T3), NextAuth, tRPC, zustand | App Router (current standard), tRPC, Prisma, shadcn |
| Accounts | None; groups are shared by secret link | Required (NextAuth) | Real accounts **plus** invite links |
| Amount storage | `Int` minor units | `BigInt` minor units | Integer minor units |
| Split modes | EVENLY, BY_SHARES, BY_PERCENTAGE, BY_AMOUNT | EQUAL, PERCENTAGE, EXACT, SHARE, ADJUSTMENT (+ SETTLEMENT, CURRENCY_CONVERSION types) | Equal, Shares, Percent, Exact (Adjustment later) |
| Rounding | Floor each share, give leftover units to the largest remainders (Hamilton), deterministic tie-break seeded by expense id | — | dinero.js `allocate()` (same method) |
| Balances | Computed from expenses on read | Materialized `Balance` / `GroupBalance` tables per pair and currency | Compute on read first; materialize only if needed (note the trade-off in README) |
| Settle-up suggestions | Greedy match of biggest creditor/debtor with a **stable comparator**, so paying one suggestion doesn't reshuffle the rest | Min-cash-flow (`simplifyDebts`), **toggle per group** | Greedy + stable ordering, with SplitPro's per-group toggle |
| Responsive UX | `useMediaQuery`: vaul Drawer on mobile, Dialog on desktop | Bottom nav `< lg`, side nav `lg+`; vaul drawers for pickers | Both patterns |
| Currency | Per-expense original amount + conversion rate | Frankfurter / Open Exchange Rates, cached rates table | Frankfurter, cached rates table |
| Activity log | `Activity` table (create/update/delete expense…) | Notifications + push | Activity table, streamed live |
| Real-time | None | None | **Hatian's differentiator** |
| Extras | Receipt scan (OpenAI vision), stats, recurring, CSV export, i18n | PWA (Serwist), web push, recurring (pg_cron), bank import (Plaid/Nordigen), Splitwise import | Later phases |

## Files worth reading

Spliit
- `src/lib/shares.ts`: largest-remainder apportionment, deterministic tie-break
- `src/lib/balances.ts`: `getBalances`, `getSuggestedReimbursements` (stable greedy)
- `src/lib/balances.test.ts`, `src/lib/totals.test.ts`: test cases to mirror
- `prisma/schema.prisma`: Group / Participant / Expense / ExpensePaidFor / Activity
- `src/components/ui/drawer.tsx` + `currency-selector.tsx`: drawer vs dialog pattern
- `src/app/groups/[groupId]/expenses/create-from-receipt-button-actions.ts`: receipt scan

SplitPro
- `src/lib/simplify.ts`: min-cash-flow debt simplification per currency
- `src/server/api/services/balanceQuery.ts`: applying simplification per group
- `src/server/api/services/currencyRateService.ts`: Frankfurter / OXR with caching
- `src/components/Layout/MainLayout.tsx`: bottom tabs ↔ side nav
- `src/components/AddExpense/SplitTypeSection.tsx`: split-mode UI in drawers

## Lessons to keep

- Every share must be a whole minor unit **before** summing. Spliit's comments
  record a real bug where rounding float totals per person left residue in the group.
- Suggestions must be stable: sort by sign, then by participant id.
- Simplification changes who pays whom, never anyone's net balance. Test that.

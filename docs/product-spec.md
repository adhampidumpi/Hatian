# Product spec

## Who it's for

Barkadas on trips, housemates sharing bills, office lunch groups. Default currency
PHP, with multi-currency support. Payment methods include Cash, GCash, Maya, Bank.

## v1 features

1. **Accounts:** Auth.js (magic link + Google).
2. **Groups:** create, rename, icon, default currency; invite by link; members list.
3. **Expenses:** amount, description, category, date, payer, optional note and
   receipt photo. Split modes:
   - Equally (choose who's included)
   - Shares (e.g. 2 shares for a couple)
   - Percent (must total 100%)
   - Exact amounts (must total the expense)
   Live validation ("₱120.00 left to assign"); Save disabled until valid. When an
   equal split can't divide evenly, say who gets the extra centavo.
4. **Balances:** per-person net in the group; overall across groups on Home.
5. **Settle up:** suggested payments; per-group "Simplify debts" toggle
   (shows e.g. "4 payments instead of 10"); "Remind" for money owed to you;
   "Record" opens the payment sheet.
6. **Record payment:** from → to, amount (supports partial, "Pay in full"),
   method, reference/note. Undoable; visible to the group.
7. **Activity:** create/edit/delete expense, payments, joins; edits shown as
   before → after. Filter: All / Expenses / Payments / Edits.
8. **Real-time:** activity and balances update live for everyone in the group;
   presence line ("Bea is adding an expense…").
9. **Multi-currency:** expense in another currency converts via Frankfurter;
   store original amount + rate.
10. **Export CSV** per group.

## Later

Recurring expenses, stats/charts, receipt scanning with AI, installable PWA +
offline, push notifications, Splitwise import, dark mode (if not done in phase 3).

## Screens (designed — see `design/`)

| Screen | File | Notes |
|---|---|---|
| Home | `Main.dc.html` | Overall balance, owed/owe split, groups list, latest activity |
| Group | `Group.dc.html` | Group balance, Settle up / Balances, tabs, expenses grouped by day with day totals |
| Add expense | `AddExpense.dc.html` | Interactive: split modes, distribution bar, rounding note, validation |
| Balances | `Balances.dc.html` | Diverging bar chart, suggested payments, simplify switch |
| Record payment | `RecordPayment.dc.html` | Bottom sheet; method chips; partial payments |
| Activity | `Activity.dc.html` | Live badge, presence, filters, edit diffs |
| Desktop | `Desktop.dc.html` | Fluid: sidebar + expense table + balances/activity rail |

Live design canvas: https://claude.ai/artifact/AHSZcL5YxyVBQj3QqU6NFp

## Sample data (use for the seed script and tests)

Group **Siargao Trip**, PHP, members: You (MS), Ana, Bea, Carlo, Dan.

| Date | Expense | Paid by | Amount | Split |
|---|---|---|---|---|
| Nov 14 | Surf lessons | Ana | 12,500.00 | Equally, all 5 |
| Nov 14 | Dinner at Kermit | You | 4,860.00 | Equally, all 5 |
| Nov 13 | Island hopping boat | Carlo | 6,000.00 | Equally, all 5 |
| Nov 13 | Habal-habal rides | Dan | 1,250.00 | Equally, all 5 |
| Nov 12 | Villa, 2 nights | You | 18,000.00 | Equally, all 5 |
| Nov 12 | Groceries | Bea | 2,340.00 | Equally, all but Dan |

Total ₱44,950.00. Expected net balances: You +13,753.00, Ana +3,393.00,
Carlo −3,107.00, Bea −6,767.00, Dan −7,272.00.

Simplified payments (4): Dan → You 7,272.00 · Bea → You 6,481.00 ·
Carlo → Ana 3,107.00 · Bea → Ana 286.00.

Unsimplified pairwise (10): Dan→You 4,322 · Bea→You 3,987 · Carlo→You 3,372 ·
Ana→You 2,072 · Dan→Ana 2,250 · Bea→Ana 1,915 · Carlo→Ana 1,300 ·
Dan→Carlo 950 · Bea→Carlo 615 · Bea→Dan 250.

Rounding test: ₱1,000.00 split equally among 3 → 333.34 / 333.33 / 333.33.

Other groups on Home: Condo 4B (you owe 2,450.00), Office lunch club
(you're owed 380.00), Baguio 2025 (settled). Overall: owed 14,133.00,
owe 2,450.00, net +11,683.00.

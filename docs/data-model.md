# Data model (proposal)

A starting point, not final. Adjust while building and record why in the README.

## Money rules

- Store every amount as an integer in minor units (`Int` is fine up to ~₱21M per
  row; use `BigInt` if you want headroom). Store the currency code (ISO 4217) next to it.
- Splits are stored as each participant's final minor-unit amount (`ExpenseShare.amount`),
  plus the inputs that produced them (mode + shares/percent), so edits can be
  re-opened exactly. Shares must always sum to the expense amount (check in a
  service and in tests).
- Foreign-currency expenses store `originalAmount`, `originalCurrency`, `rate`, and
  the converted `amount` in the group currency.
- Balances are derived: net(person) = sum(paid) − sum(shares) ± payments.

## Entities

- **User** (Auth.js tables: User, Account, Session, VerificationToken)
- **Group**: id, name, icon, currency, simplifyDebts (bool), createdById, createdAt
- **GroupMember**: groupId, userId, role (OWNER | MEMBER), joinedAt
- **GroupInvite**: id (token), groupId, createdById, expiresAt, revokedAt
- **Expense**: id, groupId, description, categoryId, date, amount, currency,
  originalAmount?, originalCurrency?, rate?, paidById, splitMode
  (EQUAL | SHARES | PERCENT | EXACT), note?, receiptUrl?, createdById, createdAt,
  updatedAt, deletedAt? (soft delete so activity and undo work)
- **ExpenseShare**: expenseId, userId, weight (shares or basis points), amount
- **Payment**: id, groupId, fromId, toId, amount, currency, method
  (CASH | GCASH | MAYA | BANK | OTHER), reference?, date, createdById, deletedAt?
- **Activity**: id, groupId, actorId, type (EXPENSE_CREATED | EXPENSE_UPDATED |
  EXPENSE_DELETED | PAYMENT_RECORDED | PAYMENT_DELETED | MEMBER_JOINED | GROUP_UPDATED),
  entityId, diff (JSON: before → after), createdAt
- **Category**: id, name, icon
- **CurrencyRate**: base, quote, date, rate (cache for Frankfurter)

## Pure functions to build (with tests)

- `allocateShares(amount, mode, inputs)` → per-member amounts (dinero.js `allocate`)
- `computeBalances(expenses, payments)` → net per member
- `suggestPayments(balances, { simplify })` → list of { from, to, amount }
  - simplify on: greedy biggest-creditor/biggest-debtor with stable ordering
  - simplify off: net pairwise debts
- Property test: total of suggested payments clears every balance to zero, and
  simplification never changes anyone's net.

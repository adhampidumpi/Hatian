/** Minimal shapes so these functions work with Prisma rows or test fixtures. */
export type LedgerExpense = {
  paidById: string;
  amount: number;
  shares: { memberId: string; amount: number }[];
};

export type LedgerPayment = { fromId: string; toId: string; amount: number };

export type Transfer = { from: string; to: string; amount: number };

/** memberId → net minor units. Positive: the group owes them. Negative: they owe. */
export type Balances = Record<string, number>;

/**
 * net(person) = paid − shares + payments made − payments received.
 * Every member listed in `memberIds` appears in the result, even with 0.
 */
export function computeBalances(
  expenses: LedgerExpense[],
  payments: LedgerPayment[],
  memberIds: string[] = [],
): Balances {
  const balances: Balances = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const add = (id: string, delta: number) => {
    balances[id] = (balances[id] ?? 0) + delta;
  };

  for (const expense of expenses) {
    add(expense.paidById, expense.amount);
    for (const share of expense.shares) add(share.memberId, -share.amount);
  }
  for (const payment of payments) {
    add(payment.fromId, payment.amount);
    add(payment.toId, -payment.amount);
  }
  return balances;
}

/**
 * Who owes whom without simplification: each pair's debts are netted against
 * each other, but nobody pays someone they never shared an expense with.
 */
export function computePairwiseDebts(
  expenses: LedgerExpense[],
  payments: LedgerPayment[],
): Transfer[] {
  // owed[a][b] = how much a owes b (before netting the pair)
  const owed = new Map<string, Map<string, number>>();
  const addDebt = (debtor: string, creditor: string, amount: number) => {
    if (debtor === creditor || amount === 0) return;
    const row = owed.get(debtor) ?? new Map<string, number>();
    row.set(creditor, (row.get(creditor) ?? 0) + amount);
    owed.set(debtor, row);
  };

  for (const expense of expenses) {
    for (const share of expense.shares) {
      addDebt(share.memberId, expense.paidById, share.amount);
    }
  }
  // A payment from → to reduces what `from` owes `to`.
  for (const payment of payments) {
    addDebt(payment.toId, payment.fromId, payment.amount);
  }

  const ids = [
    ...new Set([
      ...owed.keys(),
      ...[...owed.values()].flatMap((r) => [...r.keys()]),
    ]),
  ].sort();
  const transfers: Transfer[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const net = (owed.get(a)?.get(b) ?? 0) - (owed.get(b)?.get(a) ?? 0);
      if (net > 0) transfers.push({ from: a, to: b, amount: net });
      if (net < 0) transfers.push({ from: b, to: a, amount: -net });
    }
  }
  return sortTransfers(transfers);
}

/**
 * Fewest-payments suggestions from net balances: repeatedly match the biggest
 * debtor with the biggest creditor. Ties break on member id, so the result is
 * stable: settling one suggestion doesn't reshuffle the others (as in Spliit).
 * Simplification changes who pays whom, never anyone's net balance.
 */
export function simplifyDebts(balances: Balances): Transfer[] {
  const byBiggest = (a: [string, number], b: [string, number]) =>
    b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .sort(byBiggest);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]): [string, number] => [id, -v])
    .sort(byBiggest);

  const transfers: Transfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    const [debtor, owes] = debtors[0]!;
    const [creditor, owed] = creditors[0]!;
    const amount = Math.min(owes, owed);
    transfers.push({ from: debtor, to: creditor, amount });

    debtors[0] = [debtor, owes - amount];
    creditors[0] = [creditor, owed - amount];
    if (debtors[0][1] === 0) debtors.shift();
    if (creditors[0][1] === 0) creditors.shift();
    debtors.sort(byBiggest);
    creditors.sort(byBiggest);
  }
  return transfers;
}

/** Suggested settle-up payments, honouring the group's "Simplify debts" toggle. */
export function suggestPayments(
  expenses: LedgerExpense[],
  payments: LedgerPayment[],
  { simplify }: { simplify: boolean },
): Transfer[] {
  return simplify
    ? simplifyDebts(computeBalances(expenses, payments))
    : computePairwiseDebts(expenses, payments);
}

function sortTransfers(transfers: Transfer[]): Transfer[] {
  return transfers.sort(
    (a, b) =>
      b.amount - a.amount ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  );
}

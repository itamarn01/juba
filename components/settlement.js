// Expense split logic, matching the JUBA web app:
// only the selected participants' expenses are counted, and the total is
// split equally between the selected participants.

export const sumExpenses = (friend) =>
  friend.expenses.reduce((sum, expense) => sum + expense.amount, 0);

export function calculateSplit(friends, selectedIds) {
  const participants = friends.filter((friend) =>
    selectedIds.includes(friend.id)
  );
  const count = participants.length;
  if (count === 0) {
    return { total: 0, perPerson: 0, transfers: [] };
  }

  // Balances are kept in integer units of (cents × participant count), so the
  // equal share is exact and no floating point drift can create 0.00 transfers.
  const spentCents = participants.map((friend) =>
    Math.round(sumExpenses(friend) * 100)
  );
  const totalCents = spentCents.reduce((sum, cents) => sum + cents, 0);
  const balances = participants.map((friend, index) => ({
    name: friend.name,
    units: spentCents[index] * count - totalCents,
  }));

  const creditors = balances
    .filter((b) => b.units > 0)
    .sort((a, b) => b.units - a.units);
  const debtors = balances
    .filter((b) => b.units < 0)
    .sort((a, b) => a.units - b.units);

  const transfers = [];
  for (const debtor of debtors) {
    let owed = -debtor.units;
    for (const creditor of creditors) {
      if (owed === 0) break;
      if (creditor.units === 0) continue;
      const payment = Math.min(owed, creditor.units);
      owed -= payment;
      creditor.units -= payment;
      const amount = Math.round(payment / count) / 100;
      if (amount > 0) {
        transfers.push({ from: debtor.name, to: creditor.name, amount });
      }
    }
  }

  return {
    total: totalCents / 100,
    perPerson: totalCents / count / 100,
    transfers,
  };
}

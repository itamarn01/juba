// Expense split logic, matching the JUBA web app:
// only the selected participants' expenses are counted, and the total is
// split between the selected participants according to their shares
// (1 share each by default, e.g. 2 for a couple or 0.5 for half the trip).
// An expense can also be shared by specific friends only (its splitWith ids);
// it is then split equally between those of them who are selected.

export const sumExpenses = (friend) =>
  friend.expenses.reduce((sum, expense) => sum + expense.amount, 0);

export const getShares = (friend) => (friend.shares > 0 ? friend.shares : 1);

// The friend ids sharing an expense, or null when everyone shares it.
export const getSplitWith = (expense) =>
  Array.isArray(expense.splitWith) && expense.splitWith.length > 0
    ? expense.splitWith
    : null;

// Splits whole cents by integer weights. The leftover cents go to the largest
// remainders, so the parts always add up to exactly the amount.
function splitCents(cents, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const parts = weights.map((weight) =>
    Math.floor((cents * weight) / totalWeight)
  );
  let leftover = cents - parts.reduce((sum, part) => sum + part, 0);
  const byRemainder = weights
    .map((weight, index) => index)
    .sort(
      (a, b) =>
        ((cents * weights[b]) % totalWeight) -
        ((cents * weights[a]) % totalWeight)
    );
  for (let i = 0; leftover > 0; i++, leftover--) {
    parts[byRemainder[i % byRemainder.length]] += 1;
  }
  return parts;
}

export function calculateSplit(friends, selectedIds) {
  const participants = friends.filter((friend) =>
    selectedIds.includes(friend.id)
  );
  if (participants.length === 0) {
    return {
      total: 0,
      totalShares: 0,
      perShare: 0,
      parts: {},
      transfers: [],
      customSplits: false,
    };
  }

  // Shares come in steps of 0.5, so doubling them gives integer weights.
  const weights = participants.map((friend) =>
    Math.max(1, Math.round(getShares(friend) * 2))
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const indexById = new Map(
    participants.map((friend, index) => [friend.id, index])
  );

  // Everything is kept in whole cents, so no floating point drift can create
  // 0.00 transfers.
  const paidCents = participants.map(() => 0);
  const owedCents = participants.map(() => 0);
  let sharedCents = 0;
  let customSplits = false;
  participants.forEach((friend, payerIndex) => {
    friend.expenses.forEach((expense) => {
      const cents = Math.round(expense.amount * 100);
      const splitWith = getSplitWith(expense);
      if (!splitWith) {
        paidCents[payerIndex] += cents;
        sharedCents += cents;
        return;
      }
      const group = [...new Set(splitWith)]
        .map((id) => indexById.get(id))
        .filter((index) => index !== undefined);
      // Nobody who shares this expense is participating, so it is left out.
      if (group.length === 0) return;
      customSplits = true;
      paidCents[payerIndex] += cents;
      splitCents(
        cents,
        group.map(() => 1)
      ).forEach((part, i) => {
        owedCents[group[i]] += part;
      });
    });
  });
  splitCents(sharedCents, weights).forEach((part, index) => {
    owedCents[index] += part;
  });

  const balances = participants.map((friend, index) => ({
    name: friend.name,
    cents: paidCents[index] - owedCents[index],
  }));
  const creditors = balances
    .filter((b) => b.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const debtors = balances
    .filter((b) => b.cents < 0)
    .sort((a, b) => a.cents - b.cents);

  const transfers = [];
  for (const debtor of debtors) {
    let owed = -debtor.cents;
    for (const creditor of creditors) {
      if (owed === 0) break;
      if (creditor.cents === 0) continue;
      const payment = Math.min(owed, creditor.cents);
      owed -= payment;
      creditor.cents -= payment;
      transfers.push({
        from: debtor.name,
        to: creditor.name,
        amount: payment / 100,
      });
    }
  }

  const parts = {};
  participants.forEach((friend, index) => {
    parts[friend.id] = owedCents[index] / 100;
  });

  return {
    total: paidCents.reduce((sum, cents) => sum + cents, 0) / 100,
    totalShares: totalWeight / 2,
    perShare: (sharedCents * 2) / totalWeight / 100,
    parts,
    transfers,
    customSplits,
  };
}

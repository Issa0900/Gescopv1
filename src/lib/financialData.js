import { isIncome, isExpense, txAmount } from "@/lib/transactionClassifier";
import { monthlyAggComplete } from "@/lib/periods";

export function prepareTransactions(transactions) {
  const rows = transactions || [];
  return {
    incomes: rows.filter(isIncome).map((row) => ({ ...row, _amount: txAmount(row, "income") })),
    expenses: rows.filter(isExpense).map((row) => ({ ...row, _amount: txAmount(row, "expense") })),
  };
}

export function financialSummary(transactions) {
  const { incomes, expenses } = prepareTransactions(transactions);
  const revenue = incomes.reduce((sum, row) => sum + row._amount, 0);
  const expense = expenses.reduce((sum, row) => sum + row._amount, 0);
  const netIncome = revenue - expense;
  return {
    incomes,
    expenses,
    revenue,
    expense,
    netIncome,
    marginPct: revenue > 0 ? (netIncome / revenue) * 100 : 0,
  };
}

export function financialMonthlySeries(transactions) {
  const { incomes, expenses } = prepareTransactions(transactions);
  const revenue = monthlyAggComplete(incomes, "date", "_amount");
  const expense = monthlyAggComplete(expenses, "date", "_amount");
  const months = [...new Set([
    ...revenue.map((point) => point.month),
    ...expense.map((point) => point.month),
  ])].sort();
  return months.map((month) => {
    const incomeValue = revenue.find((point) => point.month === month)?.val || 0;
    const expenseValue = expense.find((point) => point.month === month)?.val || 0;
    return {
      month,
      income: incomeValue,
      expense: expenseValue,
      margin: incomeValue - expenseValue,
    };
  });
}

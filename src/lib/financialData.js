import { isIncome, isExpense, txAmount } from "@/lib/transactionClassifier";
import { monthlyAggComplete } from "@/lib/periods";

export function prepareTransactions(transactions) {
  const rows = transactions || [];
  return {
    incomes: rows.filter(isIncome).map((row) => ({ ...row, _amount: txAmount(row, "income") })),
    expenses: rows.filter(isExpense).map((row) => ({ ...row, _amount: txAmount(row, "expense") })),
  };
}

export function financialSummary(transactions = [], expenseEntityRows = [], orderRows = []) {
  const { incomes: txnIncomes, expenses: txnExpenses } = prepareTransactions(transactions);

  const orderIncomes = (orderRows || []).filter(Boolean).map((o) => ({
    ...o,
    _amount: Number(o?.total_revenue) || Number(o?.total) || (Number(o?.quantity) * Number(o?.unit_price)) || 0,
  })).filter((o) => o._amount > 0);

  const orderExpenses = (txnExpenses.length === 0)
    ? (orderRows || []).filter(Boolean).map((o) => ({
        ...o,
        _amount: Number(o?.total_cost) || Number(o?.cost) || (Number(o?.quantity) * Number(o?.unit_cost)) || 0,
      })).filter((o) => o._amount > 0)
    : [];

  const incomes = [...txnIncomes, ...orderIncomes];
  const expenses = [
    ...txnExpenses,
    ...(expenseEntityRows || []).filter(Boolean).map((e) => ({ ...e, _amount: Number(e?.amount) || 0 })),
    ...orderExpenses,
  ];

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

/**
 * @param {Array} [transactions]
 * @param {Array} [expenseEntityRows] - rows from the dedicated Expense entity
 * @param {Array} [orderRows] - rows from the dedicated Order entity (sales/retail)
 * @param {Array} [executiveSummaryRows] - rows from ExecutiveSummary (aggregated monthly P&L)
 */
export function financialMonthlySeries(transactions = [], expenseEntityRows = [], orderRows = [], executiveSummaryRows = []) {
  const { incomes: txnIncomes, expenses: txnExpenses } = prepareTransactions(transactions);

  const orderIncomes = (orderRows || []).filter(Boolean).map((o) => ({
    ...o,
    _amount: Number(o?.total_revenue) || Number(o?.total) || (Number(o?.quantity) * Number(o?.unit_price)) || 0,
  })).filter((o) => o._amount > 0);

  // If no bank transactions exist, orders COGS are treated as expenses
  const orderExpenses = (txnExpenses.length === 0)
    ? (orderRows || []).filter(Boolean).map((o) => ({
        ...o,
        _amount: Number(o?.total_cost) || Number(o?.cost) || (Number(o?.quantity) * Number(o?.unit_cost)) || 0,
      })).filter((o) => o._amount > 0)
    : [];

  let incomes = [...txnIncomes, ...orderIncomes];
  let expenses = [
    ...txnExpenses,
    ...(expenseEntityRows || []).filter(Boolean).map((e) => ({ ...e, _amount: Number(e?.amount) || 0 })),
    ...orderExpenses,
  ];

  // If no transactions and no orders, fall back to ExecutiveSummary if available
  if (incomes.length === 0 && (executiveSummaryRows || []).length > 0) {
    incomes = (executiveSummaryRows || []).filter(Boolean).map((e) => ({
      ...e,
      _amount: Number(e?.total_revenue) || Number(e?.total) || 0,
    })).filter((e) => e._amount > 0);
    expenses = (executiveSummaryRows || []).filter(Boolean).map((e) => ({
      ...e,
      _amount: Number(e?.total_cost) || Number(e?.cost) || 0,
    })).filter((e) => e._amount > 0);
  }

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

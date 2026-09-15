import { ENTITY_FIELD_MAP, resolveContextualField } from './src/lib/core/entityFieldMap.js';

const txDef = ENTITY_FIELD_MAP.Transaction.amount;
const txGoodExpense = { type: "depense", amount: 100 };
const txBadExpense = { type: "utilitaires", amount: -500 };
const txBadIncome = { type: "marketing", amount: 1200 };

console.log("Good Expense:", resolveContextualField(txDef, txGoodExpense));
console.log("Bad Expense (fallback):", resolveContextualField(txDef, txBadExpense));
console.log("Bad Income (fallback):", resolveContextualField(txDef, txBadIncome));


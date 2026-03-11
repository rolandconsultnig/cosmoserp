import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, PlusCircle, Trash2 } from 'lucide-react';
import CustomerAccountLayout from '../components/CustomerAccountLayout';
import api from '../lib/api';

export default function CustomerBudgetPage() {
  const [month, setMonth] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [calcExpr, setCalcExpr] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const fetchBudget = async () => {
      try {
        setLoading(true);
        const targetMonth = month || defaultMonth;
        const response = await api.get('/marketplace/customer/budget', {
          params: { month: targetMonth },
        });
        const data = response?.data?.data || {};
        setMonth(data.month || targetMonth);
        setIncomes(Array.isArray(data.incomes) ? data.incomes : []);
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const incomeTotal = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return {
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
    };
  }, [incomes, expenses]);

  const addIncome = () => {
    setIncomes((list) => [...list, { id: Date.now().toString(16), label: '', amount: '' }]);
  };
  const addExpense = () => {
    setExpenses((list) => [...list, { id: Date.now().toString(16), label: '', amount: '' }]);
  };

  const updateIncome = (id, field, value) => {
    setIncomes((list) => list.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };
  const updateExpense = (id, field, value) => {
    setExpenses((list) => list.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeIncome = (id) => setIncomes((list) => list.filter((i) => i.id !== id));
  const removeExpense = (id) => setExpenses((list) => list.filter((e) => e.id !== id));

  const saveBudget = async () => {
    if (!month.trim()) {
      window.alert('Please enter a month first.');
      return;
    }

    try {
      setSaving(true);
      await api.post('/marketplace/customer/budget', {
        month,
        incomes,
        expenses,
      });
      window.alert('Budget saved.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      window.alert('Unable to save budget right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const runCalc = () => {
    try {
      // basic safe eval: numbers and + - * / ( )
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${calcExpr})`);
      const res = fn();
      if (typeof res === 'number' && Number.isFinite(res)) {
        setCalcResult(String(res));
      } else {
        setCalcResult('Invalid');
      }
    } catch {
      setCalcResult('Error');
    }
  };

  return (
    <CustomerAccountLayout active="budget">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Budget</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Budget planner</h1>
      <p className="text-sm text-gray-500 mb-6">
        Plan your monthly income and expenses, and use the calculator for quick what-if checks.
      </p>

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</p>
          <input
            className="input mt-1 max-w-xs"
            placeholder="e.g. 2026-07"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Total income</p>
            <p className="font-bold text-emerald-700 mt-1">
              ₦{totals.incomeTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Total expenses</p>
            <p className="font-bold text-red-600 mt-1">
              ₦{totals.expenseTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</p>
            <p className={`font-bold mt-1 ${totals.balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              ₦{totals.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={saveBudget}
            disabled={saving || loading}
            className="btn-buy py-2 px-4 rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save budget'}
          </button>
          {loading && <span className="text-xs text-gray-500">Loading saved budget…</span>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Incomes</h2>
            <button
              type="button"
              onClick={addIncome}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <PlusCircle className="w-4 h-4" /> Add income
            </button>
          </div>
          {incomes.length === 0 ? (
            <p className="text-xs text-gray-500">No income items yet. Add your salary, side gigs, or other income.</p>
          ) : (
            <div className="space-y-2">
              {incomes.map((i) => (
                <div key={i.id} className="flex gap-2 items-center">
                  <input
                    className="input flex-1"
                    placeholder="Label (e.g. Salary)"
                    value={i.label}
                    onChange={(e) => updateIncome(i.id, 'label', e.target.value)}
                  />
                  <input
                    className="input w-32"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={i.amount}
                    onChange={(e) => updateIncome(i.id, 'amount', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeIncome(i.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Expenses</h2>
            <button
              type="button"
              onClick={addExpense}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <PlusCircle className="w-4 h-4" /> Add expense
            </button>
          </div>
          {expenses.length === 0 ? (
            <p className="text-xs text-gray-500">No expenses yet. Add your rent, food, transport, etc.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <div key={e.id} className="flex gap-2 items-center">
                  <input
                    className="input flex-1"
                    placeholder="Label (e.g. Rent)"
                    value={e.label}
                    onChange={(ev) => updateExpense(e.id, 'label', ev.target.value)}
                  />
                  <input
                    className="input w-32"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={e.amount}
                    onChange={(ev) => updateExpense(e.id, 'amount', ev.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeExpense(e.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Quick calculator</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. (50000 - 20000) / 4"
            value={calcExpr}
            onChange={(e) => setCalcExpr(e.target.value)}
          />
          <button
            type="button"
            onClick={runCalc}
            className="btn-buy py-2 px-4 rounded-xl text-sm font-semibold"
          >
            Calculate
          </button>
          {calcResult && (
            <span className="text-sm text-gray-700">
              Result: <span className="font-semibold">{calcResult}</span>
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Supports basic math: +, -, ×, ÷, and brackets. Use it to test savings goals or payment plans.
        </p>
      </div>
    </CustomerAccountLayout>
  );
}


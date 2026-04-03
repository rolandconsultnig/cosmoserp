import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, ArrowDownCircle } from 'lucide-react';
import api from '../lib/api';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

const BANKS = [
  'Access Bank',
  'Fidelity Bank',
  'FirstBank',
  'GTBank',
  'UBA',
  'Union Bank',
  'Wema Bank',
  'Zenith Bank',
];

const NETWORKS = ['MTN', 'Glo', 'Airtel', '9mobile'];
const DISCOS = ['AEDC', 'BEDC', 'EKEDC', 'IBEDC', 'IKEDC', 'JEDC', 'KEDCO', 'PHED'];

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBankTransfer, setShowBankTransfer] = useState(false);
  const [showAirtime, setShowAirtime] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showElectricity, setShowElectricity] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    amount: '',
    source: 'wallet',
  });
  const [airtimeForm, setAirtimeForm] = useState({
    network: '',
    phone: '',
    amount: '',
    source: 'wallet',
  });
  const [dataForm, setDataForm] = useState({
    network: '',
    phone: '',
    amount: '',
    source: 'wallet',
  });
  const [electricityForm, setElectricityForm] = useState({
    disco: '',
    meterNumber: '',
    amount: '',
    source: 'wallet',
  });

  useEffect(() => {
    api.get('/marketplace/customer/wallet')
      .then((r) => setWallet(r.data.data))
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading wallet…</p>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? 'NGN';
  const transactions = wallet?.transactions ?? [];

  const refreshWallet = async () => {
    const { data } = await api.get('/marketplace/customer/wallet');
    setWallet(data.data);
  };

  const runAction = async (type) => {
    if (type === 'airtime') {
      setShowAirtime(true);
      return;
    }
    if (type === 'data') {
      setShowData(true);
      return;
    }
    if (type === 'electricity') {
      setShowElectricity(true);
      return;
    }
    if (type === 'transfer-bank') {
      setShowBankTransfer(true);
      return;
    }
    let endpoint = '';
    let extra = {};

    if (type === 'loan') {
      const amountStr = window.prompt('Enter amount (NGN):');
      const amount = Number(amountStr);
      if (!amount || amount <= 0) return;
      endpoint = '/marketplace/customer/wallet/request-loan';
      extra = { amount };
    } else if (type === 'transfer-cosmos') {
      const amountStr = window.prompt('Enter amount (NGN):');
      const amount = Number(amountStr);
      if (!amount || amount <= 0) return;
      const email = window.prompt('Recipient Mixio email:') || undefined;
      endpoint = '/marketplace/customer/wallet/transfer-cosmos';
      extra = { amount, recipientEmail: email };
    } else {
      return;
    }

    try {
      setActionLoading(true);
      const { data } = await api.post(endpoint, { ...extra });
      if (data?.data) {
        setWallet(data.data);
      } else {
        await refreshWallet();
      }
      if (data?.message) {
        window.alert(data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Operation failed.';
      window.alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <CustomerAccountLayout active="wallet">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">My wallet</h1>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Available balance</p>
            <p className="text-2xl font-bold text-gray-900">{currency} {balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Use your Mixio wallet for quick payments and transfers.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => runAction('loan')}
            disabled={actionLoading}
            className="btn-outline w-full justify-between disabled:opacity-60"
          >
            <span>Request Loan</span>
          </button>
          <button
            type="button"
            onClick={() => runAction('electricity')}
            disabled={actionLoading}
            className="btn-outline w-full justify-between disabled:opacity-60"
          >
            <span>Pay for Electricity</span>
          </button>
          <button
            type="button"
            onClick={() => runAction('airtime')}
            disabled={actionLoading}
            className="btn-outline w-full justify-between disabled:opacity-60"
          >
            <span>Buy Airtime</span>
          </button>
          <button
            type="button"
            onClick={() => runAction('data')}
            disabled={actionLoading}
            className="btn-outline w-full justify-between disabled:opacity-60"
          >
            <span>Buy Data</span>
          </button>
          <button
            type="button"
            onClick={() => runAction('transfer-cosmos')}
            disabled={actionLoading}
            className="btn-outline w-full justify-between disabled:opacity-60"
          >
            <span>Transfer to Mixtio Account</span>
          </button>
          <button
            type="button"
            onClick={() => runAction('transfer-bank')}
            disabled={actionLoading}
            className="btn-outline w-full justify-between disabled:opacity-60"
          >
            <span>Transfer to Other Bank</span>
          </button>
        </div>
      </div>

      {showBankTransfer && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Transfer to Other Bank</h2>
            <button
              type="button"
              onClick={() => setShowBankTransfer(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const amount = Number(bankForm.amount);
              if (!amount || amount <= 0) {
                window.alert('Enter a valid amount.');
                return;
              }
              if (!bankForm.bankName || !bankForm.accountNumber) {
                window.alert('Select a bank and enter recipient account number.');
                return;
              }
              try {
                setActionLoading(true);
                const { data } = await api.post('/marketplace/customer/wallet/transfer-bank', {
                  amount,
                  accountNumber: bankForm.accountNumber.trim(),
                  bankName: bankForm.bankName,
                  source: bankForm.source,
                });
                if (data?.data) {
                  setWallet(data.data);
                } else {
                  await refreshWallet();
                }
                if (data?.message) {
                  window.alert(data.message);
                }
                setShowBankTransfer(false);
                setBankForm({ bankName: '', accountNumber: '', amount: '', source: 'wallet' });
              } catch (err) {
                const msg = err.response?.data?.error || 'Transfer failed.';
                window.alert(msg);
              } finally {
                setActionLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Bank</label>
              <select
                className="select"
                value={bankForm.bankName}
                onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                required
              >
                <option value="">Select bank</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Recipient account number</label>
              <input
                className="input"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Amount (NGN)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={bankForm.amount}
                onChange={(e) => setBankForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Payment source</label>
              <select
                className="select"
                value={bankForm.source}
                onChange={(e) => setBankForm((f) => ({ ...f, source: e.target.value }))}
              >
                <option value="wallet">Wallet balance (NGN)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Transfers are currently simulated and debited from your Mixio wallet balance.
              </p>
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-buy w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing…' : 'Confirm transfer'}
            </button>
          </form>
        </div>
      )}

      {showElectricity && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pay Electricity</h2>
            <button
              type="button"
              onClick={() => setShowElectricity(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const amount = Number(electricityForm.amount);
              if (!amount || amount <= 0) {
                window.alert('Enter a valid amount.');
                return;
              }
              if (!electricityForm.disco || !electricityForm.meterNumber) {
                window.alert('Select DISCO and enter meter number.');
                return;
              }
              try {
                setActionLoading(true);
                const { data } = await api.post('/marketplace/customer/wallet/pay-electricity', {
                  amount,
                  meterNumber: electricityForm.meterNumber.trim(),
                  disco: electricityForm.disco,
                  source: electricityForm.source,
                });
                if (data?.data) {
                  setWallet(data.data);
                } else {
                  await refreshWallet();
                }
                if (data?.message) {
                  window.alert(data.message);
                }
                setShowElectricity(false);
                setElectricityForm({ disco: '', meterNumber: '', amount: '', source: 'wallet' });
              } catch (err) {
                const msg = err.response?.data?.error || 'Electricity payment failed.';
                window.alert(msg);
              } finally {
                setActionLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">DISCO</label>
              <select
                className="select"
                value={electricityForm.disco}
                onChange={(e) => setElectricityForm((f) => ({ ...f, disco: e.target.value }))}
                required
              >
                <option value="">Select distribution company</option>
                {DISCOS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Meter number</label>
              <input
                className="input"
                value={electricityForm.meterNumber}
                onChange={(e) => setElectricityForm((f) => ({ ...f, meterNumber: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Amount (NGN)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={electricityForm.amount}
                onChange={(e) => setElectricityForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Payment source</label>
              <select
                className="select"
                value={electricityForm.source}
                onChange={(e) => setElectricityForm((f) => ({ ...f, source: e.target.value }))}
              >
                <option value="wallet">Wallet balance (NGN)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-buy w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing…' : 'Pay electricity'}
            </button>
          </form>
        </div>
      )}

      {showAirtime && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Buy Airtime</h2>
            <button
              type="button"
              onClick={() => setShowAirtime(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const amount = Number(airtimeForm.amount);
              if (!amount || amount <= 0) {
                window.alert('Enter a valid amount.');
                return;
              }
              if (!airtimeForm.network || !airtimeForm.phone) {
                window.alert('Select network and enter phone number.');
                return;
              }
              try {
                setActionLoading(true);
                const { data } = await api.post('/marketplace/customer/wallet/buy-airtime', {
                  amount,
                  phone: airtimeForm.phone.trim(),
                  network: airtimeForm.network,
                  source: airtimeForm.source,
                });
                if (data?.data) {
                  setWallet(data.data);
                } else {
                  await refreshWallet();
                }
                if (data?.message) {
                  window.alert(data.message);
                }
                setShowAirtime(false);
                setAirtimeForm({ network: '', phone: '', amount: '', source: 'wallet' });
              } catch (err) {
                const msg = err.response?.data?.error || 'Airtime purchase failed.';
                window.alert(msg);
              } finally {
                setActionLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Network operator</label>
              <select
                className="select"
                value={airtimeForm.network}
                onChange={(e) => setAirtimeForm((f) => ({ ...f, network: e.target.value }))}
                required
              >
                <option value="">Select operator</option>
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Phone number</label>
              <input
                className="input"
                value={airtimeForm.phone}
                onChange={(e) => setAirtimeForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Amount (NGN)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={airtimeForm.amount}
                onChange={(e) => setAirtimeForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Payment source</label>
              <select
                className="select"
                value={airtimeForm.source}
                onChange={(e) => setAirtimeForm((f) => ({ ...f, source: e.target.value }))}
              >
                <option value="wallet">Wallet balance (NGN)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-buy w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing…' : 'Buy airtime'}
            </button>
          </form>
        </div>
      )}

      {showData && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Buy Data</h2>
            <button
              type="button"
              onClick={() => setShowData(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const amount = Number(dataForm.amount);
              if (!amount || amount <= 0) {
                window.alert('Enter a valid amount.');
                return;
              }
              if (!dataForm.network || !dataForm.phone) {
                window.alert('Select network and enter phone number.');
                return;
              }
              try {
                setActionLoading(true);
                const { data } = await api.post('/marketplace/customer/wallet/buy-data', {
                  amount,
                  phone: dataForm.phone.trim(),
                  network: dataForm.network,
                  source: dataForm.source,
                });
                if (data?.data) {
                  setWallet(data.data);
                } else {
                  await refreshWallet();
                }
                if (data?.message) {
                  window.alert(data.message);
                }
                setShowData(false);
                setDataForm({ network: '', phone: '', amount: '', source: 'wallet' });
              } catch (err) {
                const msg = err.response?.data?.error || 'Data purchase failed.';
                window.alert(msg);
              } finally {
                setActionLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Network operator</label>
              <select
                className="select"
                value={dataForm.network}
                onChange={(e) => setDataForm((f) => ({ ...f, network: e.target.value }))}
                required
              >
                <option value="">Select operator</option>
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Phone number</label>
              <input
                className="input"
                value={dataForm.phone}
                onChange={(e) => setDataForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Amount (NGN)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={dataForm.amount}
                onChange={(e) => setDataForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Payment source</label>
              <select
                className="select"
                value={dataForm.source}
                onChange={(e) => setDataForm((f) => ({ ...f, source: e.target.value }))}
              >
                <option value="wallet">Wallet balance (NGN)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-buy w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing…' : 'Buy data'}
            </button>
          </form>
        </div>
      )}

      <h2 className="font-semibold text-gray-900 mb-3">Recent activity</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-sm">No transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.type}</p>
                  <p className="text-xs text-gray-500">{t.reference || new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={t.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} {currency}
              </span>
            </div>
          ))}
        </div>
      )}
    </CustomerAccountLayout>
  );
}

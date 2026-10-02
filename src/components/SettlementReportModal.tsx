import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/currency';
import { PaymentMethod } from '../types/finance';
import { X, Download, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

interface SettlementReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementReportModal: React.FC<SettlementReportModalProps> = ({ isOpen, onClose }) => {
  const {
    invoices,
    vendors,
    currentCurrency,
    dailyPayments,
    updatePaymentRecord,
    deletePaymentRecord,
    updateDailyPayment,
    deleteDailyPayment,
  } = useFinance();

  const [fromDate, setFromDate] = useState<string>('2026-08-01');
  const [toDate, setToDate] = useState<string>('2026-10-31');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All Suppliers');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    invoiceId?: string;
    paymentId?: string;
    dailyPaymentId?: string;
    sourceType: 'invoice_partial' | 'invoice_full' | 'daily_payment';
    date: string;
    supplier: string;
    invoiceNumber: string;
    amountPaid: number;
    paymentMethod: PaymentMethod | string;
    reference?: string;
    notes?: string;
  } | null>(null);

  const [editDate, setEditDate] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('bank_transfer');
  const [editRef, setEditRef] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.name));
    invoices.forEach((i) => set.add(i.vendorName));
    return ['All Suppliers', ...Array.from(set).sort()];
  }, [vendors, invoices]);

  // Build allocation line items (every payment event on an invoice)
  const allocationRecords = useMemo(() => {
    const records: {
      id: string;
      invoiceId?: string;
      paymentId?: string;
      dailyPaymentId?: string;
      sourceType: 'invoice_partial' | 'invoice_full' | 'daily_payment';
      date: string;
      supplier: string;
      invoiceNumber: string;
      amountDue: number;
      amountPaid: number;
      totalPaid: number;
      balance: number;
      paymentMethod: PaymentMethod | string;
      reference?: string;
      notes?: string;
    }[] = [];

    // From invoices that have payments or partial payments
    invoices.forEach((inv) => {
      if (inv.partialPayments && inv.partialPayments.length > 0) {
        inv.partialPayments.forEach((p, idx) => {
          const pDate = p.paymentDate.slice(0, 10);
          records.push({
            id: p.id || `alloc_${inv.id}_${idx}`,
            invoiceId: inv.id,
            paymentId: p.id,
            sourceType: 'invoice_partial',
            date: pDate,
            supplier: inv.vendorName,
            invoiceNumber: inv.invoiceNumber,
            amountDue: inv.totalAmount,
            amountPaid: p.amount,
            totalPaid: inv.amountPaid || p.amount,
            balance: inv.remainingBalance !== undefined ? inv.remainingBalance : Math.max(0, inv.totalAmount - (inv.amountPaid || 0)),
            paymentMethod: p.paymentMethod,
            reference: p.reference,
            notes: p.notes,
          });
        });
      } else if (inv.status === 'paid' && inv.paidAt) {
        const pDate = inv.paidAt.slice(0, 10);
        records.push({
          id: `alloc_${inv.id}_full`,
          invoiceId: inv.id,
          sourceType: 'invoice_full',
          date: pDate,
          supplier: inv.vendorName,
          invoiceNumber: inv.invoiceNumber,
          amountDue: inv.totalAmount,
          amountPaid: inv.amountPaid || inv.totalAmount,
          totalPaid: inv.amountPaid || inv.totalAmount,
          balance: 0,
          paymentMethod: (inv.paymentMethod as PaymentMethod) || 'bank_transfer',
          reference: inv.paymentReference,
        });
      }
    });

    // Also include standalone daily payments mapped to supplier
    dailyPayments.forEach((dp) => {
      records.push({
        id: dp.id,
        dailyPaymentId: dp.id,
        sourceType: 'daily_payment',
        date: dp.date,
        supplier: dp.supplier,
        invoiceNumber: dp.reference,
        amountDue: dp.amount,
        amountPaid: dp.amount,
        totalPaid: dp.amount,
        balance: 0,
        paymentMethod: dp.paymentMethod,
        reference: dp.reference,
        notes: dp.notes,
      });
    });

    // Sort descending by date
    records.sort((a, b) => b.date.localeCompare(a.date));
    return records;
  }, [invoices, dailyPayments]);

  const filteredRecords = useMemo(() => {
    return allocationRecords.filter((rec) => {
      if (selectedSupplier !== 'All Suppliers' && rec.supplier !== selectedSupplier) {
        return false;
      }
      if (fromDate && rec.date < fromDate) {
        return false;
      }
      if (toDate && rec.date > toDate) {
        return false;
      }
      return true;
    });
  }, [allocationRecords, selectedSupplier, fromDate, toDate]);

  const totalAmountPaidInPeriod = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.amountPaid, 0);
  }, [filteredRecords]);

  const handleStartEdit = (rec: any) => {
    setEditingRecord(rec);
    setEditDate(rec.date);
    setEditAmount(rec.amountPaid.toString());
    setEditMethod((rec.paymentMethod as PaymentMethod) || 'bank_transfer');
    setEditRef(rec.reference || '');
    setEditNotes(rec.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const parsed = parseFloat(editAmount);
    if (!parsed || parsed <= 0) return;

    if (editingRecord.sourceType === 'daily_payment' && editingRecord.dailyPaymentId) {
      updateDailyPayment(editingRecord.dailyPaymentId, {
        date: editDate,
        amount: parsed,
        paymentMethod: editMethod,
        reference: editRef.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
    } else if (editingRecord.invoiceId) {
      updatePaymentRecord(editingRecord.invoiceId, editingRecord.paymentId || editingRecord.id, {
        amount: parsed,
        paymentDate: editDate,
        paymentMethod: editMethod,
        reference: editRef.trim(),
        notes: editNotes.trim(),
      });
    }

    setEditingRecord(null);
    setSuccessMsg(`Settlement record updated to ${formatCurrency(parsed, currentCurrency)}.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDelete = (rec: any) => {
    const ok = window.confirm(
      `Void/delete settlement payment of ${formatCurrency(rec.amountPaid, currentCurrency)} for ${rec.supplier}? The open balance will be restored.`
    );
    if (!ok) return;

    if (rec.sourceType === 'daily_payment' && rec.dailyPaymentId) {
      deleteDailyPayment(rec.dailyPaymentId);
    } else if (rec.invoiceId) {
      deletePaymentRecord(rec.invoiceId, rec.paymentId || rec.id);
    }

    setSuccessMsg(`Settlement record voided. Open balance restored.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Supplier', 'Invoice #', 'Amount Due', 'Amount Paid', 'Total Paid', 'Balance', 'Method', 'Reference'];
    const rows = filteredRecords.map((r) => [
      r.date,
      `"${r.supplier}"`,
      `"${r.invoiceNumber}"`,
      r.amountDue,
      r.amountPaid,
      r.totalPaid,
      r.balance,
      `"${r.paymentMethod || ''}"`,
      `"${r.reference || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Settlement_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-indigo-900">
                Settlement Report
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Paid: {formatCurrency(totalAmountPaidInPeriod, currentCurrency)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              View, edit, or void payment allocation transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors shadow-2xs"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-800 font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter Row: From | To | Supplier */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 font-mono focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 font-mono focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer font-medium"
            >
              {supplierOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table matching Screenshot 4 with Edit & Delete actions */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">SUPPLIER</th>
                <th className="py-3 px-4">INVOICE #</th>
                <th className="py-3 px-4 text-right">AMOUNT DUE</th>
                <th className="py-3 px-4 text-right">AMOUNT PAID</th>
                <th className="py-3 px-4 text-right">TOTAL PAID</th>
                <th className="py-3 px-4 text-right">BALANCE</th>
                <th className="py-3 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment allocation history found for the selected dates and supplier.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {r.supplier}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-900 whitespace-nowrap">
                      <div>{r.invoiceNumber}</div>
                      {r.reference && r.reference !== r.invoiceNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">Ref: {r.reference}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 text-right whitespace-nowrap">
                      {formatCurrency(r.amountDue, currentCurrency)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold tabular-nums text-emerald-600 text-right whitespace-nowrap">
                      {formatCurrency(r.amountPaid, currentCurrency)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 text-right whitespace-nowrap">
                      {formatCurrency(r.totalPaid, currentCurrency)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 text-right whitespace-nowrap">
                      {formatCurrency(r.balance, currentCurrency)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(r)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-all"
                          title="Edit Settlement Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-all"
                          title="Void / Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Total Allocations: <strong className="text-slate-900">{filteredRecords.length} records</strong> · Total Disbursed: <strong className="text-emerald-700">{formatCurrency(totalAmountPaidInPeriod, currentCurrency)}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Edit Settlement Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Edit Settlement Details
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supplier: <span className="font-semibold text-slate-800">{editingRecord.supplier}</span> · Inv: <span className="font-mono">{editingRecord.invoiceNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {/* Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Date (Backdating allowed)
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setEditDate(new Date().toISOString().slice(0, 10))}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setEditDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 3);
                        setEditDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      -3d
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Amount Paid ({currentCurrency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Channel / Method
                </label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="aba_pay">ABA Bank / ABA PAY Direct</option>
                  <option value="khqr">Bakong KHQR Universal</option>
                  <option value="acleda">ACLEDA ToanChet</option>
                  <option value="wing">Wing Bank</option>
                  <option value="cash">Shop Cash Vault (COD)</option>
                  <option value="swift">SWIFT Wire</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reference / Memo
                </label>
                <input
                  type="text"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  placeholder="e.g. ABA-TXN-0925"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Corrected tranche"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

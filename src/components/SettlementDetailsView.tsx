import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice, PaymentMethod } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import { RecordBulkPaymentModal } from './RecordBulkPaymentModal';
import {
  Download,
  ArrowLeft,
  CheckCircle2,
  Search,
  Filter,
  CreditCard,
  Plus,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Building2,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

interface SettlementDetailsViewProps {
  invoiceId?: string;
  onBack?: () => void;
}

export const SettlementDetailsView: React.FC<SettlementDetailsViewProps> = ({
  invoiceId,
  onBack,
}) => {
  const {
    invoices,
    vendors,
    currentCurrency,
    executePartialPayment,
    addDailyPayment,
    updatePaymentRecord,
    deletePaymentRecord,
  } = useFinance();

  // Filters for left invoice list
  const [supplierFilter, setSupplierFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, unpaid, partial, paid
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected invoice state
  const [selectedInvId, setSelectedInvId] = useState<string>(() => {
    if (invoiceId) {
      const found = invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
      if (found) return found.id;
    }
    // Default to first invoice with open balance, or first invoice
    const openInv = invoices.find(
      (i) => i.type === 'payable' && (i.remainingBalance ?? (i.totalAmount - (i.amountPaid || 0))) > 0
    );
    return openInv?.id || invoices[0]?.id || '';
  });

  // Keep selectedInvId in sync if invoiceId prop changes
  useEffect(() => {
    if (invoiceId) {
      const found = invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
      if (found) {
        setSelectedInvId(found.id);
      }
    }
  }, [invoiceId, invoices]);

  // Payment form state
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bulk Payment Modal
  const [showBulkPayModal, setShowBulkPayModal] = useState<boolean>(false);

  // Distinct supplier list
  const supplierList = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.name));
    invoices.forEach((i) => set.add(i.vendorName));
    return ['All', ...Array.from(set).sort()];
  }, [vendors, invoices]);

  // Filtered invoices for the left list
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((i) => i.type === 'payable')
      .filter((i) => {
        if (supplierFilter !== 'All' && i.vendorName !== supplierFilter) {
          return false;
        }
        const rem = i.remainingBalance !== undefined ? i.remainingBalance : (i.totalAmount - (i.amountPaid || 0));
        const paid = i.amountPaid || 0;

        if (statusFilter === 'unpaid' && (paid > 0 || rem <= 0)) {
          return false;
        }
        if (statusFilter === 'partial' && (paid === 0 || rem <= 0)) {
          return false;
        }
        if (statusFilter === 'paid' && rem > 0) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchInv = i.invoiceNumber.toLowerCase().includes(q);
          const matchSup = i.vendorName.toLowerCase().includes(q);
          if (!matchInv && !matchSup) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Prioritize open invoices, then newest
        const remA = a.remainingBalance !== undefined ? a.remainingBalance : (a.totalAmount - (a.amountPaid || 0));
        const remB = b.remainingBalance !== undefined ? b.remainingBalance : (b.totalAmount - (b.amountPaid || 0));
        if (remA > 0 && remB <= 0) return -1;
        if (remB > 0 && remA <= 0) return 1;
        return b.issueDate.localeCompare(a.issueDate);
      });
  }, [invoices, supplierFilter, statusFilter, searchTerm]);

  // Currently active invoice
  const currentInvoice = useMemo(() => {
    return invoices.find((i) => i.id === selectedInvId) || filteredInvoices[0] || invoices[0];
  }, [invoices, selectedInvId, filteredInvoices]);

  const remaining = currentInvoice
    ? currentInvoice.remainingBalance !== undefined
      ? currentInvoice.remainingBalance
      : currentInvoice.totalAmount - (currentInvoice.amountPaid || 0)
    : 0;

  const totalPaid = currentInvoice ? currentInvoice.amountPaid || 0 : 0;

  // Auto-fill payment amount helpers
  const handleQuickFill = (amount: number) => {
    setPaymentAmount(amount.toFixed(2));
  };

  // Submit payment
  const handleApplyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice) return;
    const parsedAmount = parseFloat(paymentAmount);
    if (!parsedAmount || parsedAmount <= 0) return;

    executePartialPayment(
      currentInvoice.id,
      parsedAmount,
      paymentMethod,
      reference.trim() || `PAY-${currentInvoice.invoiceNumber}-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
      notes.trim() || `Settlement installment for ${currentInvoice.invoiceNumber}`,
      paymentDate
    );

    // Also register into daily payments
    addDailyPayment({
      date: paymentDate,
      supplier: currentInvoice.vendorName,
      amount: parsedAmount,
      paymentMethod,
      reference: reference.trim() || `PAY-${currentInvoice.invoiceNumber}`,
      notes: notes.trim() || `Payment for invoice ${currentInvoice.invoiceNumber}`,
    });

    setPaymentAmount('');
    setReference('');
    setNotes('');
    setSuccessMsg(`Payment of ${formatCurrency(parsedAmount, currentCurrency)} applied successfully.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Payment editing state
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('bank_transfer');
  const [editRef, setEditRef] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const handleStartEdit = (p: any) => {
    setEditingPayment(p);
    setEditAmount(p.amount.toString());
    setEditDate(p.paymentDate ? p.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditMethod((p.paymentMethod as PaymentMethod) || 'bank_transfer');
    setEditRef(p.reference || '');
    setEditNotes(p.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice || !editingPayment) return;
    const parsed = parseFloat(editAmount);
    if (!parsed || parsed <= 0) return;

    updatePaymentRecord(currentInvoice.id, editingPayment.id, {
      amount: parsed,
      paymentDate: editDate,
      paymentMethod: editMethod,
      reference: editRef.trim(),
      notes: editNotes.trim(),
    });

    setEditingPayment(null);
    setSuccessMsg(`Payment details updated to ${formatCurrency(parsed, currentCurrency)}.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDelete = (paymentId: string, amount: number) => {
    if (!currentInvoice) return;
    const ok = window.confirm(`Void this payment record of ${formatCurrency(amount, currentCurrency)}? The invoice balance will be restored.`);
    if (!ok) return;

    deletePaymentRecord(currentInvoice.id, paymentId);
    setSuccessMsg(`Payment voided. Open balance restored.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Status badge styling
  const renderStatusBadge = (inv: Invoice) => {
    const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
    const paid = inv.amountPaid || 0;

    if (inv.status === 'paid' || rem <= 0) {
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800">
          Paid
        </span>
      );
    }
    if (paid > 0) {
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">
          Partially Paid
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-rose-100 text-rose-800">
        Unpaid
      </span>
    );
  };

  // Totals for filtered list
  const listTotals = useMemo(() => {
    let sumDue = 0;
    let sumRemaining = 0;
    filteredInvoices.forEach((i) => {
      sumDue += i.totalAmount;
      const rem = i.remainingBalance !== undefined ? i.remainingBalance : (i.totalAmount - (i.amountPaid || 0));
      sumRemaining += rem;
    });
    return { sumDue, sumRemaining };
  }, [filteredInvoices]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      
      {/* Top Banner: Quick Summary & Bulk Settlement Trigger */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Settlement & Payment Center
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Fast Disbursement
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any invoice to inspect balances, record installment tranches, or execute auto-allocation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            onClick={() => setShowBulkPayModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Bulk Settlement</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Invoices Browser / List (5 Cols on LG) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[750px]">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice # or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
              />
            </div>

            {/* Supplier & Status Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Supplier
                </label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {supplierList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="unpaid">Unpaid Only</option>
                  <option value="partial">Partially Paid</option>
                  <option value="paid">Fully Settled</option>
                </select>
              </div>
            </div>

            {/* List Header & Counts */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>
                Showing <strong className="text-slate-900 font-semibold">{filteredInvoices.length}</strong> invoices
              </span>
              <span>
                Total Due: <strong className="text-red-600 font-mono font-bold">{formatCurrency(listTotals.sumRemaining, currentCurrency)}</strong>
              </span>
            </div>

          </div>

          {/* Scrollable List of Invoices */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No invoices found matching your filter criteria.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = currentInvoice?.id === inv.id;
                const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
                const paid = inv.amountPaid || 0;

                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvId(inv.id);
                      setSuccessMsg(null);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {inv.invoiceNumber}
                        </span>
                        {renderStatusBadge(inv)}
                      </div>
                      <span className="font-mono font-bold text-sm text-red-600 tabular-nums">
                        {formatCurrency(rem, currentCurrency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-slate-700 font-medium">
                        {inv.vendorName}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {inv.issueDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      <span>Total: {formatCurrency(inv.totalAmount, currentCurrency)}</span>
                      <span className="text-emerald-600 font-semibold">Paid: {formatCurrency(paid, currentCurrency)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Settlement Details & Fast Payment Action (7 Cols on LG) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-6 flex flex-col space-y-6">
          
          {!currentInvoice ? (
            <div className="p-12 text-center text-slate-400">
              Please select an invoice from the list on the left to view settlement details.
            </div>
          ) : (
            <>
              {/* Header matching Screenshot 2 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      Settlement Details
                    </h2>
                  </div>
                  <div className="text-base font-bold text-indigo-600 font-mono mt-0.5">
                    {currentInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Supplier: <strong className="text-slate-800">{currentInvoice.vendorName}</strong> · Issue: {currentInvoice.issueDate} · Due: {currentInvoice.dueDate}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {renderStatusBadge(currentInvoice)}
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Download / Print"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Financial Balance Summary matching Screenshot 2 */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">Total Amount:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(currentInvoice.totalAmount, currentCurrency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">Total Paid:</span>
                  <span className="font-mono font-bold text-emerald-600 tabular-nums">
                    {formatCurrency(totalPaid, currentCurrency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-base pt-1 border-t border-slate-200/80">
                  <span className="text-slate-900 font-bold">Balance Due:</span>
                  <span className="font-mono font-bold text-lg text-red-600 tabular-nums">
                    {formatCurrency(remaining, currentCurrency)}
                  </span>
                </div>
              </div>

              {/* Success Notification Alert */}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* SECTION: Add Payment matching Screenshot 2 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Payment
                  </h3>

                  {/* 1-Click Quick Fill Shortcuts */}
                  {remaining > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-slate-400">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickFill(remaining)}
                        className="px-2 py-0.5 font-mono text-[11px] font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                      >
                        100% Full ({formatCurrency(remaining, currentCurrency)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickFill(remaining * 0.5)}
                        className="px-2 py-0.5 font-mono text-[11px] font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        50%
                      </button>
                      {remaining > 10000 && (
                        <button
                          type="button"
                          onClick={() => handleQuickFill(10000)}
                          className="px-2 py-0.5 font-mono text-[11px] font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          $10k
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleApplyPayment} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Payment Date (Backdating allowed)
                        </label>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setPaymentDate(new Date().toISOString().slice(0, 10))}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() - 1);
                              setPaymentDate(d.toISOString().slice(0, 10));
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
                              setPaymentDate(d.toISOString().slice(0, 10));
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                          >
                            -3d
                          </button>
                          {currentInvoice && (
                            <button
                              type="button"
                              onClick={() => setPaymentDate(currentInvoice.issueDate)}
                              className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium font-mono"
                              title={`Use invoice issue date: ${currentInvoice.issueDate}`}
                            >
                              Inv Date
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        placeholder="Amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white cursor-pointer"
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

                    <div>
                      <input
                        type="text"
                        placeholder="Reference (optional)"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-xs transition-colors text-sm"
                  >
                    Apply Payment
                  </button>
                </form>
              </div>

              {/* SECTION: Payment History matching Screenshot 2 */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Payment History
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {(currentInvoice.partialPayments?.length || 0)} transactions
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(!currentInvoice.partialPayments || currentInvoice.partialPayments.length === 0) ? (
                    <div className="p-4 bg-slate-50 rounded-md text-slate-400 text-xs italic text-center">
                      No payments recorded yet for this invoice.
                    </div>
                  ) : (
                    currentInvoice.partialPayments.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-3 bg-slate-50/80 border border-slate-200 rounded-md flex items-center justify-between text-sm hover:bg-slate-100/70 transition-colors group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-800 text-xs font-semibold">
                              {p.paymentDate.slice(0, 10)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono font-medium border border-indigo-100 uppercase">
                              {p.paymentMethod.replace('_', ' ')}
                            </span>
                          </div>
                          {p.reference && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Ref: {p.reference}
                            </div>
                          )}
                          {p.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {p.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="font-mono font-bold text-emerald-600 tabular-nums">
                            +{formatCurrency(p.amount, currentCurrency)}
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"
                              title="Edit payment details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id, p.amount)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"
                              title="Void payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Edit Payment Modal */}
              {editingPayment && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Edit Payment Record
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Invoice: <span className="font-mono font-semibold">{currentInvoice.invoiceNumber}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingPayment(null)}
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
                              onClick={() => setEditDate(currentInvoice.issueDate)}
                              className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium font-mono"
                            >
                              Inv Date
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
                          Payment Amount ({currentCurrency})
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
                          Payment Channel / Rail
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
                          Payment Reference / Check #
                        </label>
                        <input
                          type="text"
                          value={editRef}
                          onChange={(e) => setEditRef(e.target.value)}
                          placeholder="e.g. ABA-TXN-80129"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Notes / Memo
                        </label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="e.g. Corrected installment amount per remittance slip"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditingPayment(null)}
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
            </>
          )}

        </div>

      </div>

      {/* Record Bulk Settlement Modal for selected supplier */}
      {currentInvoice && (
        <RecordBulkPaymentModal
          isOpen={showBulkPayModal}
          onClose={() => setShowBulkPayModal(false)}
          supplierName={supplierFilter !== 'All' ? supplierFilter : currentInvoice.vendorName}
        />
      )}

    </div>
  );
};

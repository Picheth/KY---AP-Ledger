import React, { useState, useMemo } from 'react';
import { todayPhnomPenh, toPhnomPenhDate } from '../utils/datetime';
import { useFinance } from '../context/FinanceContext';
import { PaymentMethod } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import { X, DollarSign, Calendar, CreditCard, CheckCircle2 } from 'lucide-react';

interface RecordBulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
}

export const RecordBulkPaymentModal: React.FC<RecordBulkPaymentModalProps> = ({
  isOpen,
  onClose,
  supplierName,
}) => {
  const { invoices, currentCurrency, executePartialPayment, addDailyPayment } = useFinance();

  const [paymentDate, setPaymentDate] = useState<string>(todayPhnomPenh());
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Get all open/unpaid invoices for this supplier, sorted by issueDate ascending (oldest first, A -> Z)
  const openInvoices = useMemo(() => {
    return invoices
      .filter(
        (i) =>
          i.type === 'payable' &&
          i.vendorName === supplierName &&
          i.status !== 'paid' &&
          (i.remainingBalance === undefined || i.remainingBalance > 0)
      )
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate));
  }, [invoices, supplierName]);

  const parsedTotal = parseFloat(totalPaymentAmount) || 0;

  // Manual per-invoice overrides. null = pure Auto Allocation (A → Z).
  const [customAlloc, setCustomAlloc] = useState<Record<string, number> | null>(null);

  // Compute auto-allocation across open invoices
  const allocation = useMemo(() => {
    let pool = parsedTotal;
    const items: {
      invoiceId: string;
      invoiceNumber: string;
      issueDate: string;
      totalAmount: number;
      currentBalance: number;
      allocatedAmount: number;
      remainingBalanceAfter: number;
    }[] = [];

    for (const inv of openInvoices) {
      const balance = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
      if (balance <= 0) continue;

      const autoAlloc = Math.min(pool, balance);
      pool -= autoAlloc;

      const alloc =
        customAlloc !== null
          ? Math.max(0, Math.min(customAlloc[inv.id] ?? 0, balance))
          : autoAlloc;

      items.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        totalAmount: inv.totalAmount,
        currentBalance: balance,
        allocatedAmount: alloc,
        remainingBalanceAfter: balance - alloc,
      });
    }

    const totalAllocated = items.reduce((s, it) => s + it.allocatedAmount, 0);
    const unallocatedRemaining = Math.max(0, parsedTotal - totalAllocated);

    return {
      items,
      totalAllocated,
      unallocatedRemaining,
    };
  }, [openInvoices, parsedTotal, customAlloc]);

  // Switch from auto to manual on first edit
  const handleEditAllocation = (invoiceId: string, valueStr: string) => {
    const parsed = parseFloat(valueStr);
    setCustomAlloc((prev) => {
      const base: Record<string, number> = prev ?? {};
      if (prev === null) {
        // seed from current auto preview
        for (const it of allocation.items) {
          base[it.invoiceId] = it.allocatedAmount;
        }
      }
      const inv = openInvoices.find((i) => i.id === invoiceId);
      const balance = inv
        ? inv.remainingBalance !== undefined
          ? inv.remainingBalance
          : inv.totalAmount - (inv.amountPaid || 0)
        : 0;
      base[invoiceId] = isNaN(parsed) || parsed <= 0 ? 0 : Math.min(parsed, balance);
      return { ...base };
    });
  };

  const handleResetAutoAllocation = () => {
    setCustomAlloc(null);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedTotal <= 0) return;

    // Apply partial payment to each allocated invoice with backdated paymentDate
    allocation.items.forEach((item) => {
      if (item.allocatedAmount > 0) {
        executePartialPayment(
          item.invoiceId,
          item.allocatedAmount,
          paymentMethod,
          reference || `BULK-${supplierName.replace(/[^a-zA-Z0-9]/g, '')}-${paymentDate.replace(/-/g, '')}`,
          `Bulk payment auto-allocation`,
          paymentDate
        );
      }
    });

    // Also log into daily payments record
    addDailyPayment({
      date: paymentDate,
      supplier: supplierName,
      amount: parsedTotal,
      paymentMethod,
      reference: reference || `BULK-${supplierName.replace(/[^a-zA-Z0-9]/g, '')}-${paymentDate.replace(/-/g, '')}`,
      notes: `Bulk payment allocated across ${allocation.items.filter((i) => i.allocatedAmount > 0).length} invoices`,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 900);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-900">
              Record Bulk Payment
            </h2>
            <div className="text-sm font-semibold text-slate-700 mt-0.5">
              {supplierName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Payment Successfully Saved</h3>
            <p className="text-xs text-slate-500">
              Disbursed {formatCurrency(parsedTotal, currentCurrency)} across {allocation.items.filter((i) => i.allocatedAmount > 0).length} invoices.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSavePayment} className="p-6 space-y-4">
            
            {/* Row 1: Date & Total Payment Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Payment Date (Backdating allowed)
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPaymentDate(todayPhnomPenh())}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setPaymentDate(toPhnomPenhDate(d));
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
                        setPaymentDate(toPhnomPenhDate(d));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      -3d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        setPaymentDate(toPhnomPenhDate(d));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      -1w
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 font-mono focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="Total Payment Amount"
                    value={totalPaymentAmount}
                    onChange={(e) => setTotalPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Payment Method & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="aba_pay">ABA Bank / ABA PAY</option>
                  <option value="khqr">Bakong KHQR</option>
                  <option value="acleda">ACLEDA Bank</option>
                  <option value="wing">Wing Bank</option>
                  <option value="cash">Cash on Hand (COD)</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Summary Badge matching Image 1: Allocated | Remaining */}
            <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-700">Allocated</div>
                <div className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
                  {formatCurrency(allocation.totalAllocated, currentCurrency)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-semibold text-slate-700">Remaining</div>
                <div className="text-sm font-bold font-mono text-amber-600 mt-0.5">
                  {formatCurrency(allocation.unallocatedRemaining, currentCurrency)}
                </div>
              </div>
            </div>

            {/* Auto Allocation (A -> Z) Preview Section */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-slate-900">
                Auto Allocation (A → Z)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {parsedTotal > 0
                  ? `${customAlloc === null ? 'Auto-allocating sequentially' : 'Manually adjusted allocation'} across ${allocation.items.length} open invoices`
                  : 'Enter payment amount to preview allocation'}
              </p>
              {customAlloc !== null && (
                <button
                  type="button"
                  onClick={handleResetAutoAllocation}
                  className="mt-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Reset to Auto (A → Z)
                </button>
              )}

              {parsedTotal > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1">
                  {allocation.items.map((item) => (
                    <div
                      key={item.invoiceId}
                      className={`p-2.5 rounded-md border text-xs flex items-center justify-between ${
                        item.allocatedAmount > 0
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-semibold text-slate-900">
                          {item.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Due: {formatCurrency(item.currentBalance, currentCurrency)}
                        </div>
                      </div>
                      <div className="text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={item.currentBalance}
                          value={item.allocatedAmount}
                          onChange={(e) => handleEditAllocation(item.invoiceId, e.target.value)}
                          className="w-28 px-2 py-1 text-right text-xs font-mono font-bold text-emerald-700 bg-white border border-emerald-200 rounded-md focus:outline-none focus:border-indigo-500"
                        />
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Remaining: {formatCurrency(item.remainingBalanceAfter, currentCurrency)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={parsedTotal <= 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs disabled:opacity-50"
              >
                Save Payment
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

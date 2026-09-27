import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice, PaymentMethod } from '../types/finance';
import { formatCurrency, convertFromUSD } from '../utils/currency';
import {
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Send,
  Building,
  Calendar,
  FileText,
  DollarSign,
  ShieldCheck,
  Printer,
  PieChart,
  Split,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onOpenReminderForInvoice: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onOpenReminderForInvoice,
}) => {
  const {
    currentUser,
    currentCurrency,
    approveInvoice,
    rejectInvoice,
    executePayment,
    executePartialPayment,
    vendors,
  } = useFinance();

  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PaymentMethod>('aba_pay');
  const [showPayOptions, setShowPayOptions] = useState(false);
  
  // Partial payment state
  const [showPartialPay, setShowPartialPay] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState<string>('');
  const [partialNotes, setPartialNotes] = useState('');
  const [partialRef, setPartialRef] = useState('');

  if (!invoice) return null;

  const vendor = vendors.find((v) => v.id === invoice.vendorId);
  const convertedTotal = convertFromUSD(invoice.baseAmountUSD, currentCurrency);

  const amountPaid = invoice.amountPaid || 0;
  const remainingBalance = invoice.remainingBalance !== undefined ? invoice.remainingBalance : Math.max(0, invoice.totalAmount - amountPaid);
  const pctSettled = invoice.totalAmount > 0 ? Math.min(100, Math.round((amountPaid / invoice.totalAmount) * 100)) : 0;

  const handleApprove = () => {
    const success = approveInvoice(invoice.id, approvalNote.trim() || undefined);
    if (success) {
      setApprovalNote('');
      onClose();
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for invoice rejection.');
      return;
    }
    const success = rejectInvoice(invoice.id, rejectReason.trim());
    if (success) {
      setRejectReason('');
      setShowRejectInput(false);
      onClose();
    }
  };

  const handlePayFull = () => {
    executePayment(invoice.id, selectedPayMethod);
    setShowPayOptions(false);
    onClose();
  };

  const handleExecutePartial = () => {
    const numericAmt = parseFloat(partialAmountInput);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }
    if (numericAmt > remainingBalance + 0.001) {
      alert(`Payment amount (${formatCurrency(numericAmt, invoice.currency)}) exceeds open balance of ${formatCurrency(remainingBalance, invoice.currency)}.`);
      return;
    }

    executePartialPayment(
      invoice.id,
      numericAmt,
      selectedPayMethod,
      partialRef.trim() || undefined,
      partialNotes.trim() || undefined
    );
    setShowPartialPay(false);
    onClose();
  };

  const setPresetPercent = (pct: number) => {
    const val = (remainingBalance * pct).toFixed(2);
    setPartialAmountInput(val);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-slate-900">
                {invoice.invoiceNumber}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs uppercase font-semibold text-slate-500">
                {invoice.type === 'payable' ? 'Accounts Payable' : 'Accounts Receivable'}
              </span>
              <span className="text-slate-400">·</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : invoice.status === 'partially_paid'
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    : invoice.status === 'overdue'
                    ? 'bg-rose-100 text-rose-800'
                    : invoice.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {invoice.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              PO Ref: <span className="font-mono">{invoice.poNumber || 'Direct Expense'}</span> · Dept: {invoice.department}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md transition-colors"
              title="Print Remittance"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Vendor & Payment Terms Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-400 font-medium">Beneficiary / Vendor</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">{invoice.vendorName}</div>
              <div className="text-xs text-slate-500 mt-1">{invoice.vendorCategory}</div>
              {vendor && (
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  Tax ID: {vendor.taxId} · Route: {vendor.bankName}
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <div className="text-xs text-slate-400 font-medium">Payment Timeline & Terms</div>
              <div className="text-xs text-slate-700 font-mono mt-0.5">
                Issue Date: {invoice.issueDate}
              </div>
              <div className="text-xs font-mono font-medium text-slate-900 mt-0.5">
                Due Date: <span className={invoice.status === 'overdue' ? 'text-rose-600 font-bold' : ''}>{invoice.dueDate}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Terms: {invoice.paymentTerms}
              </div>
            </div>
          </div>

          {/* Partial Settlement & Financial Balances Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-semibold text-slate-900">Settlement Balance & Progress</h4>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-700">
                {pctSettled}% Settled
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                style={{ width: `${pctSettled}%` }}
                className={`h-full transition-all duration-500 rounded-full ${
                  pctSettled === 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-400 font-medium text-[11px]">Total Invoice Obligation</span>
                <div className="text-sm font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </div>
                {invoice.currency !== currentCurrency && (
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ≈ {formatCurrency(convertedTotal, currentCurrency)}
                  </div>
                )}
              </div>

              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-400 font-medium text-[11px]">Settled to Date</span>
                <div className="text-sm font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
                  {formatCurrency(amountPaid, invoice.currency)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {(invoice.partialPayments?.length || 0)} payment(s) recorded
                </div>
              </div>

              <div className={`p-2.5 rounded border ${remainingBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className="text-slate-500 font-medium text-[11px]">Remaining Outstanding</span>
                <div className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${remainingBalance > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                  {formatCurrency(remainingBalance, invoice.currency)}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 font-medium">
                  {remainingBalance === 0 ? 'Fully Disbursed' : 'Open for settlement'}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Way Match Audit Box */}
          <div className="border border-slate-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-semibold text-slate-900">SOX 404 3-Way Matching Verification</h4>
              </div>
              <span className={`text-xs font-medium ${invoice.threeWayMatched ? 'text-emerald-700' : 'text-amber-700'}`}>
                {invoice.threeWayMatched ? 'Verified & In Sync' : 'Pending Receipt'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="text-slate-500 font-medium">1. Purchase Order</div>
                <div className="font-mono text-slate-900 mt-1">{invoice.poNumber || 'DIRECT-AP'}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Authorized budget</div>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="text-slate-500 font-medium">2. Goods Receipt / SOW</div>
                <div className="font-mono text-slate-900 mt-1">{invoice.threeWayMatched ? 'REC-2026-OK' : 'PENDING'}</div>
                <div className={`text-[11px] mt-0.5 ${invoice.threeWayMatched ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {invoice.threeWayMatched ? 'Quantities confirmed' : 'Awaiting delivery'}
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="text-slate-500 font-medium">3. Price Schedule</div>
                <div className="font-mono text-slate-900 mt-1">Contract Tier 1</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">No rate variances</div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 mb-2">Invoice Line Items</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Tax Rate</th>
                    <th className="py-2 px-3 text-right">Total ({invoice.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="py-2.5 px-3 text-slate-800">{li.description}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">{li.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(li.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        {(li.taxRate * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(li.totalAmount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="bg-slate-50/70 p-3 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Invoice Total ({invoice.currency})</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Partial Payment History Schedule */}
          {invoice.partialPayments && invoice.partialPayments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Settlement Installments & Payment Schedule</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  Total Disbursed: {formatCurrency(amountPaid, invoice.currency)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Rail</th>
                      <th className="py-2 px-3 text-right">Settled Amount</th>
                      <th className="py-2 px-3 text-right">Remaining After</th>
                      <th className="py-2 px-3">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.partialPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-600">{p.paymentDate}</td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-900">{p.reference}</td>
                        <td className="py-2 px-3 uppercase font-mono text-[11px] text-slate-600">{p.paymentMethod}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          +{formatCurrency(p.amount, invoice.currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(p.remainingBalanceAfter, invoice.currency)}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          <div>{p.recordedBy}</div>
                          {p.notes && <div className="text-[10px] text-slate-400 italic">{p.notes}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Interactive Partial Settlement Drawer */}
          {showPartialPay && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-indigo-700" />
                  <span className="font-bold text-indigo-950 text-sm">
                    Settle Partial Payment on this Invoice
                  </span>
                </div>
                <div className="font-mono text-indigo-900">
                  Current Open Balance: <strong className="tabular-nums">{formatCurrency(remainingBalance, invoice.currency)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Settlement Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">
                      Amount to Settle Now ({invoice.currency}) *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPresetPercent(0.25)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-indigo-200 rounded hover:bg-indigo-100"
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetPercent(0.5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-indigo-200 rounded hover:bg-indigo-100"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetPercent(1)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-indigo-200 rounded hover:bg-indigo-100 font-semibold"
                      >
                        Full
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    max={remainingBalance}
                    min="1"
                    value={partialAmountInput}
                    onChange={(e) => setPartialAmountInput(e.target.value)}
                    placeholder={`e.g. ${(remainingBalance * 0.5).toFixed(2)}`}
                    className="w-full px-3 py-1.5 border border-indigo-300 rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                  />
                  {parseFloat(partialAmountInput) > 0 && (
                    <div className="text-[11px] text-indigo-800 mt-1 flex justify-between font-mono">
                      <span>New remaining balance:</span>
                      <strong className="tabular-nums">
                        {formatCurrency(Math.max(0, remainingBalance - (parseFloat(partialAmountInput) || 0)), invoice.currency)}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Treasury Rail */}
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Disbursement Channel</label>
                  <select
                    value={selectedPayMethod}
                    onChange={(e) => setSelectedPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-1.5 border border-indigo-300 rounded-md font-mono bg-white text-xs"
                  >
                    <option value="aba_pay">ABA Bank (ABA PAY Direct USD / KHR)</option>
                    <option value="khqr">Bakong / KHQR Universal QR Transfer</option>
                    <option value="acleda">ACLEDA Bank (ToanChet Interbank)</option>
                    <option value="cash">Shop Vault Cash / COD (USD or KHR)</option>
                    <option value="wing">Wing Bank Merchant Transfer</option>
                    <option value="swift">SWIFT / Telegraphic Transfer (TT)</option>
                  </select>

                  <div className="mt-2">
                    <label className="font-medium text-slate-700 block mb-0.5 text-[11px]">Payment Reference / Memo</label>
                    <input
                      type="text"
                      value={partialRef}
                      onChange={(e) => setPartialRef(e.target.value)}
                      placeholder={`e.g. ${selectedPayMethod.toUpperCase()}-PARTIAL-${Math.floor(1000 + Math.random() * 9000)}`}
                      className="w-full px-2.5 py-1 border border-indigo-200 rounded font-mono text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1 text-[11px]">Installment Notes / Split Reason</label>
                <input
                  type="text"
                  value={partialNotes}
                  onChange={(e) => setPartialNotes(e.target.value)}
                  placeholder="e.g. Milestone 1 tranche; remaining balance scheduled upon QC sign-off"
                  className="w-full px-2.5 py-1 border border-indigo-200 rounded text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
                <span className="text-[11px] text-slate-500">
                  Transaction will be stamped in SOX general ledger audit trail.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPartialPay(false)}
                    className="px-3 py-1 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePartial}
                    className="px-4 py-1.5 font-semibold text-white bg-indigo-700 hover:bg-indigo-600 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Authorize Partial Settlement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Pay Options dropdown if active */}
          {showPayOptions && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <label className="font-semibold text-slate-900 block">Select Disbursement Banking Channel (Full Balance)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'aba_pay' as PaymentMethod, label: 'ABA Bank / PAY' },
                  { id: 'khqr' as PaymentMethod, label: 'Bakong KHQR' },
                  { id: 'acleda' as PaymentMethod, label: 'ACLEDA Bank' },
                  { id: 'cash' as PaymentMethod, label: 'Shop Vault Cash' },
                  { id: 'wing' as PaymentMethod, label: 'Wing Bank' },
                  { id: 'swift' as PaymentMethod, label: 'SWIFT Wire' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPayMethod(m.id)}
                    className={`p-2 border rounded-md font-mono text-center text-xs transition-colors ${
                      selectedPayMethod === m.id
                        ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowPayOptions(false)}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayFull}
                  className="px-3 py-1 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  Authorize Full Settlement ({formatCurrency(remainingBalance, invoice.currency)})
                </button>
              </div>
            </div>
          )}

          {/* Audit History Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 mb-2">Audit Log & Approval Trail</h4>
            <div className="space-y-2 border-l-2 border-slate-200 pl-4 py-1 text-xs">
              {invoice.auditHistory.map((entry) => (
                <div key={entry.id} className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white" />
                  <div className="text-slate-800 font-medium">{entry.action}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {entry.userName} ({entry.role.replace('_', ' ')}) · <span className="font-mono">{entry.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reject Reason input if active */}
          {showRejectInput && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-xs">
              <label className="font-semibold text-rose-900 block">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Quantity discrepancy on line item 2, rate exceeds agreed contract..."
                className="w-full p-2 bg-white border border-rose-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-3 py-1 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenReminderForInvoice(invoice)}
              className="px-3 py-1.5 font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-slate-500" />
              <span>Email Reminder</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Approval Controls */}
            {(invoice.status === 'pending_approval' || invoice.status === 'in_review') &&
              currentUser.role !== 'auditor' &&
              !showRejectInput && (
                <>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="px-3 py-1.5 font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-xs"
                  >
                    Approve Invoice
                  </button>
                </>
              )}

            {/* Payment Trigger if Approved, Partially Paid, or Overdue with remaining balance */}
            {(invoice.status === 'approved' || invoice.status === 'partially_paid' || invoice.status === 'overdue') &&
              remainingBalance > 0 &&
              currentUser.role !== 'auditor' && (
                <>
                  {!showPartialPay && (
                    <button
                      onClick={() => {
                        setShowPartialPay(true);
                        setPartialAmountInput((remainingBalance * 0.5).toFixed(2));
                        setShowPayOptions(false);
                      }}
                      className="px-3 py-1.5 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Settle Partial</span>
                    </button>
                  )}

                  {!showPayOptions && (
                    <button
                      onClick={() => {
                        setShowPayOptions(true);
                        setShowPartialPay(false);
                      }}
                      className="px-4 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Full Balance ({formatCurrency(remainingBalance, invoice.currency)})</span>
                    </button>
                  )}
                </>
              )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

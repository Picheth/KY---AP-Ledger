import React, { useState, useEffect } from 'react';
import { todayPhnomPenh, toPhnomPenhDate } from '../utils/datetime';
import { useFinance } from '../context/FinanceContext';
import { Invoice, InvoiceStatus, CurrencyCode, PaymentTerms } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import { X, Save, Trash2, Calendar, AlertTriangle } from 'lucide-react';

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const { vendors, updateInvoice, deleteInvoice, currentCurrency } = useFinance();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('Net 30');
  const [status, setStatus] = useState<InvoiceStatus>('approved');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setVendorName(invoice.vendorName);
      setVendorCategory(invoice.vendorCategory);
      setPoNumber(invoice.poNumber || '');
      setDepartment(invoice.department);
      setCurrency(invoice.currency);
      setTotalAmount(invoice.totalAmount.toString());
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setPaymentTerms(invoice.paymentTerms);
      setStatus(invoice.status);
      setNotes(invoice.notes || '');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTotal = parseFloat(totalAmount);
    if (!parsedTotal || parsedTotal <= 0) {
      alert('Please enter a valid invoice total amount.');
      return;
    }

    const vendor = vendors.find((v) => v.name === vendorName);

    updateInvoice(
      invoice.id,
      {
        invoiceNumber: invoiceNumber.trim(),
        vendorName: vendorName.trim(),
        vendorId: vendor?.id || invoice.vendorId,
        vendorCategory: vendorCategory.trim() || vendor?.category || invoice.vendorCategory,
        poNumber: poNumber.trim() || undefined,
        department,
        currency,
        subtotal: parsedTotal,
        totalAmount: parsedTotal,
        issueDate,
        dueDate,
        paymentTerms,
        status,
        notes: notes.trim() || undefined,
      },
      `Invoice modified: ${invoiceNumber} (${vendorName}, ${formatCurrency(parsedTotal, currency)})`
    );

    onClose();
  };

  const handleDelete = () => {
    const ok = window.confirm(
      `Are you sure you want to permanently delete invoice ${invoice.invoiceNumber} (${invoice.vendorName})? This action will remove it from all ledger statements and cannot be undone.`
    );
    if (ok) {
      deleteInvoice(invoice.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Edit Invoice Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice #{invoice.invoiceNumber} · Internal ID: <span className="font-mono">{invoice.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Row 1: Invoice # & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Supplier / Beneficiary *
              </label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Row 2: Category & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Product / Spend Category
              </label>
              <input
                type="text"
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                placeholder="e.g. Mobile Phone, Electronics"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Cost Center / Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              >
                <option value="Hardware Engineering">Hardware Engineering</option>
                <option value="Manufacturing & SMT">Manufacturing & SMT</option>
                <option value="Purchasing & Stock Inward">Purchasing & Stock Inward</option>
                <option value="Accessories & Retail">Accessories & Retail</option>
                <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
                <option value="Operations & Manufacturing">Operations & Manufacturing</option>
                <option value="Sales & Channel Distribution">Sales & Channel Distribution</option>
                <option value="Finance & Treasury">Finance & Treasury</option>
              </select>
            </div>
          </div>

          {/* Row 3: Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Total Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  {currency === 'USD' ? '$' : '៛'}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="KHR">KHR - Cambodian Riel (៛)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Dates with backdating support */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Issue Date (Backdating allowed)
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const today = todayPhnomPenh();
                      setIssueDate(today);
                      setDueDate(toPhnomPenhDate(new Date(Date.now() + 30 * 86400000)));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      const s = toPhnomPenhDate(d);
                      setIssueDate(s);
                      setDueDate(toPhnomPenhDate(new Date(d.getTime() + 30 * 86400000)));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      const s = toPhnomPenhDate(d);
                      setIssueDate(s);
                      setDueDate(toPhnomPenhDate(new Date(d.getTime() + 30 * 86400000)));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    -1w
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => {
                  const newIssue = e.target.value;
                  setIssueDate(newIssue);
                  if (newIssue) {
                    setDueDate(toPhnomPenhDate(new Date(new Date(newIssue).getTime() + 30 * 86400000)));
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Row 5: PO Reference & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                PO Reference Number
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-1044"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Invoice Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium"
              >
                <option value="approved">Approved (Ready to Pay)</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="in_review">In Review</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Settled / Fully Paid</option>
                <option value="overdue">Overdue</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Internal Accounting Notes / Line Memo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved by hardware manager; payment terms updated per supplier agreement"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Warning note if already partially paid */}
          {invoice.amountPaid && invoice.amountPaid > 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Payment In Progress:</strong> This invoice already has {formatCurrency(invoice.amountPaid, invoice.currency)} in settled payments. Modifying the total amount will automatically adjust the remaining open balance.
              </div>
            </div>
          ) : null}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-md transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Invoice</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

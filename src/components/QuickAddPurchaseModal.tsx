import React, { useState, useMemo } from 'react';
import { todayPhnomPenh, toPhnomPenhDate } from '../utils/datetime';
import { useFinance } from '../context/FinanceContext';
import { CurrencyCode, Invoice, PaymentMethod } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import {
  X,
  Plus,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface QuickAddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (invoice: Invoice) => void;
  defaultSupplier?: string;
}

export const QuickAddPurchaseModal: React.FC<QuickAddPurchaseModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultSupplier,
}) => {
  const { vendors, addVendor, addInvoice, executePartialPayment, currentCurrency } = useFinance();

  const todayStr = todayPhnomPenh();

  // Supplier selection / new supplier
  const [selectedSupplier, setSelectedSupplier] = useState<string>(() => {
    if (defaultSupplier && defaultSupplier !== 'All Suppliers' && defaultSupplier !== 'All') {
      return defaultSupplier;
    }
    return vendors[0]?.name || '';
  });
  const [isCreatingNewVendor, setIsCreatingNewVendor] = useState<boolean>(false);
  const [newVendorName, setNewVendorName] = useState<string>('');
  const [newVendorCategory, setNewVendorCategory] = useState<string>('Mobile Phone');
  const [newVendorPhone, setNewVendorPhone] = useState<string>('');

  // Invoice / Purchase details
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => `INV-${todayPhnomPenh().slice(2).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toPhnomPenhDate(d);
  });
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Optional direct initial settlement
  const [payNow, setPayNow] = useState<boolean>(false);
  const [payNowAmount, setPayNowAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('aba_pay');
  const [paymentRef, setPaymentRef] = useState<string>('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update due date automatically when purchase date changes (+30 days)
  const handlePurchaseDateChange = (newDate: string) => {
    setPurchaseDate(newDate);
    try {
      const d = new Date(newDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 30);
        setDueDate(toPhnomPenhDate(d));
      }
    } catch {
      // ignore
    }
  };

  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedPayNow = parseFloat(payNowAmount) || 0;
  const calculatedRemaining = Math.max(0, parsedTotal - (payNow ? parsedPayNow : 0));

  if (!isOpen) return null;

  const handleGenerateInvoiceNumber = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const datePart = purchaseDate.replace(/-/g, '').slice(2);
    setInvoiceNumber(`INV-${datePart}-${randomSuffix}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let finalSupplierName = selectedSupplier;
    let finalVendor = vendors.find((v) => v.name.toLowerCase() === selectedSupplier.toLowerCase());

    if (isCreatingNewVendor) {
      if (!newVendorName.trim()) {
        setErrorMsg('Please enter a supplier name.');
        return;
      }
      finalSupplierName = newVendorName.trim();
      const created = addVendor({
        name: finalSupplierName,
        category: newVendorCategory,
        phone: newVendorPhone.trim(),
        taxId: '',
        email: '',
        address: 'Phnom Penh, Cambodia',
        bankName: 'ABA Bank',
        bankRoutingNumber: '',
        bankAccountNumber: '',
        defaultPaymentMethod: 'aba_pay',
        defaultPaymentTerms: 'Net 30',
        rating: 5,
        status: 'active',
        contactPerson: 'Accounts Lead',
      });
      finalVendor = created;
    }

    if (!finalSupplierName) {
      setErrorMsg('Please select or add a supplier.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setErrorMsg('Please provide an invoice or bill number.');
      return;
    }

    if (parsedTotal <= 0) {
      setErrorMsg('Please enter a valid purchase amount.');
      return;
    }

    if (payNow && (parsedPayNow <= 0 || parsedPayNow > parsedTotal)) {
      setErrorMsg(`Immediate payment cannot exceed total amount (${formatCurrency(parsedTotal, currency)}).`);
      return;
    }

    const vendorId = finalVendor?.id || `vnd_${finalSupplierName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const vendorCategory = finalVendor?.category || 'Electronics & Mobile';

    const newInvoice: Invoice = addInvoice({
      invoiceNumber: invoiceNumber.trim(),
      type: 'payable',
      poNumber: `PO-${invoiceNumber.trim()}`,
      vendorId,
      vendorName: finalSupplierName,
      vendorCategory,
      issueDate: purchaseDate,
      dueDate,
      currency,
      subtotal: parsedTotal,
      taxAmount: 0,
      totalAmount: parsedTotal,
      amountPaid: 0,
      remainingBalance: parsedTotal,
      status: 'approved',
      paymentTerms: 'Net 30',
      department: 'Purchasing & Stock Inward',
      assignedApproverRole: parsedTotal > 100000 ? 'cfo' : 'dept_manager',
      threeWayMatched: true,
      notes: description.trim() || undefined,
      lineItems: [
        {
          id: `li_${Date.now()}_1`,
          description: description.trim() || `Direct purchase from ${finalSupplierName}`,
          quantity: 1,
          unitPrice: parsedTotal,
          taxRate: 0,
          totalAmount: parsedTotal,
        },
      ],
    });

    // If immediate partial payment / deposit was requested
    if (payNow && parsedPayNow > 0) {
      executePartialPayment(
        newInvoice.id,
        parsedPayNow,
        paymentMethod,
        paymentRef.trim() || `DEPOSIT-${newInvoice.invoiceNumber}`,
        'Initial deposit upon purchase intake',
        purchaseDate
      );
    }

    if (onCreated) {
      onCreated(newInvoice);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quick Purchase / Bill Entry
              </h3>
              <p className="text-xs text-slate-500">
                Short form · Backdating & multi-tranche settlement supported
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-medium">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Supplier Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Supplier / Beneficiary *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewVendor(!isCreatingNewVendor)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {isCreatingNewVendor ? '← Select Existing' : '+ Add New Supplier'}
              </button>
            </div>

            {!isCreatingNewVendor ? (
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-2.5">
                <input
                  type="text"
                  required
                  placeholder="Supplier / Company Name *"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Category (e.g. Mobile Phones)"
                    value={newVendorCategory}
                    onChange={(e) => setNewVendorCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice # & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Invoice / Bill # *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateInvoiceNumber}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
                  title="Auto generate unique invoice number"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto #</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-10492"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Total Amount *
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-1.5 py-0.5 rounded font-mono font-semibold ${currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('KHR')}
                    className={`px-1.5 py-0.5 rounded font-mono font-semibold ${currency === 'KHR' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    KHR (៛)
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold font-mono text-sm">
                  {currency === 'USD' ? '$' : '៛'}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Date Row with Backdating Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Purchase Date
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handlePurchaseDateChange(todayStr)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      handlePurchaseDateChange(toPhnomPenhDate(d));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    -1d
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      handlePurchaseDateChange(toPhnomPenhDate(d));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    -7d
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => handlePurchaseDateChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Description / Items (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 10x iPhone 16 Pro, Accessories restock"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Optional Immediate Settlement / Deposit Section */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => {
                    setPayNow(e.target.checked);
                    if (e.target.checked && !payNowAmount && parsedTotal > 0) {
                      setPayNowAmount(parsedTotal.toString());
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Record initial payment / deposit now?</span>
              </label>
              {payNow && (
                <span className="text-[11px] font-mono text-indigo-600 font-semibold">
                  Multi-tranche settlement
                </span>
              )}
            </div>

            {payNow && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Payment Tranche Amount ({currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      max={parsedTotal}
                      value={payNowAmount}
                      onChange={(e) => setPayNowAmount(e.target.value)}
                      placeholder="Amount paid"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Channel / Rail
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-800"
                    >
                      <option value="aba_pay">ABA Bank (ABA PAY)</option>
                      <option value="khqr">Bakong / KHQR</option>
                      <option value="cash">Cash / Shop Vault</option>
                      <option value="acleda">ACLEDA Bank</option>
                      <option value="wing">Wing Bank</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500">Remaining Balance after this payment:</span>
                  <span className={`font-bold ${calculatedRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {formatCurrency(calculatedRemaining, currency)}
                    {calculatedRemaining === 0 && ' (Paid-off)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Purchase</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

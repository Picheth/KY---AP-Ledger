import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import { RecordBulkPaymentModal } from './RecordBulkPaymentModal';
import {
  CreditCard,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

interface PurchasesViewProps {
  initialSupplier?: string;
  onOpenSettlementDetails: (invoiceId: string) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  initialSupplier = 'All Suppliers',
  onOpenSettlementDetails,
}) => {
  const { invoices, vendors, currentCurrency, addInvoice } = useFinance();

  const [selectedSupplier, setSelectedSupplier] = useState<string>(initialSupplier);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [showBulkPayModal, setShowBulkPayModal] = useState<boolean>(false);

  // Quick Add Purchase Form
  const [newInvoiceNum, setNewInvoiceNum] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newAmount, setNewAmount] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('S4 LH');
  const [showAddForm, setShowAddForm] = useState<boolean>(true);

  // Distinct suppliers list
  const supplierList = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.name));
    invoices.forEach((i) => set.add(i.vendorName));
    return ['All Suppliers', ...Array.from(set).sort()];
  }, [vendors, invoices]);

  // Purchases for selected supplier (or all suppliers)
  const supplierPurchases = useMemo(() => {
    return invoices
      .filter((i) => i.type === 'payable')
      .filter((i) => selectedSupplier === 'All Suppliers' || i.vendorName === selectedSupplier)
      .filter((i) => {
        if (!showArchived && i.status === 'paid') {
          return true; // Keep paid visible unless filtered
        }
        return true;
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [invoices, selectedSupplier, showArchived]);

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    if (!amount || amount <= 0 || !newInvoiceNum.trim()) return;

    const supplierToUse = selectedSupplier !== 'All Suppliers' ? selectedSupplier : newSupplier;
    const vendor = vendors.find((v) => v.name === supplierToUse);

    addInvoice({
      invoiceNumber: newInvoiceNum.trim(),
      type: 'payable',
      poNumber: `PO-${newInvoiceNum.trim()}`,
      vendorId: vendor?.id || `vnd_${supplierToUse.toLowerCase().replace(/\s+/g, '_')}`,
      vendorName: supplierToUse,
      vendorCategory: vendor?.category || 'Electronics & Mobile',
      issueDate: newDate,
      dueDate: new Date(new Date(newDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      currency: 'USD',
      subtotal: amount,
      taxAmount: 0,
      totalAmount: amount,
      amountPaid: 0,
      remainingBalance: amount,
      status: 'approved',
      paymentTerms: 'Net 30',
      department: 'Purchasing & Stock Inward',
      assignedApproverRole: amount > 100000 ? 'cfo' : 'dept_manager',
      threeWayMatched: true,
      lineItems: [
        {
          id: `li_new_1`,
          description: `Device purchase order ${newInvoiceNum}`,
          quantity: 1,
          unitPrice: amount,
          taxRate: 0,
          totalAmount: amount,
        },
      ],
    });

    setNewInvoiceNum('');
    setNewAmount('');
  };

  const handleExportExcel = () => {
    const headers = ['Invoice #', 'Date', 'Supplier', 'Amount', 'Paid', 'Balance', 'Status'];
    const rows = supplierPurchases.map((p) => {
      const rem = p.remainingBalance !== undefined ? p.remainingBalance : (p.totalAmount - (p.amountPaid || 0));
      return [
        p.invoiceNumber,
        p.issueDate,
        `"${p.vendorName}"`,
        p.totalAmount.toFixed(2),
        (p.amountPaid || 0).toFixed(2),
        rem.toFixed(2),
        p.status,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Purchases_${selectedSupplier.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      
      {/* Supplier Pill Bar & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        
        {/* Supplier Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Supplier:</span>
          <div className="relative">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-1.5 text-sm font-bold text-indigo-900 bg-indigo-50/70 border border-indigo-200 rounded-md focus:outline-none pr-8 cursor-pointer shadow-2xs"
            >
              {supplierList.map((sup) => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-indigo-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Action icons & Export */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          
          <button
            onClick={() => setShowBulkPayModal(true)}
            className="p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
            title="Record Bulk Payment for this supplier"
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Pay</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            title="Toggle Add Purchase"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export to Excel</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-600">
            <span>Show Archived</span>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                showArchived ? 'bg-slate-900' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  showArchived ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        
        {/* Title matching Image 3 */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Purchases
          </h2>
          {selectedSupplier !== 'All Suppliers' && (
            <div className="text-sm font-semibold text-indigo-700 mt-0.5">
              {selectedSupplier}
            </div>
          )}
        </div>

        {/* Quick Add Purchase Box matching Image 3 */}
        {showAddForm && (
          <form onSubmit={handleAddPurchase} className="space-y-3 p-4 bg-slate-50/60 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Invoice #"
                value={newInvoiceNum}
                onChange={(e) => setNewInvoiceNum(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
              />
              {selectedSupplier === 'All Suppliers' && (
                <select
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                >
                  {supplierList.filter((s) => s !== 'All Suppliers').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Purchase Date (Backdating allowed)
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setNewDate(new Date().toISOString().slice(0, 10))}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setNewDate(d.toISOString().slice(0, 10));
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
                        setNewDate(d.toISOString().slice(0, 10));
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
                        setNewDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      -1w
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        setNewDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      -1m
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[11px] font-bold text-slate-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="Amount"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-xs transition-colors text-sm"
            >
              Add Purchase
            </button>
          </form>
        )}

        {/* Purchase Cards List matching Image 3 */}
        <div className="space-y-3">
          {supplierPurchases.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No purchases recorded for {selectedSupplier}.
            </div>
          ) : (
            supplierPurchases.map((p) => {
              const rem = p.remainingBalance !== undefined ? p.remainingBalance : (p.totalAmount - (p.amountPaid || 0));
              const paid = p.amountPaid || 0;

              return (
                <div
                  key={p.id}
                  onClick={() => onOpenSettlementDetails(p.id)}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer space-y-4"
                >
                  {/* Card Header: Invoice # | Date | Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 font-mono">
                          {p.invoiceNumber}
                        </h3>
                        {selectedSupplier === 'All Suppliers' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {p.vendorName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {p.issueDate}
                      </div>
                    </div>

                    <div>
                      {rem <= 0 ? (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          Paid
                        </span>
                      ) : paid > 0 ? (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                          Partially Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">
                          Unpaid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3 Metrics: Amount | Paid | Balance */}
                  <div className="grid grid-cols-3 gap-4 text-center sm:text-left pt-2 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Amount</div>
                      <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                        {formatCurrency(p.totalAmount, currentCurrency)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-medium">Paid</div>
                      <div className="text-sm font-bold font-mono text-emerald-600 mt-0.5 tabular-nums">
                        {formatCurrency(paid, currentCurrency)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-medium">Balance</div>
                      <div className="text-sm font-bold font-mono text-red-600 mt-0.5 tabular-nums">
                        {formatCurrency(rem, currentCurrency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Record Bulk Payment Modal */}
      <RecordBulkPaymentModal
        isOpen={showBulkPayModal}
        onClose={() => setShowBulkPayModal(false)}
        supplierName={selectedSupplier}
      />

    </div>
  );
};

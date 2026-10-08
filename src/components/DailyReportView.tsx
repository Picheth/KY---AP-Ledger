import React, { useState, useMemo } from 'react';
import { todayPhnomPenh } from '../utils/datetime';
import { useFinance } from '../context/FinanceContext';
import { DailyReportRow, PaymentMethod } from '../types/finance';
import { formatCurrency, convertToUSD, convertFromUSD } from '../utils/currency';
import {
  Calendar,
  Download,
  Filter,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  Receipt,
  CreditCard,
  Building2,
} from 'lucide-react';

interface DailyReportViewProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({ onClose, isModal = false }) => {
  const { invoices, vendors, currentCurrency, dailyPayments, addDailyPayment } = useFinance();

  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // New Payment Quick Dialog
  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [paymentDate, setPaymentDate] = useState<string>(todayPhnomPenh());
  const [paymentSupplier, setPaymentSupplier] = useState<string>('S4 LH');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('aba_pay');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Extract distinct supplier names from invoices, vendors, and payments
  const supplierList = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.name));
    invoices.forEach((i) => set.add(i.vendorName));
    dailyPayments.forEach((p) => set.add(p.supplier));
    return Array.from(set).sort();
  }, [vendors, invoices, dailyPayments]);

  // Aggregate Daily Report Rows by (Date + Supplier)
  const allDailyRows = useMemo(() => {
    const map = new Map<string, {
      id: string;
      date: string;
      supplier: string;
      totalPurchase: number;
      totalPayment: number;
      invoices: typeof invoices;
      payments: { amount: number; reference: string; notes?: string }[];
    }>();

    // 1. Invoices -> Purchases on issueDate
    invoices.forEach((inv) => {
      if (inv.type !== 'payable') return;
      const key = `${inv.issueDate}___${inv.vendorName}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          date: inv.issueDate,
          supplier: inv.vendorName,
          totalPurchase: 0,
          totalPayment: 0,
          invoices: [],
          payments: [],
        });
      }
      const entry = map.get(key)!;
      entry.totalPurchase += convertFromUSD(convertToUSD(inv.totalAmount, inv.currency), currentCurrency);
      entry.invoices.push(inv);

      // Also if invoice had partial or full payments recorded on specific dates
      if (inv.partialPayments && inv.partialPayments.length > 0) {
        inv.partialPayments.forEach((p) => {
          const payDate = p.paymentDate.slice(0, 10);
          const payKey = `${payDate}___${inv.vendorName}`;
          if (!map.has(payKey)) {
            map.set(payKey, {
              id: payKey,
              date: payDate,
              supplier: inv.vendorName,
              totalPurchase: 0,
              totalPayment: 0,
              invoices: [],
              payments: [],
            });
          }
          const payEntry = map.get(payKey)!;
          payEntry.totalPayment += convertFromUSD(convertToUSD(p.amount, inv.currency), currentCurrency);
          payEntry.payments.push({
            amount: p.amount,
            reference: p.reference,
            notes: p.notes,
          });
        });
      }
    });

    // 2. Standalone Daily Payments -> Payments on payment date
    dailyPayments.forEach((p) => {
      const key = `${p.date}___${p.supplier}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          date: p.date,
          supplier: p.supplier,
          totalPurchase: 0,
          totalPayment: 0,
          invoices: [],
          payments: [],
        });
      }
      const entry = map.get(key)!;
      entry.totalPayment += p.amount;
      entry.payments.push({
        amount: p.amount,
        reference: p.reference,
        notes: p.notes,
      });
    });

    // Convert map to array and sort by Date descending, then Supplier name
    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      invoicesCount: r.invoices.length,
      paymentsCount: r.payments.length,
    }));

    rows.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return a.supplier.localeCompare(b.supplier);
    });

    return rows;
  }, [invoices, dailyPayments, currentCurrency]);

  // Filtered rows based on selected supplier and date range
  const filteredRows = useMemo(() => {
    return allDailyRows.filter((row) => {
      if (selectedSupplier !== 'All' && row.supplier !== selectedSupplier) {
        return false;
      }
      if (startDate && row.date < startDate) {
        return false;
      }
      if (endDate && row.date > endDate) {
        return false;
      }
      return true;
    });
  }, [allDailyRows, selectedSupplier, startDate, endDate]);

  // Balance calculation
  // Computes outstanding balance for the selected supplier (or all suppliers)
  const currentBalance = useMemo(() => {
    let eligibleInvoices = invoices.filter((i) => i.type === 'payable');
    if (selectedSupplier !== 'All') {
      eligibleInvoices = eligibleInvoices.filter((i) => i.vendorName === selectedSupplier);
    }
    // Sum of remaining balance across eligible invoices
    const sumRemaining = eligibleInvoices.reduce((sum, inv) => {
      const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
      return sum + rem;
    }, 0);

    return sumRemaining;
  }, [invoices, selectedSupplier]);

  // Row selection handlers
  const isAllSelected = filteredRows.length > 0 && selectedRowIds.length === filteredRows.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredRows.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  // Totals of visible rows
  const summaryTotals = useMemo(() => {
    let purchases = 0;
    let payments = 0;
    filteredRows.forEach((r) => {
      purchases += r.totalPurchase;
      payments += r.totalPayment;
    });
    return {
      purchases,
      payments,
      net: purchases - payments,
    };
  }, [filteredRows]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Supplier', 'Total Purchase', 'Total Payment'];
    const rowsToExport = filteredRows.map((r) => [
      r.date,
      `"${r.supplier}"`,
      r.totalPurchase.toFixed(2),
      r.totalPayment.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rowsToExport.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_Report_${selectedSupplier.replace(/\s+/g, '_')}_${todayPhnomPenh()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit new daily payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(paymentAmount);
    if (!parsedAmount || parsedAmount <= 0) return;

    addDailyPayment({
      date: paymentDate,
      supplier: paymentSupplier,
      amount: parsedAmount,
      paymentMethod,
      reference: paymentRef.trim() || `PAY-${paymentSupplier.replace(/[^a-zA-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: paymentNotes.trim() || 'Daily supplier disbursement',
    });

    setPaymentAmount('');
    setPaymentRef('');
    setPaymentNotes('');
    setShowAddPaymentModal(false);
  };

  return (
    <div className={`bg-white rounded-xl ${isModal ? '' : 'border border-slate-200 shadow-xs p-6'}`}>
      
      {/* 1. Header Bar matching screenshot */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Daily Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily purchase invoices, payment disbursements & supplier balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddPaymentModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Daily Payment</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Bar matching screenshot: Supplier | Start Date | End Date | Balance */}
      <div className="py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* Supplier Dropdown */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Supplier
          </label>
          <div className="relative">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-slate-500 appearance-none pr-8 cursor-pointer shadow-2xs font-medium"
            >
              <option value="All">All</option>
              {supplierList.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-slate-500 font-mono shadow-2xs"
            />
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-slate-500 font-mono shadow-2xs"
            />
          </div>
        </div>

        {/* Balance Badge Box */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Balance {selectedSupplier !== 'All' ? `(${selectedSupplier})` : '(All Suppliers)'}
          </label>
          <div className="px-4 py-2 border border-red-200 bg-red-50/50 rounded-md flex items-center justify-between h-[42px] shadow-2xs">
            <span className="text-base font-bold font-mono text-red-600 tabular-nums">
              {formatCurrency(currentBalance, currentCurrency)}
            </span>
            <span className="text-[10px] font-mono text-red-500 uppercase tracking-wider font-semibold">
              Open
            </span>
          </div>
        </div>

      </div>

      {/* Quick Filter Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Presets:</span>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              !startDate && !endDate ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Dates
          </button>
          <button
            onClick={() => { setStartDate('2026-09-01'); setEndDate('2026-10-02'); }}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Sep - Oct 2026
          </button>
          <button
            onClick={() => { setStartDate('2026-08-01'); setEndDate('2026-08-31'); }}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Aug 2026
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Showing {filteredRows.length} daily records {selectedRowIds.length > 0 && `(${selectedRowIds.length} selected)`}
        </div>
      </div>

      {/* 3. Table matching screenshot columns: [ ] Date | Supplier | Total Purchase | Total Payment */}
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-900 text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold text-slate-900">
                  Date
                </th>
                <th className="py-3 px-4 font-semibold text-slate-900">
                  Supplier
                </th>
                <th className="py-3 px-4 font-semibold text-slate-900 text-right">
                  Total Purchase
                </th>
                <th className="py-3 px-4 font-semibold text-slate-900 text-right">
                  Total Payment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No transactions found for the selected supplier and date range.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isChecked = selectedRowIds.includes(row.id);
                  const isExpanded = expandedRowId === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => toggleSelectRow(row.id)}
                        className={`transition-colors cursor-pointer ${
                          isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(row.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-slate-900 whitespace-nowrap">
                          {row.date}
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4 text-slate-900 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{row.supplier}</span>
                            {(row.invoicesCount > 0 || row.paymentsCount > 0) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRowId(isExpanded ? null : row.id);
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded border border-slate-200"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Total Purchase */}
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 text-right whitespace-nowrap">
                          {formatCurrency(row.totalPurchase, currentCurrency)}
                        </td>

                        {/* Total Payment */}
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 text-right whitespace-nowrap">
                          {formatCurrency(row.totalPayment, currentCurrency)}
                        </td>
                      </tr>

                      {/* Expanded Drilldown Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 text-xs">
                          <td colSpan={5} className="p-4 border-t border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              {/* Invoices on this day */}
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Invoiced Purchases ({row.invoices.length})</span>
                                </h4>
                                {row.invoices.length === 0 ? (
                                  <div className="text-slate-400 italic">No new invoices issued on this date.</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {row.invoices.map((inv) => (
                                      <div key={inv.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                                        <div>
                                          <div className="font-mono font-semibold text-slate-900">{inv.invoiceNumber}</div>
                                          <div className="text-[11px] text-slate-500">{inv.notes || inv.vendorCategory}</div>
                                        </div>
                                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                                          {formatCurrency(inv.totalAmount, currentCurrency)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Payments on this day */}
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Disbursed Payments ({row.payments.length})</span>
                                </h4>
                                {row.payments.length === 0 ? (
                                  <div className="text-slate-400 italic">No payments processed on this date.</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {row.payments.map((p, pIdx) => (
                                      <div key={pIdx} className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between">
                                        <div>
                                          <div className="font-mono font-semibold text-emerald-800">{p.reference}</div>
                                          <div className="text-[11px] text-slate-500">{p.notes || 'Supplier settlement'}</div>
                                        </div>
                                        <div className="font-mono font-bold text-emerald-700 tabular-nums">
                                          +{formatCurrency(p.amount, currentCurrency)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer Bar */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="text-slate-500 font-mono">
            Summary: <strong className="text-slate-900">{filteredRows.length}</strong> daily entries
          </div>
          <div className="flex flex-wrap items-center gap-6 font-mono">
            <div>
              <span className="text-slate-500">Period Purchases: </span>
              <strong className="text-slate-900 font-bold tabular-nums">
                {formatCurrency(summaryTotals.purchases, currentCurrency)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Period Payments: </span>
              <strong className="text-emerald-700 font-bold tabular-nums">
                {formatCurrency(summaryTotals.payments, currentCurrency)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Net Activity: </span>
              <strong className={`font-bold tabular-nums ${summaryTotals.net >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(summaryTotals.net, currentCurrency)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal Dialog */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Record Daily Supplier Payment</span>
              </h3>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Supplier / Beneficiary</label>
                <select
                  value={paymentSupplier}
                  onChange={(e) => setPaymentSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium"
                >
                  {supplierList.map((sup) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Amount (USD)</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  placeholder="e.g. 15000.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-sm bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="aba_pay">ABA Bank / ABA PAY Direct</option>
                  <option value="khqr">Bakong KHQR Universal Transfer</option>
                  <option value="acleda">ACLEDA ToanChet</option>
                  <option value="cash">Shop Vault Cash (COD)</option>
                  <option value="wing">Wing Bank</option>
                  <option value="swift">SWIFT Telegraphic Wire</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reference / Voucher No.</label>
                <input
                  type="text"
                  placeholder={`e.g. ABA-${paymentSupplier.replace(/[^a-zA-Z0-9]/g, '')}-${todayPhnomPenh().slice(5, 10).replace('-', '')}`}
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Memo / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Daily installment tranche disbursement"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded shadow-xs"
                >
                  Save Daily Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice, InvoiceStatus, PaymentMethod } from '../types/finance';
import { formatCurrency, convertFromUSD } from '../utils/currency';
import { exportInvoicesToCSV } from '../utils/csvExport';
import {
  Search,
  Filter,
  Download,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Eye,
  Check,
  Plus,
  Split,
} from 'lucide-react';

interface InvoicesViewProps {
  onSelectInvoice: (id: string) => void;
  onOpenIntake: () => void;
  onOpenBulkPayWithSelected?: (ids: string[]) => void;
  initialFilter?: string;
  onOpenReminderModalForInvoice?: (invoice: Invoice) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onSelectInvoice,
  onOpenIntake,
  onOpenBulkPayWithSelected,
  initialFilter = 'all',
  onOpenReminderModalForInvoice,
}) => {
  const {
    invoices,
    currentCurrency,
    currentUser,
    approveInvoice,
    executePayment,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Unique departments for dropdown
  const departments = useMemo(() => {
    const set = new Set(invoices.map((i) => i.department));
    return Array.from(set);
  }, [invoices]);

  // Unique product categories for dropdown
  const categories = useMemo(() => {
    const set = new Set(invoices.map((i) => i.vendorCategory));
    return Array.from(set);
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesQuery =
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.vendorName.toLowerCase().includes(q) ||
          (inv.poNumber && inv.poNumber.toLowerCase().includes(q)) ||
          inv.vendorCategory.toLowerCase().includes(q) ||
          inv.department.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'receivable') {
          if (inv.type !== 'receivable') return false;
        } else if (statusFilter === 'overdue') {
          if (inv.status !== 'overdue') return false;
        } else if (statusFilter === 'pending_approval') {
          if (inv.status !== 'pending_approval' && inv.status !== 'in_review') return false;
        } else if (statusFilter === 'approved') {
          if (inv.status !== 'approved') return false;
        } else if (statusFilter === 'partially_paid') {
          if (inv.status !== 'partially_paid') return false;
        } else if (statusFilter === 'paid') {
          if (inv.status !== 'paid') return false;
        }
      }

      // Category
      if (categoryFilter !== 'all' && inv.vendorCategory !== categoryFilter) {
        return false;
      }

      // Department
      if (departmentFilter !== 'all' && inv.department !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [invoices, searchQuery, statusFilter, categoryFilter, departmentFilter]);

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Selected totals
  const selectedInvoices = invoices.filter((i) => selectedInvoiceIds.includes(i.id));
  const selectedTotalUSD = selectedInvoices.reduce((s, i) => s + i.baseAmountUSD, 0);

  // Status text & style helper - strict zero-pill discipline (unboxed text with typographic separator)
  const renderStatus = (status: InvoiceStatus, type: string) => {
    if (status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          <span>Overdue</span>
        </span>
      );
    }
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>Paid</span>
        </span>
      );
    }
    if (status === 'partially_paid') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          <span>Partially Paid</span>
        </span>
      );
    }
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-blue-700 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>Approved</span>
        </span>
      );
    }
    if (status === 'pending_approval' || status === 'in_review') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>In Review</span>
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Scheduled</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Top Controls: Search, Filters, CSV Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-lg">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, invoice #, PO reference..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Bar & Export */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Product Category Select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium focus:outline-none focus:border-slate-500"
          >
            <option value="all">All Products</option>
            <option value="Mobile Phone">📱 Mobile Phone</option>
            <option value="Tablet">📲 Tablet</option>
            <option value="Accessories">🎧 Accessories</option>
            <option value="Laptop">💻 Laptop</option>
            <option value="Logistics & Freight">✈️ Logistics & Freight</option>
          </select>

          {/* Department Select */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            onClick={() => exportInvoicesToCSV(filteredInvoices)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
            title="Export standard RFC 4180 audit CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Supplier Split Allocator */}
          <button
            onClick={() => onOpenBulkPayWithSelected ? onOpenBulkPayWithSelected([]) : null}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            title="Split settlement and allocate remaining balance across supplier invoices"
          >
            <Split className="w-3.5 h-3.5" />
            <span>Split Allocator</span>
          </button>

          {/* New Invoice Intake */}
          <button
            onClick={onOpenIntake}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Intake Invoice</span>
          </button>
        </div>

      </div>

      {/* Segmented Filter Bar (Button controls per constitution) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none text-xs">
        {[
          { id: 'all', label: 'All Invoices', count: invoices.length },
          {
            id: 'overdue',
            label: 'Overdue',
            count: invoices.filter((i) => i.status === 'overdue').length,
          },
          {
            id: 'partially_paid',
            label: 'Partially Paid',
            count: invoices.filter((i) => i.status === 'partially_paid').length,
          },
          {
            id: 'pending_approval',
            label: 'Pending Approval',
            count: invoices.filter((i) => i.status === 'pending_approval' || i.status === 'in_review').length,
          },
          {
            id: 'approved',
            label: 'Approved (Ready to Pay)',
            count: invoices.filter((i) => i.status === 'approved').length,
          },
          {
            id: 'paid',
            label: 'Settled / Paid',
            count: invoices.filter((i) => i.status === 'paid').length,
          },
          {
            id: 'receivable',
            label: 'Receivables (AR)',
            count: invoices.filter((i) => i.type === 'receivable').length,
          },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[11px] opacity-70">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Floating Bulk Action Bar when items selected */}
      {selectedInvoiceIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-slate-900 text-white rounded-lg px-4 py-3 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold font-mono tabular-nums">
              {selectedInvoiceIds.length} {selectedInvoiceIds.length === 1 ? 'invoice' : 'invoices'} selected
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300">
              Total:{' '}
              <strong className="text-white font-mono tabular-nums">
                {formatCurrency(convertFromUSD(selectedTotalUSD, currentCurrency), currentCurrency)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onOpenBulkPayWithSelected) {
                  onOpenBulkPayWithSelected(selectedInvoiceIds);
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Bulk Pay Batch</span>
            </button>
            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredInvoices.length > 0 &&
                      selectedInvoiceIds.length === filteredInvoices.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Invoice & PO</th>
                <th className="py-3 px-3">Vendor / Beneficiary</th>
                <th className="py-3 px-3">Dates</th>
                <th className="py-3 px-3 text-right">Amount (Original)</th>
                <th className="py-3 px-3 text-right">Remaining Open</th>
                <th className="py-3 px-3 text-right">Amount ({currentCurrency})</th>
                <th className="py-3 px-3">Compliance</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No matching invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search query or status filter.
                    </p>
                    <button
                      onClick={onOpenIntake}
                      className="mt-3 px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      Process First Invoice
                    </button>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  const isOverdue = inv.status === 'overdue';
                  const convertedAmount = convertFromUSD(inv.baseAmountUSD, currentCurrency);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-slate-50/80' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(inv.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Invoice & PO */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onSelectInvoice(inv.id)}
                          className="font-mono font-semibold text-slate-900 hover:underline text-left block"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {inv.poNumber ? inv.poNumber : <span className="text-slate-400">Direct AP</span>}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-medium text-slate-900 truncate" title={inv.vendorName}>
                          {inv.vendorName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{inv.vendorCategory}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400">{inv.department}</span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-700 font-mono text-[11px]">
                          Due: <span className={isOverdue ? 'font-semibold text-rose-700' : ''}>{inv.dueDate}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Issued: {inv.issueDate}
                        </div>
                      </td>

                      {/* Amount Original */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(inv.totalAmount, inv.currency)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Terms: {inv.paymentTerms}
                        </div>
                      </td>

                      {/* Remaining Open Balance */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            (inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.amountPaid || 0)) > 0
                              ? isOverdue
                                ? 'text-rose-700'
                                : 'text-slate-900'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(
                            inv.remainingBalance !== undefined
                              ? inv.remainingBalance
                              : inv.totalAmount - (inv.amountPaid || 0),
                            inv.currency
                          )}
                        </div>
                        {(inv.amountPaid || 0) > 0 && (
                          <div className="text-[10px] text-indigo-700 font-medium">
                            Paid: {formatCurrency(inv.amountPaid || 0, inv.currency)}
                          </div>
                        )}
                      </td>

                      {/* Amount Converted Base */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-700">
                          {formatCurrency(convertedAmount, currentCurrency)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Base rate applied
                        </div>
                      </td>

                      {/* 3-Way Match Compliance */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {inv.threeWayMatched ? (
                          <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>3-Way Matched</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Pending PO Match</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderStatus(inv.status, inv.type)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Approve button if pending */}
                          {(inv.status === 'pending_approval' || inv.status === 'in_review') &&
                            currentUser.role !== 'auditor' && (
                              <button
                                onClick={() => approveInvoice(inv.id, 'Fast approval from ledger')}
                                className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                                title="Approve invoice"
                              >
                                Approve
                              </button>
                            )}

                          {/* Settle button for open balance invoices */}
                          {(inv.status === 'approved' || inv.status === 'partially_paid' || inv.status === 'overdue') &&
                            (inv.remainingBalance === undefined || inv.remainingBalance > 0) &&
                            currentUser.role !== 'auditor' && (
                              <button
                                onClick={() => onSelectInvoice(inv.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
                                title="Settle partial or full payment on this invoice"
                              >
                                <Split className="w-3 h-3" />
                                <span>Settle</span>
                              </button>
                            )}

                          {/* Quick Pay if approved (Full) */}
                          {inv.status === 'approved' && inv.amountPaid === 0 && currentUser.role !== 'auditor' && (
                            <button
                              onClick={() => executePayment(inv.id, 'ach')}
                              className="px-2 py-1 text-[11px] font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              title="Pay full balance via ACH"
                            >
                              Pay Now
                            </button>
                          )}

                          {/* Reminder Trigger */}
                          {(inv.status === 'overdue' || inv.status === 'approved') && (
                            <button
                              onClick={() => {
                                if (onOpenReminderModalForInvoice) {
                                  onOpenReminderModalForInvoice(inv);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
                              title="Send automated email reminder"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View details */}
                          <button
                            onClick={() => onSelectInvoice(inv.id)}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
                            title="Inspect 3-way match & line items"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Showing <span className="font-mono tabular-nums font-semibold text-slate-900">{filteredInvoices.length}</span> of{' '}
            <span className="font-mono tabular-nums">{invoices.length}</span> total invoices
          </div>
          <div className="font-mono tabular-nums">
            Filtered Total:{' '}
            <strong className="text-slate-900">
              {formatCurrency(
                convertFromUSD(
                  filteredInvoices.reduce((s, i) => s + i.baseAmountUSD, 0),
                  currentCurrency
                ),
                currentCurrency
              )}
            </strong>
          </div>
        </div>

      </div>

    </div>
  );
};

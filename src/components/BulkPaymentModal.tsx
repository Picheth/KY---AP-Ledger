import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { PaymentMethod, Invoice } from '../types/finance';
import { formatCurrency, convertFromUSD, convertToUSD } from '../utils/currency';
import {
  X,
  CreditCard,
  Building,
  CheckCircle2,
  DollarSign,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Split,
  Layers,
  ArrowDownRight,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInvoiceIds?: string[];
  initialSupplierId?: string;
}

export const BulkPaymentModal: React.FC<BulkPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedInvoiceIds = [],
  initialSupplierId,
}) => {
  const {
    invoices,
    vendors,
    currentCurrency,
    executeBulkPayment,
    executeMultiInvoiceSettlement,
    currentUser,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'split_allocator' | 'batch_full'>('split_allocator');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplierId || 'all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('aba_pay');
  const [treasuryAccount, setTreasuryAccount] = useState('ABA Bank Primary (USD & KHR) - Angkor Tech Store (•••• 991)');
  const [disbursementMemo, setDisbursementMemo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successBatch, setSuccessBatch] = useState<any | null>(null);

  // Eligible invoices are not fully paid (approved, overdue, or partially_paid)
  const eligibleInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (i.type !== 'payable') return false;
      const rem = i.remainingBalance !== undefined ? i.remainingBalance : (i.totalAmount - (i.amountPaid || 0));
      return (
        rem > 0 &&
        (i.status === 'approved' || i.status === 'overdue' || i.status === 'partially_paid')
      );
    });
  }, [invoices]);

  // Filtered for supplier if selected
  const supplierInvoices = useMemo(() => {
    if (selectedSupplierId === 'all') return eligibleInvoices;
    return eligibleInvoices.filter((i) => i.vendorId === selectedSupplierId);
  }, [eligibleInvoices, selectedSupplierId]);

  // Total open balance of supplier invoices
  const totalOpenSupplierBalance = useMemo(() => {
    return supplierInvoices.reduce((sum, inv) => {
      const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
      return sum + rem;
    }, 0);
  }, [supplierInvoices]);

  // Split allocator budget input (defaults to e.g. round number or total open)
  const [totalSettlementBudget, setTotalSettlementBudget] = useState<string>('300000');

  // Map of invoiceId -> allocated payment amount
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    return map;
  });

  // Batch full selected IDs
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(() => {
    if (preselectedInvoiceIds.length > 0) return preselectedInvoiceIds;
    return eligibleInvoices.map((i) => i.id);
  });

  if (!isOpen) return null;

  // Split Allocator Calculations
  const numericBudget = parseFloat(totalSettlementBudget) || 0;
  const totalAllocatedAmount = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const remainingBudgetToAllocate = Math.max(0, numericBudget - totalAllocatedAmount);

  // Selected invoices for split batch
  const allocatedInvoiceCount = Object.values(allocations).filter((amt) => amt > 0).length;

  // Handle single invoice allocation change
  const handleSetAllocation = (invoiceId: string, valueStr: string) => {
    const val = parseFloat(valueStr);
    const inv = supplierInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const maxAllowable = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));

    if (isNaN(val) || val <= 0) {
      setAllocations((prev) => {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      });
    } else {
      const clamped = Math.min(val, maxAllowable);
      setAllocations((prev) => ({
        ...prev,
        [invoiceId]: clamped,
      }));
    }
  };

  // Quick button: Allocate Remaining Budget to this invoice
  const handleAllocateRemainingToInvoice = (invoiceId: string) => {
    const inv = supplierInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const invoiceRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
    const currentAlloc = allocations[invoiceId] || 0;
    const availablePool = remainingBudgetToAllocate + currentAlloc;

    if (availablePool <= 0) {
      alert('Your settlement budget is fully allocated. Increase the budget to allocate more.');
      return;
    }

    const toAllocate = Math.min(availablePool, invoiceRemaining);
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: toAllocate,
    }));
  };

  // Quick button: Settle full remaining balance on this invoice
  const handleSettleFullInvoice = (invoiceId: string) => {
    const inv = supplierInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const invoiceRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: invoiceRemaining,
    }));
  };

  // Auto Cascade: Distribute budget chronologically (oldest due date first)
  const handleCascadeAutoAllocate = () => {
    if (numericBudget <= 0) {
      alert('Please enter a valid total settlement budget to allocate.');
      return;
    }

    let unallocated = numericBudget;
    const newMap: Record<string, number> = {};

    // Sort supplier invoices by due date ascending (oldest first)
    const sorted = [...supplierInvoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    for (const inv of sorted) {
      if (unallocated <= 0) break;
      const invRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
      const take = Math.min(unallocated, invRemaining);
      if (take > 0) {
        newMap[inv.id] = take;
        unallocated -= take;
      }
    }

    setAllocations(newMap);
  };

  const handleClearAllocations = () => {
    setAllocations({});
  };

  // Batch full toggle
  const toggleBatchInvoice = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Calculation for batch full mode
  const batchFullInvoices = eligibleInvoices.filter((i) => selectedBatchIds.includes(i.id));
  const batchFullTotalUSD = batchFullInvoices.reduce((sum, inv) => {
    const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
    return sum + convertToUSD(rem, inv.currency);
  }, 0);

  // Virtual card cashback calculation (1.5%)
  const virtualCardCashbackUSD =
    paymentMethod === 'virtual_card'
      ? activeTab === 'split_allocator'
        ? (totalAllocatedAmount * 0.015)
        : (batchFullTotalUSD * 0.015)
      : 0;

  // Execution handler
  const handleExecute = () => {
    if (activeTab === 'split_allocator') {
      const items = Object.entries(allocations)
        .filter(([_, amt]) => amt > 0)
        .map(([invoiceId, amount]) => ({ invoiceId, amount }));

      if (items.length === 0) {
        alert('Please specify an amount to settle on at least one invoice.');
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        const batch = executeMultiInvoiceSettlement(
          items,
          paymentMethod,
          numericBudget,
          disbursementMemo.trim() || undefined
        );
        setIsProcessing(false);
        setSuccessBatch(batch);
      }, 900);
    } else {
      if (selectedBatchIds.length === 0) {
        alert('Please select at least one invoice to disburse.');
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        const batch = executeBulkPayment(selectedBatchIds, paymentMethod);
        setIsProcessing(false);
        setSuccessBatch(batch);
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Split className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Supplier Settlement & Disbursement Allocator</span>
              </h3>
              <div className="text-xs text-slate-500">
                Settle partial amount on one invoice and allocate the remaining balance to other invoices
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {!successBatch && (
          <div className="px-6 pt-3 pb-0 bg-slate-50/80 border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('split_allocator')}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'split_allocator'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Split className="w-4 h-4" />
              <span>Split & Allocate Remaining to Other Invoices</span>
            </button>

            <button
              onClick={() => setActiveTab('batch_full')}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'batch_full'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Batch 100% Full Disbursement</span>
            </button>
          </div>
        )}

        {/* Content */}
        {successBatch ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">
              Disbursement & Allocation Executed Successfully
            </h4>
            <div className="text-xs text-slate-600 max-w-lg mx-auto">
              Batch <strong className="font-mono">{successBatch.batchNumber}</strong> has been transmitted via{' '}
              <strong className="uppercase font-mono">{paymentMethod}</strong> across{' '}
              <strong className="text-slate-900">{successBatch.invoiceCount} invoices</strong>.
              
              {virtualCardCashbackUSD > 0 && (
                <div className="mt-3 p-2 bg-emerald-50 text-emerald-800 rounded-md font-medium border border-emerald-200">
                  🎉 Virtual Card Rebate Earned: +{formatCurrency(virtualCardCashbackUSD, currentCurrency)}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                Return to Ledger
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* SPLIT ALLOCATOR MODE */}
            {activeTab === 'split_allocator' ? (
              <div className="space-y-5">
                
                {/* Supplier & Budget Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs">
                  {/* Supplier filter */}
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      1. Select Supplier / Beneficiary
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => {
                        setSelectedSupplierId(e.target.value);
                        setAllocations({});
                      }}
                      className="w-full px-3 py-1.5 border border-indigo-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Suppliers (Multi-Vendor Allocation)</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.category})
                        </option>
                      ))}
                    </select>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Showing {supplierInvoices.length} open invoices with total open balance of{' '}
                      <strong className="font-mono text-slate-800">
                        {formatCurrency(totalOpenSupplierBalance, 'USD')}
                      </strong>
                    </div>
                  </div>

                  {/* Settlement Budget Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-800">
                        2. Total Settlement Amount / Budget (USD) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setTotalSettlementBudget(totalOpenSupplierBalance.toString())}
                        className="text-[10px] text-indigo-700 hover:underline font-mono"
                      >
                        Set to Total Open
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={totalSettlementBudget}
                        onChange={(e) => setTotalSettlementBudget(e.target.value)}
                        placeholder="e.g. 300000"
                        className="w-full pl-7 pr-3 py-1.5 border border-indigo-200 rounded-md bg-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Amount you intend to disburse across these supplier invoices.
                    </div>
                  </div>
                </div>

                {/* Allocation Balance Dashboard Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Total Disbursal Budget</span>
                    <div className="text-base font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                      {formatCurrency(numericBudget, 'USD')}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium">Allocated to Invoices</span>
                    <div className="text-base font-bold font-mono text-indigo-700 tabular-nums mt-0.5">
                      {formatCurrency(totalAllocatedAmount, 'USD')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Applied across {allocatedInvoiceCount} invoice(s)
                    </div>
                  </div>

                  <div className={`p-2 rounded ${remainingBudgetToAllocate > 0 ? 'bg-amber-100/70 border border-amber-300' : 'bg-emerald-100/70 border border-emerald-300'}`}>
                    <span className="text-slate-600 font-semibold block text-[11px]">
                      {remainingBudgetToAllocate > 0 ? 'Remaining to Allocate to Other Invoices' : 'Settlement Budget Fully Allocated'}
                    </span>
                    <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${remainingBudgetToAllocate > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
                      {formatCurrency(remainingBudgetToAllocate, 'USD')}
                    </div>
                  </div>
                </div>

                {/* Action Bar for Allocation */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs font-semibold text-slate-900">
                    3. Allocate Settlement One-by-One or Cascade
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleCascadeAutoAllocate}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>Auto-Cascade Budget to Invoices</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllocations}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Invoices List with Interactive Allocation Fields */}
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
                  {supplierInvoices.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      No open invoices for this selection.
                    </div>
                  ) : (
                    supplierInvoices.map((inv) => {
                      const invRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
                      const currentAlloc = allocations[inv.id] || 0;
                      const balanceAfter = Math.max(0, invRemaining - currentAlloc);

                      return (
                        <div
                          key={inv.id}
                          className={`p-3.5 transition-colors ${
                            currentAlloc > 0 ? 'bg-indigo-50/40' : 'bg-white hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            {/* Invoice info */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-slate-900 text-sm">
                                  {inv.invoiceNumber}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-700 font-medium">{inv.vendorName}</span>
                                {inv.status === 'partially_paid' && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                    PARTIAL
                                  </span>
                                )}
                                {inv.status === 'overdue' && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                PO: <span className="font-mono">{inv.poNumber || 'DIRECT'}</span> · Due Date:{' '}
                                <span className={inv.status === 'overdue' ? 'text-rose-600 font-semibold' : ''}>
                                  {inv.dueDate}
                                </span> · Total: {formatCurrency(inv.totalAmount, inv.currency)} (Paid to date: {formatCurrency(inv.amountPaid || 0, inv.currency)})
                              </div>
                            </div>

                            {/* Open Balance & Allocation Input Controls */}
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                              {/* Open Balance display */}
                              <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase font-medium">Open Balance</div>
                                <div className="font-mono font-bold text-slate-900 tabular-nums">
                                  {formatCurrency(invRemaining, inv.currency)}
                                </div>
                              </div>

                              {/* Amount to Settle Input */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      max={invRemaining}
                                      step="any"
                                      value={currentAlloc > 0 ? currentAlloc : ''}
                                      onChange={(e) => handleSetAllocation(inv.id, e.target.value)}
                                      placeholder="0.00"
                                      className="w-32 pl-6 pr-2 py-1 text-xs border border-slate-300 rounded font-mono font-semibold focus:outline-none focus:border-indigo-600 bg-white"
                                    />
                                  </div>

                                  {/* Quick action buttons */}
                                  <button
                                    type="button"
                                    onClick={() => handleAllocateRemainingToInvoice(inv.id)}
                                    title="Allocate remaining budget pool to this invoice"
                                    className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded whitespace-nowrap"
                                  >
                                    + Allocate Remaining
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSettleFullInvoice(inv.id)}
                                    title="Settle full open balance for this invoice"
                                    className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded"
                                  >
                                    Full
                                  </button>
                                </div>

                                {/* Balance After preview */}
                                {currentAlloc > 0 && (
                                  <div className="text-[10px] text-slate-500 font-mono text-right">
                                    Remaining after settlement:{' '}
                                    <span className={balanceAfter === 0 ? 'text-emerald-600 font-semibold' : 'text-amber-700 font-semibold'}>
                                      {formatCurrency(balanceAfter, inv.currency)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            ) : (
              /* BATCH 100% FULL DISBURSEMENT MODE */
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    Select invoices to disburse 100% of their open balance in one consolidated batch:
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setSelectedBatchIds(eligibleInvoices.map((i) => i.id))}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Select All ({eligibleInvoices.length})
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => setSelectedBatchIds([])}
                      className="text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {eligibleInvoices.map((inv) => {
                    const isChecked = selectedBatchIds.includes(inv.id);
                    const invRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));

                    return (
                      <div
                        key={inv.id}
                        onClick={() => toggleBatchInvoice(inv.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-slate-50/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{inv.vendorName}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono text-slate-600">{inv.invoiceNumber}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Due: <span className={inv.status === 'overdue' ? 'text-rose-600 font-bold' : ''}>{inv.dueDate}</span> · Category: {inv.vendorCategory}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono tabular-nums">
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(invRemaining, inv.currency)}
                          </div>
                          {inv.amountPaid > 0 && (
                            <div className="text-[10px] text-slate-400">
                              (Paid: {formatCurrency(inv.amountPaid, inv.currency)})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Method Rail Selector */}
            <div className="pt-2 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-900 block mb-2">
                Cambodian Disbursement Payment Rail & Banking Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {[
                  { id: 'aba_pay' as PaymentMethod, label: 'ABA Bank', note: 'ABA PAY Direct (USD/KHR)', badge: 'PRIMARY' },
                  { id: 'khqr' as PaymentMethod, label: 'Bakong KHQR', note: 'National Bank QR Code', badge: 'INSTANT' },
                  { id: 'acleda' as PaymentMethod, label: 'ACLEDA', note: 'ToanChet Transfer' },
                  { id: 'cash' as PaymentMethod, label: 'Vault Cash', note: 'Cash on Delivery (COD)' },
                  { id: 'wing' as PaymentMethod, label: 'Wing Bank', note: 'Merchant Agent Pay' },
                  { id: 'swift' as PaymentMethod, label: 'SWIFT Wire', note: 'Import TT (USD)' },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 border rounded-lg text-left transition-all relative ${
                        isSelected
                          ? 'border-indigo-600 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-xs">{m.label}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {m.note}
                      </div>
                      {m.badge && (
                        <span className={`inline-block mt-1 text-[8px] font-mono px-1 rounded ${
                          isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 font-semibold'
                        }`}>
                          {m.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Memo & Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-900 block mb-1">
                Settlement Memo & Remittance Reference Note
              </label>
              <input
                type="text"
                value={disbursementMemo}
                onChange={(e) => setDisbursementMemo(e.target.value)}
                placeholder="e.g. Q3 Mobile & Computing hardware tranche allocation per contract schedule"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>

            {/* Authorization note */}
            <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <span>
                Authorized by <strong>{currentUser.name}</strong> ({currentUser.title}). Individual transaction hashes and partial payment schedules are logged in permanent SOX general ledger audit trail.
              </span>
            </div>

          </div>
        )}

        {/* Footer */}
        {!successBatch && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="font-mono text-slate-600">
              {activeTab === 'split_allocator' ? (
                <>
                  Allocated{' '}
                  <strong className="text-indigo-900 text-sm font-bold tabular-nums">
                    {formatCurrency(totalAllocatedAmount, 'USD')}
                  </strong>{' '}
                  across {allocatedInvoiceCount} invoice(s)
                  {remainingBudgetToAllocate > 0 && (
                    <span className="text-amber-700 ml-2">
                      ({formatCurrency(remainingBudgetToAllocate, 'USD')} unallocated)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Disbursing{' '}
                  <strong className="text-slate-900 text-sm font-bold tabular-nums">
                    {formatCurrency(batchFullTotalUSD, currentCurrency)}
                  </strong>{' '}
                  across {batchFullInvoices.length} invoices
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isProcessing ||
                  (activeTab === 'split_allocator' ? totalAllocatedAmount <= 0 : selectedBatchIds.length === 0)
                }
                onClick={handleExecute}
                className="px-4 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing Settlement...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Disburse Settlement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

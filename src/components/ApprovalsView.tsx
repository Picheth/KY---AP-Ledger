import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, convertFromUSD } from '../utils/currency';
import {
  CheckCircle,
  XCircle,
  Shield,
  AlertCircle,
  Clock,
  Layers,
  Check,
  Eye,
  ArrowRight,
} from 'lucide-react';

interface ApprovalsViewProps {
  onSelectInvoice: (id: string) => void;
  onOpenBulkPayWithSelected?: (ids: string[]) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  onSelectInvoice,
  onOpenBulkPayWithSelected,
}) => {
  const {
    invoices,
    currentUser,
    currentCurrency,
    approveInvoice,
    rejectInvoice,
  } = useFinance();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Pending invoices
  const pendingInvoices = invoices.filter(
    (i) => i.status === 'pending_approval' || i.status === 'in_review'
  );

  const totalPendingUSD = pendingInvoices.reduce((sum, i) => sum + i.baseAmountUSD, 0);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    let approvedCount = 0;
    selectedIds.forEach((id) => {
      const ok = approveInvoice(id, 'Batch approved in queue');
      if (ok) approvedCount++;
    });
    setSelectedIds([]);
  };

  const handleConfirmReject = (id: string) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    rejectInvoice(id, rejectReason.trim());
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Role Authority Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{currentUser.name}</h3>
                <span className="text-slate-400">·</span>
                <span className="text-xs font-mono text-slate-600 uppercase">{currentUser.role.replace('_', ' ')}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Approval Disbursal Authority: <strong className="text-slate-900 font-mono tabular-nums">
                  {currentUser.approvalLimitUSD === 0 ? 'Read-only Auditor' : `$${currentUser.approvalLimitUSD.toLocaleString()} USD max threshold`}
                </strong>
              </div>
            </div>
          </div>

          <div className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-md">
            <span className="text-slate-500">Queue Total:</span>{' '}
            <strong className="text-slate-900 tabular-nums">
              {formatCurrency(convertFromUSD(totalPendingUSD, currentCurrency), currentCurrency)}
            </strong>{' '}
            ({pendingInvoices.length} awaiting sign-off)
          </div>
        </div>

        {/* Approval Hierarchy Visualization */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-900">Tier 1: AP Specialist</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Invoices &lt; $15,000 · Marcus Chen</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Validates PO match & intake accuracy</div>
          </div>
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-900">Tier 2: Dept Manager</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Invoices &lt; $50,000 · Sarah Lin</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Authorizes operational budget & delivery</div>
          </div>
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-900">Tier 3: Executive CFO</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Invoices &gt; $50,000 · Elena Vance</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Final treasury disbursement release</div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar for Approvals */}
      {selectedIds.length > 0 && currentUser.role !== 'auditor' && (
        <div className="bg-slate-900 text-white rounded-lg p-3 shadow-lg flex items-center justify-between gap-4 text-xs">
          <div className="font-mono tabular-nums font-semibold">
            {selectedIds.length} invoices selected for batch authorization
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              className="px-3 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Pending Approval List */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Invoices Awaiting Review</h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Select invoices to authorize or click to view detailed line items & 3-way match
            </div>
          </div>
          {pendingInvoices.length > 0 && (
            <button
              onClick={() => setSelectedIds(pendingInvoices.map((i) => i.id))}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Select All ({pendingInvoices.length})
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {pendingInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="font-semibold text-slate-900 text-sm">Approval Queue is Clear</div>
              <div className="text-slate-400 mt-1">All supplier invoices have been reviewed and approved.</div>
            </div>
          ) : (
            pendingInvoices.map((inv) => {
              const isSelected = selectedIds.includes(inv.id);
              const exceedsLimit =
                currentUser.approvalLimitUSD > 0 && inv.baseAmountUSD > currentUser.approvalLimitUSD;
              const convertedAmount = convertFromUSD(inv.baseAmountUSD, currentCurrency);

              return (
                <div
                  key={inv.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={currentUser.role === 'auditor'}
                      checked={isSelected}
                      onChange={() => toggleSelectOne(inv.id)}
                      className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer disabled:opacity-30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectInvoice(inv.id)}
                          className="font-mono font-semibold text-slate-900 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-slate-900">{inv.vendorName}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>PO: <strong className="font-mono text-slate-700">{inv.poNumber || 'DIRECT'}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>Dept: {inv.department}</span>
                        <span aria-hidden="true">·</span>
                        <span>Due: {inv.dueDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className={inv.threeWayMatched ? 'text-emerald-700' : 'text-amber-700'}>
                          {inv.threeWayMatched ? '3-Way Matched' : 'Pending Dock Receipt'}
                        </span>
                      </div>
                      {exceedsLimit && (
                        <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Amount exceeds your role limit ($${currentUser.approvalLimitUSD.toLocaleString()}). Requires CFO.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Amounts */}
                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </div>
                      {inv.currency !== currentCurrency && (
                        <div className="text-[10px] text-slate-400">
                          ≈ {formatCurrency(convertedAmount, currentCurrency)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectInvoice(inv.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
                        title="Inspect details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {currentUser.role !== 'auditor' && (
                        <>
                          <button
                            onClick={() => setRejectingId(inv.id)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            disabled={exceedsLimit}
                            onClick={() => approveInvoice(inv.id, 'One-click sign-off')}
                            className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors shadow-xs"
                          >
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rejection input overlay if opened */}
                  {rejectingId === inv.id && (
                    <div className="w-full mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs space-y-2">
                      <label className="font-semibold text-rose-900 block">
                        Reason for rejecting {inv.invoiceNumber}
                      </label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="State reason (e.g. rate variance, missing delivery receipt)"
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-md focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmReject(inv.id)}
                          className="px-3 py-1 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

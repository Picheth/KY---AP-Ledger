import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice } from '../types/finance';
import { formatCurrency, convertFromUSD, convertToUSD } from '../utils/currency';
import {
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  CreditCard,
  FileText,
  Split,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string, filter?: string) => void;
  onOpenBulkPay: () => void;
  onOpenIntake: () => void;
  onSelectInvoice: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenBulkPay,
  onOpenIntake,
  onSelectInvoice,
}) => {
  const { invoices, currentCurrency } = useFinance();

  const getOpenUSD = (i: Invoice) => {
    const rem = i.remainingBalance !== undefined ? i.remainingBalance : (i.totalAmount - (i.amountPaid || 0));
    return convertToUSD(rem, i.currency);
  };

  // Financial calculations
  const payableInvoices = invoices.filter((i) => i.type === 'payable');
  const receivableInvoices = invoices.filter((i) => i.type === 'receivable');

  // Total AP Outstanding (remaining open balance)
  const outstandingAP_USD = payableInvoices
    .filter((i) => i.status !== 'paid' && i.status !== 'rejected')
    .reduce((sum, i) => sum + getOpenUSD(i), 0);
  const outstandingAP_Display = convertFromUSD(outstandingAP_USD, currentCurrency);

  // Overdue AP (remaining open balance of overdue invoices)
  const overdueInvoices = payableInvoices.filter((i) => i.status === 'overdue');
  const overdueTotalUSD = overdueInvoices.reduce((sum, i) => sum + getOpenUSD(i), 0);
  const overdueTotalDisplay = convertFromUSD(overdueTotalUSD, currentCurrency);

  // Upcoming Due in next 7 days
  const today = new Date('2026-09-25');
  const sevenDaysLater = new Date('2026-10-02');
  const upcomingInvoices = payableInvoices.filter((i) => {
    if (i.status === 'paid' || i.status === 'rejected') return false;
    const due = new Date(i.dueDate);
    return due >= today && due <= sevenDaysLater;
  });
  const upcomingTotalUSD = upcomingInvoices.reduce((sum, i) => sum + getOpenUSD(i), 0);
  const upcomingTotalDisplay = convertFromUSD(upcomingTotalUSD, currentCurrency);

  // Approved invoices ready for payment
  const approvedInvoices = payableInvoices.filter((i) => i.status === 'approved' || i.status === 'partially_paid');
  const approvedTotalUSD = approvedInvoices.reduce((sum, i) => sum + getOpenUSD(i), 0);
  const approvedTotalDisplay = convertFromUSD(approvedTotalUSD, currentCurrency);

  // Partially paid count
  const partialInvoices = payableInvoices.filter((i) => i.status === 'partially_paid');

  // 3-way match compliance rate
  const matchedCount = payableInvoices.filter((i) => i.threeWayMatched).length;
  const matchRate = payableInvoices.length > 0
    ? Math.round((matchedCount / payableInvoices.length) * 100)
    : 100;

  // Accounts Receivable outstanding
  const arOutstandingUSD = receivableInvoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + getOpenUSD(i), 0);
  const arOutstandingDisplay = convertFromUSD(arOutstandingUSD, currentCurrency);

  // Aging distribution (0-30d, 31-60d, 61-90d, 90+d) based on remaining balances
  const agingBuckets = {
    current: 0,
    days30to60: 0,
    days61to90: 0,
    days90plus: 0,
  };

  payableInvoices.forEach((inv) => {
    if (inv.status === 'paid' || inv.status === 'rejected') return;
    const due = new Date(inv.dueDate);
    const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
    const openUSD = getOpenUSD(inv);

    if (diffDays <= 0) {
      agingBuckets.current += openUSD;
    } else if (diffDays <= 30) {
      agingBuckets.days30to60 += openUSD;
    } else if (diffDays <= 60) {
      agingBuckets.days61to90 += openUSD;
    } else {
      agingBuckets.days90plus += openUSD;
    }
  });

  const totalAgingUSD =
    agingBuckets.current +
    agingBuckets.days30to60 +
    agingBuckets.days61to90 +
    agingBuckets.days90plus || 1;

  // Category Spend breakdown
  const categorySpend: Record<string, number> = {};
  payableInvoices.forEach((inv) => {
    categorySpend[inv.vendorCategory] = (categorySpend[inv.vendorCategory] || 0) + inv.baseAmountUSD;
  });

  // Recent transactions / ledger activity
  const recentActivities: { timestamp: string; invoiceNum: string; text: string; role: string; id: string }[] = [];
  invoices.forEach((inv) => {
    inv.auditHistory.forEach((ah) => {
      recentActivities.push({
        id: inv.id,
        invoiceNum: inv.invoiceNumber,
        timestamp: ah.timestamp,
        text: ah.action,
        role: ah.userName,
      });
    });
  });
  recentActivities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const topActivities = recentActivities.slice(0, 6);

  return (
    <div className="space-y-6">
      
      {/* Overdue Payments Alert Banner */}
      {overdueInvoices.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-4 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-md text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">
                  {overdueInvoices.length} Overdue {overdueInvoices.length === 1 ? 'Invoice' : 'Invoices'} Requiring Action ({formatCurrency(overdueTotalDisplay, currentCurrency)})
                </h3>
                <div className="text-xs text-amber-700 mt-0.5">
                  Overdue payables incur late penalty fees and impact vendor delivery terms.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => onNavigateTab('reminders')}
                className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Automated Dunning</span>
              </button>
              <button
                onClick={() => onNavigateTab('invoices', 'overdue')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-md transition-colors flex items-center gap-1"
              >
                <span>View Overdue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Outstanding AP */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Accounts Payable</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(outstandingAP_Display, currentCurrency)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-slate-900 font-medium font-mono tabular-nums">
              {payableInvoices.filter((i) => i.status !== 'paid').length} open
            </span>
            <span aria-hidden="true">·</span>
            <span>Across 7 categories</span>
          </div>
        </div>

        {/* Metric 2: Overdue AP */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Overdue Obligations</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600">
            {formatCurrency(overdueTotalDisplay, currentCurrency)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-rose-700 font-medium font-mono tabular-nums">
              {overdueInvoices.length} invoices
            </span>
            <span aria-hidden="true">·</span>
            <span>Needs disbursement</span>
          </div>
        </div>

        {/* Metric 3: Upcoming Due (7 Days) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Due Next 7 Days</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(upcomingTotalDisplay, currentCurrency)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-slate-900 font-medium font-mono tabular-nums">
              {upcomingInvoices.length} pending
            </span>
            <span aria-hidden="true">·</span>
            <span>Scheduled flow</span>
          </div>
        </div>

        {/* Metric 4: 3-Way Match Compliance */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>3-Way Match Audit Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {matchRate}%
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span>SOX 404 Compliant</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{matchedCount}/{payableInvoices.length} POs verified</span>
          </div>
        </div>

      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AP Aging Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">AP Aging Schedule & Risk Analysis</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Invoice aging categorized by payment due date delinquency
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('invoices')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                <span>Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Aging Bar */}
            <div className="h-6 w-full rounded-md bg-slate-100 flex overflow-hidden p-0.5 gap-0.5">
              <div
                style={{ width: `${(agingBuckets.current / totalAgingUSD) * 100}%` }}
                className="bg-emerald-500 h-full rounded-xs transition-all"
                title={`Current: ${formatCurrency(convertFromUSD(agingBuckets.current, currentCurrency), currentCurrency)}`}
              />
              <div
                style={{ width: `${(agingBuckets.days30to60 / totalAgingUSD) * 100}%` }}
                className="bg-amber-400 h-full rounded-xs transition-all"
                title={`1-30 Days: ${formatCurrency(convertFromUSD(agingBuckets.days30to60, currentCurrency), currentCurrency)}`}
              />
              <div
                style={{ width: `${(agingBuckets.days61to90 / totalAgingUSD) * 100}%` }}
                className="bg-orange-500 h-full rounded-xs transition-all"
                title={`31-60 Days: ${formatCurrency(convertFromUSD(agingBuckets.days61to90, currentCurrency), currentCurrency)}`}
              />
              <div
                style={{ width: `${(agingBuckets.days90plus / totalAgingUSD) * 100}%` }}
                className="bg-rose-600 h-full rounded-xs transition-all"
                title={`60+ Days: ${formatCurrency(convertFromUSD(agingBuckets.days90plus, currentCurrency), currentCurrency)}`}
              />
            </div>

            {/* Aging Details Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Current (0-30d)</span>
                </div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums text-sm">
                  {formatCurrency(convertFromUSD(agingBuckets.current, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {Math.round((agingBuckets.current / totalAgingUSD) * 100)}% of total AP
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>1–30 Days Past</span>
                </div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums text-sm">
                  {formatCurrency(convertFromUSD(agingBuckets.days30to60, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {Math.round((agingBuckets.days30to60 / totalAgingUSD) * 100)}% of total AP
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>31–60 Days Past</span>
                </div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums text-sm">
                  {formatCurrency(convertFromUSD(agingBuckets.days61to90, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {Math.round((agingBuckets.days61to90 / totalAgingUSD) * 100)}% of total AP
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>61+ Days Past</span>
                </div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums text-sm">
                  {formatCurrency(convertFromUSD(agingBuckets.days90plus, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {Math.round((agingBuckets.days90plus / totalAgingUSD) * 100)}% of total AP
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Bar inside Aging Card */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{approvedInvoices.length} approved invoices</span> ready for immediate disbursement batch.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('daily-report')}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily Report</span>
              </button>
              <button
                onClick={onOpenIntake}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                + Process Invoice
              </button>
              {approvedInvoices.length > 0 && (
                <>
                  <button
                    onClick={onOpenBulkPay}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Allocate and split remaining amounts across supplier invoices"
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Split Allocator</span>
                  </button>
                  <button
                    onClick={onOpenBulkPay}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Disburse ({formatCurrency(approvedTotalDisplay, currentCurrency)})</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cash Flow Oversight & Working Capital (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Working Capital & Collections</h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Net position: Projected AR vs AP Obligations
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <div className="text-xs text-emerald-800 font-medium flex items-center justify-between">
                  <span>Accounts Receivable (Inflows)</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-900">
                  +{formatCurrency(arOutstandingDisplay, currentCurrency)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Client billings awaiting settlement
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100">
                <div className="text-xs text-rose-800 font-medium flex items-center justify-between">
                  <span>Accounts Payable (Outflows)</span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-rose-900">
                  -{formatCurrency(outstandingAP_Display, currentCurrency)}
                </div>
                <div className="text-[11px] text-rose-700 mt-0.5">
                  Vendor commitments in ledger
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-600 font-medium">Net Working Capital Variance</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  {formatCurrency(arOutstandingDisplay - outstandingAP_Display, currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Maintains healthy liquidity ratio
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('reminders')}
            className="w-full mt-4 py-2 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Manage Payment Follow-ups</span>
          </button>
        </div>

      </div>

      {/* Spend Distribution & Real-Time Treasury Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Spend by Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Vendor Spend Distribution</h3>
              <div className="text-xs text-slate-500 mt-0.5">
                AP volume segmented by operational business function
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(categorySpend).map(([cat, amountUSD]) => {
              const displayVal = convertFromUSD(amountUSD, currentCurrency);
              const totalVal = convertFromUSD(outstandingAP_USD + 50000, currentCurrency);
              const pct = Math.min(100, Math.round((displayVal / totalVal) * 100));

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="font-mono text-slate-900 tabular-nums font-semibold">
                      {formatCurrency(displayVal, currentCurrency)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-slate-800 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-Time Transaction & Treasury Feed */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Real-Time Treasury Activity Stream</h3>
              <div className="text-xs text-slate-500 mt-0.5">
                Audit events, payments, and approvals logged live
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {topActivities.map((act, idx) => (
              <div
                key={idx}
                onClick={() => onSelectInvoice(act.id)}
                className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50 cursor-pointer rounded-md px-1 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{act.invoiceNum}</span>
                    <span className="text-slate-400 font-normal">·</span>
                    <span className="text-slate-600 font-normal">{act.text}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Logged by <span className="text-slate-600 font-medium">{act.role}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  {act.timestamp.slice(11, 16) || act.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

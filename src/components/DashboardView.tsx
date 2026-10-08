import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice, PaymentMethod } from '../types/finance';
import { formatCurrency, convertFromUSD, convertToUSD, EXCHANGE_RATES } from '../utils/currency';
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
  Plus,
  Store,
  Wallet,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  Banknote,
  BookOpen,
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
  const { invoices, vendors, currentCurrency, appMode, dailyPayments } = useFinance();
  const isSimple = appMode === 'simple';

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

  // Total Paid to Suppliers
  const totalPaid_USD = payableInvoices.reduce(
    (sum, i) => sum + convertToUSD(i.amountPaid || 0, i.currency),
    0
  );
  const totalPaid_Display = convertFromUSD(totalPaid_USD, currentCurrency);

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

  // Status counts
  const unpaidCount = payableInvoices.filter((i) => i.status !== 'paid' && i.status !== 'rejected').length;
  const paidCount = payableInvoices.filter((i) => i.status === 'paid').length;
  const partialCount = payableInvoices.filter((i) => i.status === 'partially_paid').length;

  // Vendors with open balances
  const vendorsWithOwedBalances = vendors
    .map((v) => {
      const vInvoices = payableInvoices.filter((i) => i.vendorId === v.id || i.vendorName === v.name);
      const openUSD = vInvoices
        .filter((i) => i.status !== 'paid' && i.status !== 'rejected')
        .reduce((sum, i) => sum + getOpenUSD(i), 0);
      const openDisplay = convertFromUSD(openUSD, currentCurrency);
      const totalSpendUSD = vInvoices.reduce((sum, i) => sum + convertToUSD(i.totalAmount, i.currency), 0);
      const totalSpendDisplay = convertFromUSD(totalSpendUSD, currentCurrency);
      return {
        ...v,
        openUSD,
        openDisplay,
        totalSpendDisplay,
        openCount: vInvoices.filter((i) => i.status !== 'paid' && i.status !== 'rejected').length,
      };
    })
    .filter((v) => v.openUSD > 0)
    .sort((a, b) => b.openUSD - a.openUSD);

  // Recent 6 bills
  const recentBills = [...payableInvoices]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 6);

  // Payment methods breakdown (combining invoice payments and daily payments)
  const paymentMethodTotals: Record<string, number> = {
    aba_pay: 0,
    khqr: 0,
    acleda: 0,
    cash: 0,
    wing: 0,
    bank_transfer: 0,
  };

  payableInvoices.forEach((inv) => {
    if (inv.partialPayments) {
      inv.partialPayments.forEach((p) => {
        const m = p.paymentMethod || 'cash';
        paymentMethodTotals[m] = (paymentMethodTotals[m] || 0) + convertToUSD(p.amount, inv.currency);
      });
    }
  });

  dailyPayments.forEach((dp) => {
    const m = (dp.paymentMethod as string) || 'cash';
    paymentMethodTotals[m] = (paymentMethodTotals[m] || 0) + (dp.amount || 0);
  });

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

  // Simple Mode Layout for Small Business
  if (isSimple) {
    return (
      <div className="space-y-6">
        
        {/* Small Business Welcome & Quick Action Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full flex items-center gap-1">
                <Store className="w-3 h-3" />
                <span>Simple Accounting Mode</span>
              </span>
              <span className="text-xs text-indigo-200">KY Store · Phnom Penh</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Small Business Payables & Cash Ledger</h1>
            <p className="text-xs text-indigo-200 max-w-xl">
              Track supplier bills, record payments in USD & KHR, manage vendor balances, and keep daily cashbook accurate.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenIntake}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Bill / Expense</span>
            </button>
            <button
              onClick={onOpenBulkPay}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4 text-indigo-200" />
              <span>Pay Bills</span>
            </button>
            <button
              onClick={() => onNavigateTab('daily-report')}
              className="px-3.5 py-2 text-xs font-medium text-indigo-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Daily Book</span>
            </button>
          </div>
        </div>

        {/* Overdue Alert Banner if any */}
        {overdueInvoices.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-md text-amber-800 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">
                  {overdueInvoices.length} Overdue {overdueInvoices.length === 1 ? 'Bill' : 'Bills'} ({formatCurrency(overdueTotalDisplay, currentCurrency)})
                </h3>
                <p className="text-xs text-amber-700">These bills have passed their due date and need prompt payment.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('invoices', 'overdue')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-md transition-colors"
              >
                View & Pay Overdue
              </button>
            </div>
          </div>
        )}

        {/* 4 Simple Business KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: What We Owe */}
          <div
            onClick={() => onNavigateTab('invoices', 'unpaid')}
            className="bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-4 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Money We Owe (Unpaid)</span>
              <Wallet className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {formatCurrency(outstandingAP_Display, currentCurrency)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-semibold text-rose-700">{unpaidCount} bills to pay</span>
              <span className="text-[11px] font-mono text-slate-400">
                {currentCurrency === 'USD' ? `≈ ${formatCurrency(outstandingAP_USD * 4065, 'KHR')}` : `≈ ${formatCurrency(outstandingAP_USD, 'USD')}`}
              </span>
            </div>
          </div>

          {/* Card 2: Due in Next 7 Days */}
          <div
            onClick={() => onNavigateTab('invoices', 'due_soon')}
            className="bg-white border border-slate-200 hover:border-amber-300 rounded-lg p-4 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Due This Week</span>
              <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {formatCurrency(upcomingTotalDisplay, currentCurrency)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-medium text-amber-800">{upcomingInvoices.length} bills due soon</span>
              <span className="text-[11px] text-slate-400">Upcoming cashout</span>
            </div>
          </div>

          {/* Card 3: Total Paid */}
          <div
            onClick={() => onNavigateTab('invoices', 'paid')}
            className="bg-white border border-slate-200 hover:border-emerald-300 rounded-lg p-4 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Paid to Suppliers</span>
              <CheckCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {formatCurrency(totalPaid_Display, currentCurrency)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-medium text-emerald-800">{paidCount} bills settled</span>
              <span className="text-[11px] text-slate-400">Fully cleared</span>
            </div>
          </div>

          {/* Card 4: Active Suppliers */}
          <div
            onClick={() => onNavigateTab('vendors')}
            className="bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-4 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Suppliers with Balance</span>
              <Users className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {vendorsWithOwedBalances.length}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="text-slate-600 font-medium">{vendors.length} total vendors</span>
              <span className="text-indigo-600 font-semibold group-hover:underline">View All →</span>
            </div>
          </div>

        </div>

        {/* 2-Column Simple Overview: Suppliers Owed & Recent Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Col 1 & 2: Top Suppliers Owed & Recent Bills */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Top Suppliers Owed Box */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Suppliers We Owe Money To</span>
                  </h2>
                  <p className="text-xs text-slate-500">Sorted by highest balance owed</p>
                </div>
                <button
                  onClick={() => onNavigateTab('vendors')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>All Suppliers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {vendorsWithOwedBalances.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-md transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                        <span>{v.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                          {v.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{v.openCount} open {v.openCount === 1 ? 'bill' : 'bills'}</span>
                        <span aria-hidden="true">·</span>
                        <span>Terms: {v.defaultPaymentTerms}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-rose-600 tabular-nums">
                          {formatCurrency(v.openDisplay, currentCurrency)}
                        </div>
                        <div className="text-[10px] text-slate-400">Balance Owed</div>
                      </div>
                      <button
                        onClick={() => {
                          onOpenBulkPay();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bills Tracker */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Recent Bills & Invoices</span>
                  </h2>
                  <p className="text-xs text-slate-500">Latest bills recorded in the system</p>
                </div>
                <button
                  onClick={() => onNavigateTab('invoices')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>View Full List</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Bill #</th>
                      <th className="py-2 px-2.5">Supplier</th>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5 text-right">Total</th>
                      <th className="py-2 px-2.5 text-right">Owed</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {recentBills.map((inv) => {
                      const openVal = inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.amountPaid || 0));
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => onSelectInvoice(inv.id)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-2.5 text-slate-800">{inv.vendorName}</td>
                          <td className="py-2.5 px-2.5 text-slate-500 font-mono">{inv.issueDate}</td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-slate-700">
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-600">
                            {openVal > 0 ? formatCurrency(openVal, inv.currency) : '-'}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            {inv.status === 'paid' && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                Paid
                              </span>
                            )}
                            {inv.status === 'partially_paid' && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                Partial
                              </span>
                            )}
                            {inv.status === 'overdue' && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                                Overdue
                              </span>
                            )}
                            {inv.status !== 'paid' && inv.status !== 'partially_paid' && inv.status !== 'overdue' && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                                Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Col 3: Payment Channels & Daily Register Shortcuts */}
          <div className="space-y-6">
            
            {/* Payment Methods Used (Cash, ABA, KHQR, ACLEDA, etc.) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Payment Methods Used</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">Settlement distribution across channels</p>

              <div className="space-y-3">
                {[
                  { key: 'aba_pay', label: 'ABA Pay / KHQR', icon: '📱', color: 'bg-cyan-500' },
                  { key: 'khqr', label: 'Bakong / KHQR', icon: '🇰🇭', color: 'bg-red-500' },
                  { key: 'acleda', label: 'ACLEDA Mobile', icon: '🏦', color: 'bg-blue-600' },
                  { key: 'cash', label: 'Cash (USD / ៛)', icon: '💵', color: 'bg-emerald-500' },
                  { key: 'wing', label: 'Wing Bank', icon: '🟢', color: 'bg-lime-500' },
                  { key: 'bank_transfer', label: 'Bank Transfer', icon: '🏛️', color: 'bg-slate-700' },
                ].map((item) => {
                  const valUSD = paymentMethodTotals[item.key] || 0;
                  const valDisplay = convertFromUSD(valUSD, currentCurrency);
                  const totalPaidOr1 = totalPaid_USD || 1;
                  const pct = Math.min(100, Math.round((valUSD / totalPaidOr1) * 100));

                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(valDisplay, currentCurrency)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(4, pct)}%` }}
                          className={`h-full ${item.color} rounded-full transition-all`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onNavigateTab('daily-report')}
                  className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Daily Cashbook Ledger</span>
                </button>
              </div>
            </div>

            {/* Simple Accounting Quick Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Simple AP Rules for Shop
              </h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">1.</span>
                  <span><strong>Enter Bill:</strong> Tap "+ Add Bill" when inventory arrives from a supplier.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">2.</span>
                  <span><strong>Record Payment:</strong> Pay immediately or partially in USD or KHR via ABA, Cash, or ACLEDA.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">3.</span>
                  <span><strong>Daily Report:</strong> Check Daily Cashbook at end of day to balance payments.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // Advanced Mode Layout (Corporate & Multi-Role)
  return (
    <div className="space-y-6">
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

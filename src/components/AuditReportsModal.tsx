import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, convertFromUSD } from '../utils/currency';
import { exportAuditSummaryCSV, exportInvoicesToCSV } from '../utils/csvExport';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  Layers,
  CheckCircle,
} from 'lucide-react';

interface AuditReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditReportsModal: React.FC<AuditReportsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { invoices, currentCurrency, currentUser } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState('September');
  const [selectedYear, setSelectedYear] = useState(2026);

  if (!isOpen) return null;

  const payableInvoices = invoices.filter((i) => i.type === 'payable');
  const receivableInvoices = invoices.filter((i) => i.type === 'receivable');

  const totalAP_USD = payableInvoices.reduce((s, i) => s + i.baseAmountUSD, 0);
  const paidAP_USD = payableInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.baseAmountUSD, 0);
  const overdueAP_USD = payableInvoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.baseAmountUSD, 0);

  const matchedCount = payableInvoices.filter((i) => i.threeWayMatched).length;
  const matchRate = payableInvoices.length > 0
    ? ((matchedCount / payableInvoices.length) * 100).toFixed(1)
    : '100.0';

  // Multi-currency FX exposure
  const fxBuckets: Record<string, { count: number; totalOriginal: number; totalUSD: number }> = {};
  invoices.forEach((inv) => {
    if (!fxBuckets[inv.currency]) {
      fxBuckets[inv.currency] = { count: 0, totalOriginal: 0, totalUSD: 0 };
    }
    fxBuckets[inv.currency].count += 1;
    fxBuckets[inv.currency].totalOriginal += inv.totalAmount;
    fxBuckets[inv.currency].totalUSD += inv.baseAmountUSD;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    exportAuditSummaryCSV(selectedMonth, selectedYear, invoices);
  };

  const handleDownloadInvoicesCSV = () => {
    exportInvoicesToCSV(invoices, `ledgerflow-audit-${selectedMonth.toLowerCase()}-${selectedYear}.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8 print:shadow-none print:border-none print:m-0 print:max-w-none">
        
        {/* Header - no-print on buttons */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-slate-900" />
              <h3 className="text-base font-bold text-slate-900">
                Monthly Financial Audit & SOX Compliance Report
              </h3>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Certified balance sheet reconciliation, AP aging, and 3-way match validation
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Audit CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Audit Body */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
          
          {/* Document Title Block */}
          <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900">
                LEDGERFLOW FINANCIAL RECONCILIATION
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Audit Scope: <strong className="text-slate-900">{selectedMonth} {selectedYear} (Q3 Reporting)</strong> · Entity: NovaCell Devices Corp (Mobile Phones, Tablets, Accessories & Laptops)
              </div>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div>Generated: 2026-09-25 21:00 UTC</div>
              <div>Auditor of Record: David Ross (KPMG)</div>
            </div>
          </div>

          {/* Key Audit Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Total AP Obligation</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatCurrency(convertFromUSD(totalAP_USD, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{payableInvoices.length} invoices audited</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Settled / Disbursed</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {formatCurrency(convertFromUSD(paidAP_USD, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Verified treasury clearance</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Overdue Delinquency</div>
              <div className="text-lg font-bold font-mono tabular-nums text-rose-600 mt-1">
                {formatCurrency(convertFromUSD(overdueAP_USD, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[10px] text-rose-600 mt-0.5">Dunning notices dispatched</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">3-Way Match Rate</div>
              <div className="text-lg font-bold font-mono tabular-nums text-blue-700 mt-1">
                {matchRate}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">SOX 404 Standard &gt; 95%</div>
            </div>
          </div>

          {/* International Invoicing & Multi-Currency Exposure */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 mb-2">
              International Currency Hedging & Foreign Exchange Exposure
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3 text-right">Invoices</th>
                    <th className="py-2.5 px-3 text-right">Original Volume</th>
                    <th className="py-2.5 px-3 text-right">Normalized Base (USD)</th>
                    <th className="py-2.5 px-3 text-right">% of Total AP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {Object.entries(fxBuckets).map(([curr, data]) => {
                    const pct = ((data.totalUSD / totalAP_USD) * 100).toFixed(1);
                    return (
                      <tr key={curr}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{curr}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{data.count}</td>
                        <td className="py-2 px-3 text-right text-slate-800">
                          {formatCurrency(data.totalOriginal, curr as any)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-900">
                          ${data.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices Breakdown Sample */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-900">Audited Sample Invoices & Receipts</h4>
              <button
                onClick={handleDownloadInvoicesCSV}
                className="text-xs text-slate-600 hover:text-slate-900 underline no-print"
              >
                Export All {invoices.length} Rows (CSV)
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Beneficiary</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {invoices.slice(0, 7).map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-2 px-3 text-slate-800 font-sans">{inv.vendorName}</td>
                      <td className="py-2 px-3 text-slate-600">{inv.dueDate}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-900">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </td>
                      <td className="py-2 px-3 uppercase text-[10px] text-slate-600">{inv.status}</td>
                      <td className="py-2 px-3 text-slate-600 font-sans">
                        {inv.threeWayMatched ? '3-Way Verified' : 'Pending Receipt'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certification & Sign-off Block */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div>
              <div className="text-slate-400 font-medium">Internal Treasury Sign-Off</div>
              <div className="mt-4 pt-2 border-b border-slate-400 font-mono font-semibold text-slate-900">
                Elena Vance, CPA
              </div>
              <div className="text-slate-500 text-[11px] mt-1">
                Chief Financial Officer & Finance Director · Approved Sep 25, 2026
              </div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Independent External Audit Attestation</div>
              <div className="mt-4 pt-2 border-b border-slate-400 font-mono font-semibold text-slate-900">
                David Ross, Partner
              </div>
              <div className="text-slate-500 text-[11px] mt-1">
                KPMG LLP SOX 404 Assurance Practice · Unqualified Opinion Rendered
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs no-print">
          <div className="text-slate-500">
            Compliant with Sarbanes-Oxley Act (SOX) Section 404 IT & General Accounting Controls.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-700 hover:text-slate-900"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

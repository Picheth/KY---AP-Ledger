import { Invoice, Vendor } from '../types/finance';
import { formatCurrency } from './currency';

/**
 * Escapes fields for standard RFC 4180 CSV compliance
 */
function escapeCSVCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

/**
 * Triggers a real browser CSV file download
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports invoices to comprehensive audit CSV
 */
export function exportInvoicesToCSV(invoices: Invoice[], filename = 'ledgerflow-ap-invoices.csv'): void {
  const headers = [
    'Invoice Number',
    'Type',
    'Vendor / Customer',
    'Category',
    'PO Number',
    'Issue Date',
    'Due Date',
    'Status',
    'Original Amount',
    'Settled Amount',
    'Remaining Balance',
    'Currency',
    'Normalized USD Amount',
    'Department',
    'Payment Terms',
    '3-Way Matched',
    'Payment Method',
    'Payment Reference',
    'Paid Timestamp',
    'Reminders Sent',
  ];

  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.type === 'payable' ? 'Accounts Payable' : 'Accounts Receivable',
    inv.vendorName,
    inv.vendorCategory,
    inv.poNumber || 'N/A',
    inv.issueDate,
    inv.dueDate,
    inv.status.toUpperCase(),
    inv.totalAmount.toFixed(2),
    (inv.amountPaid || 0).toFixed(2),
    (inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.amountPaid || 0)).toFixed(2),
    inv.currency,
    inv.baseAmountUSD.toFixed(2),
    inv.department,
    inv.paymentTerms,
    inv.threeWayMatched ? 'VERIFIED' : 'PENDING_MATCH',
    inv.paymentMethod || 'UNSPECIFIED',
    inv.paymentReference || 'N/A',
    inv.paidAt || 'N/A',
    inv.remindersSentCount,
  ]);

  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...rows.map((row) => row.map(escapeCSVCell).join(',')),
  ].join('\r\n');

  downloadCSV(filename, csvContent);
}

/**
 * Exports Monthly Financial Audit Ledger summary
 */
export function exportAuditSummaryCSV(
  monthName: string,
  year: number,
  invoices: Invoice[]
): void {
  const headers = ['Financial Metric', 'Value', 'Notes / Compliance'];
  
  const totalPayableUSD = invoices
    .filter((i) => i.type === 'payable')
    .reduce((sum, i) => sum + i.baseAmountUSD, 0);

  const totalPaidUSD = invoices
    .filter((i) => i.type === 'payable' && i.status === 'paid')
    .reduce((sum, i) => sum + i.baseAmountUSD, 0);

  const overdueUSD = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + i.baseAmountUSD, 0);

  const matchedCount = invoices.filter((i) => i.threeWayMatched).length;
  const matchRate = invoices.length > 0 ? ((matchedCount / invoices.length) * 100).toFixed(1) : '100';

  const rows = [
    ['Audit Period', `${monthName} ${year}`, 'Monthly Reconciliation Scope'],
    ['Total Accounts Payable', formatCurrency(totalPayableUSD, 'USD'), 'All invoices in ledger'],
    ['Settled / Paid AP', formatCurrency(totalPaidUSD, 'USD'), 'Disbursed via Treasury'],
    ['Overdue Obligations', formatCurrency(overdueUSD, 'USD'), 'Requires urgent collection follow-up'],
    ['3-Way Match Compliance', `${matchRate}%`, 'SOX Compliance Standard (PO, Receipt, Invoice)'],
    ['Total Invoice Count', invoices.length.toString(), 'Audit sample size'],
  ];

  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...rows.map((row) => row.map(escapeCSVCell).join(',')),
  ].join('\r\n');

  downloadCSV(`financial-audit-${monthName.toLowerCase()}-${year}.csv`, csvContent);
}

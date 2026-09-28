import { Invoice, Vendor } from '../types/finance';

export interface RawInvoiceRow {
  dateStr: string; // e.g. "02-Aug-2026"
  supplier: string;
  invoice: string;
  amountDue: number;
  totalPaid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export const RAW_INVOICE_ROWS: RawInvoiceRow[] = [
  { dateStr: '02-Aug-2026', supplier: 'S9 Falcon', invoice: 'S9-009', amountDue: 100000.0, totalPaid: 0.0, balance: 100000.0, status: 'Unpaid' },
  { dateStr: '02-Aug-2026', supplier: 'S5 DN', invoice: 'DN-007', amountDue: 100000.0, totalPaid: 0.0, balance: 100000.0, status: 'Unpaid' },
  { dateStr: '03-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-000995', amountDue: 252.0, totalPaid: 252.0, balance: 0.0, status: 'Paid' },
  { dateStr: '03-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260803', amountDue: 101920.0, totalPaid: 101920.0, balance: 0.0, status: 'Paid' },
  { dateStr: '04-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001002', amountDue: 800.0, totalPaid: 800.0, balance: 0.0, status: 'Paid' },
  { dateStr: '07-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260807', amountDue: 47000.0, totalPaid: 47000.0, balance: 0.0, status: 'Paid' },
  { dateStr: '08-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260808', amountDue: 60000.0, totalPaid: 60000.0, balance: 0.0, status: 'Paid' },
  { dateStr: '09-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260809-1', amountDue: 108015.0, totalPaid: 108015.0, balance: 0.0, status: 'Paid' },
  { dateStr: '09-Aug-2026', supplier: 'S18 SV', invoice: 'SV-012299', amountDue: 272258.0, totalPaid: 206189.0, balance: 66069.0, status: 'Partial' },
  { dateStr: '09-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260809', amountDue: 96255.0, totalPaid: 96255.0, balance: 0.0, status: 'Paid' },
  { dateStr: '11-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001046', amountDue: 2070.0, totalPaid: 2070.0, balance: 0.0, status: 'Paid' },
  { dateStr: '12-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260812', amountDue: 187230.0, totalPaid: 187230.0, balance: 0.0, status: 'Paid' },
  { dateStr: '14-Aug-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11375', amountDue: 64165.0, totalPaid: 64165.0, balance: 0.0, status: 'Paid' },
  { dateStr: '14-Aug-2026', supplier: 'S3 PLP', invoice: 'PLP-011376', amountDue: 315290.0, totalPaid: 315290.0, balance: 0.0, status: 'Paid' },
  { dateStr: '14-Aug-2026', supplier: 'S18 SV', invoice: 'SV-012237', amountDue: 407450.0, totalPaid: 0.0, balance: 407450.0, status: 'Unpaid' },
  { dateStr: '14-Aug-2026', supplier: 'S3 PLP', invoice: 'PLP-011377', amountDue: 254215.0, totalPaid: 63315.0, balance: 190900.0, status: 'Partial' },
  { dateStr: '14-Aug-2026', supplier: 'S3 PLP', invoice: 'PLP-011378', amountDue: 228160.0, totalPaid: 0.0, balance: 228160.0, status: 'Unpaid' },
  { dateStr: '15-Aug-2026', supplier: 'S18 SV', invoice: 'SV-012745', amountDue: 162250.0, totalPaid: 0.0, balance: 162250.0, status: 'Unpaid' },
  { dateStr: '15-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001071', amountDue: 503.0, totalPaid: 503.0, balance: 0.0, status: 'Paid' },
  { dateStr: '15-Aug-2026', supplier: 'S18 SV', invoice: 'SV-012746', amountDue: 380085.0, totalPaid: 0.0, balance: 380085.0, status: 'Unpaid' },
  { dateStr: '20-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260820', amountDue: 18750.0, totalPaid: 18750.0, balance: 0.0, status: 'Paid' },
  { dateStr: '20-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001110', amountDue: 895.0, totalPaid: 895.0, balance: 0.0, status: 'Paid' },
  { dateStr: '23-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260823i', amountDue: 24540.0, totalPaid: 24540.0, balance: 0.0, status: 'Paid' },
  { dateStr: '23-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260823', amountDue: 60670.0, totalPaid: 60670.0, balance: 0.0, status: 'Paid' },
  { dateStr: '23-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001122', amountDue: 2400.0, totalPaid: 2400.0, balance: 0.0, status: 'Paid' },
  { dateStr: '24-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260824', amountDue: 110340.0, totalPaid: 110340.0, balance: 0.0, status: 'Paid' },
  { dateStr: '25-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001134', amountDue: 1158.0, totalPaid: 1158.0, balance: 0.0, status: 'Paid' },
  { dateStr: '25-Aug-2026', supplier: 'S3 PLP', invoice: 'PLP-011381', amountDue: 116215.0, totalPaid: 0.0, balance: 116215.0, status: 'Unpaid' },
  { dateStr: '25-Aug-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11380', amountDue: 17190.0, totalPaid: 0.0, balance: 17190.0, status: 'Unpaid' },
  { dateStr: '25-Aug-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11379', amountDue: 139303.0, totalPaid: 100763.0, balance: 38540.0, status: 'Partial' },
  { dateStr: '25-Aug-2026', supplier: 'S3 PLP', invoice: 'PLP-01182', amountDue: 312269.0, totalPaid: 0.0, balance: 312269.0, status: 'Unpaid' },
  { dateStr: '28-Aug-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001155', amountDue: 1140.0, totalPaid: 1140.0, balance: 0.0, status: 'Paid' },
  { dateStr: '28-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260828', amountDue: 172920.0, totalPaid: 49010.0, balance: 123910.0, status: 'Partial' },
  { dateStr: '29-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260829', amountDue: 245000.0, totalPaid: 0.0, balance: 245000.0, status: 'Unpaid' },
  { dateStr: '30-Aug-2026', supplier: 'S4 LH', invoice: 'S4-20260830', amountDue: 129000.0, totalPaid: 0.0, balance: 129000.0, status: 'Unpaid' },
  { dateStr: '01-Sept-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001175', amountDue: 1810.0, totalPaid: 1810.0, balance: 0.0, status: 'Paid' },
  { dateStr: '02-Sept-2026', supplier: 'S4 LH', invoice: 'S4-20260902', amountDue: 318150.0, totalPaid: 0.0, balance: 318150.0, status: 'Unpaid' },
  { dateStr: '03-Sept-2026', supplier: 'S3 PLP', invoice: 'PLP-011383', amountDue: 227562.0, totalPaid: 0.0, balance: 227562.0, status: 'Unpaid' },
  { dateStr: '05-Sept-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001201', amountDue: 176.0, totalPaid: 176.0, balance: 0.0, status: 'Paid' },
  { dateStr: '07-Sept-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001256', amountDue: 1560.0, totalPaid: 1560.0, balance: 0.0, status: 'Paid' },
  { dateStr: '09-Sept-2026', supplier: 'S4 LH', invoice: 'S4-20260909', amountDue: 321942.0, totalPaid: 0.0, balance: 321942.0, status: 'Unpaid' },
  { dateStr: '09-Sept-2026', supplier: 'DN ច្បារអំពៅ', invoice: 'DN-001225', amountDue: 557.0, totalPaid: 557.0, balance: 0.0, status: 'Paid' },
  { dateStr: '12-Sept-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11397', amountDue: 30145.0, totalPaid: 0.0, balance: 30145.0, status: 'Unpaid' },
  { dateStr: '13-Sept-2026', supplier: 'S4 LH', invoice: 'S4-20260913', amountDue: 203810.0, totalPaid: 0.0, balance: 203810.0, status: 'Unpaid' },
  { dateStr: '18-Sept-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11400', amountDue: 87400.0, totalPaid: 0.0, balance: 87400.0, status: 'Unpaid' },
  { dateStr: '19-Sept-2026', supplier: 'S3 PLP', invoice: 'PLP-11402', amountDue: 245815.0, totalPaid: 0.0, balance: 245815.0, status: 'Unpaid' },
  { dateStr: '19-Sept-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11404', amountDue: 116490.0, totalPaid: 0.0, balance: 116490.0, status: 'Unpaid' },
  { dateStr: '20-Sept-2026', supplier: 'S18 SV', invoice: 'SV-015862', amountDue: 19700.0, totalPaid: 19700.0, balance: 0.0, status: 'Paid' },
  { dateStr: '21-Sept-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11408', amountDue: 176140.0, totalPaid: 0.0, balance: 176140.0, status: 'Unpaid' },
  { dateStr: '24-Sept-2026', supplier: 'S3 PLP-NEW', invoice: 'PLN-11411', amountDue: 58245.0, totalPaid: 0.0, balance: 58245.0, status: 'Unpaid' },
  { dateStr: '26-Sept-2026', supplier: 'S4 LH', invoice: 'S4-20260926', amountDue: 9375.0, totalPaid: 0.0, balance: 9375.0, status: 'Unpaid' },
];

const MONTH_MAP: Record<string, string> = {
  Aug: '08',
  Sept: '09',
  Sep: '09',
  Jul: '07',
  Oct: '10',
};

export function parseCustomDate(str: string): string {
  // Format: "02-Aug-2026" or "01-Sept-2026"
  const parts = str.split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = MONTH_MAP[parts[1]] || '08';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return str;
}

export function buildInvoicesFromRaw(rows: RawInvoiceRow[], vendorsMap: Record<string, Vendor>): Invoice[] {
  const today = '2026-09-28';

  return rows.map((r, idx) => {
    const issueDate = parseCustomDate(r.dateStr);
    const issueTime = new Date(issueDate).getTime();
    // Default payment terms: 15 days or 30 days
    const termsDays = r.supplier.includes('DN') ? 15 : 30;
    const dueTime = new Date(issueTime + termsDays * 24 * 60 * 60 * 1000);
    const dueDate = dueTime.toISOString().slice(0, 10);

    const vendor = vendorsMap[r.supplier] || {
      id: `vnd_${idx}`,
      name: r.supplier,
      category: 'Electronics & Accessories',
    };

    let status: Invoice['status'] = 'approved';
    if (r.balance === 0) {
      status = 'paid';
    } else if (r.totalPaid > 0) {
      status = 'partially_paid';
    } else if (dueDate < today) {
      status = 'overdue';
    } else {
      status = 'approved';
    }

    const partialPayments = [];
    if (r.totalPaid > 0) {
      partialPayments.push({
        id: `pay_${idx}_1`,
        amount: r.totalPaid,
        amountUSD: r.totalPaid,
        paymentDate: `${issueDate} 15:00`,
        paymentMethod: 'aba_pay' as const,
        reference: `ABA-${r.invoice.replace(/[^a-zA-Z0-9]/g, '')}-P1`,
        notes: r.balance === 0 ? 'Full invoice settlement via ABA Bank' : 'Partial payment installment via ABA Bank',
        recordedBy: 'Sreymom Chan (AP Cashier)',
        remainingBalanceAfter: r.balance,
      });
    }

    return {
      id: `inv_usr_${idx + 1}`,
      invoiceNumber: r.invoice,
      type: 'payable',
      poNumber: `PO-2026-${r.invoice}`,
      vendorId: vendor.id,
      vendorName: r.supplier,
      vendorCategory: vendor.category,
      issueDate,
      dueDate,
      currency: 'USD',
      subtotal: r.amountDue,
      taxAmount: 0,
      totalAmount: r.amountDue,
      baseAmountUSD: r.amountDue,
      amountPaid: r.totalPaid,
      remainingBalance: r.balance,
      status,
      paymentTerms: `Net ${termsDays}`,
      department: vendor.category.includes('Accessories') ? 'Accessories & Peripherals' : 'Mobile Phone Operations',
      assignedApproverRole: r.amountDue > 100000 ? 'cfo' : 'dept_manager',
      threeWayMatched: true,
      remindersSentCount: status === 'overdue' ? 2 : 0,
      lastReminderDate: status === 'overdue' ? '2026-09-25' : undefined,
      paidAt: status === 'paid' ? `${issueDate} 15:00` : undefined,
      paymentMethod: status === 'paid' ? 'aba_pay' : undefined,
      paymentReference: status === 'paid' ? `ABA-${r.invoice.replace(/[^a-zA-Z0-9]/g, '')}` : undefined,
      notes: `${r.supplier} invoice ${r.invoice} (${r.status}) - ${vendor.category}`,
      lineItems: [
        {
          id: `li_${idx}_1`,
          description: `${vendor.category} lot per delivery slip ${r.invoice}`,
          quantity: 1,
          unitPrice: r.amountDue,
          taxRate: 0,
          totalAmount: r.amountDue,
        },
      ],
      partialPayments,
      auditHistory: [
        {
          id: `ah_${idx}_1`,
          timestamp: `${issueDate} 09:30`,
          userName: 'Sreymom Chan',
          role: 'ap_specialist',
          action: `Invoice ${r.invoice} registered into ledger`,
        },
      ],
    };
  });
}

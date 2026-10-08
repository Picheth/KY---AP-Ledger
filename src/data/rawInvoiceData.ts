import { Invoice, Vendor } from '../types/finance';
import { toPhnomPenhDate } from '../utils/datetime';

export interface RawInvoiceRow {
  dateStr: string; // e.g. "02-Aug-2026"
  supplier: string;
  invoice: string;
  amountDue: number;
  totalPaid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

// No seed data — all invoices must be entered manually by the user.
export const RAW_INVOICE_ROWS: RawInvoiceRow[] = [];

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
    const dueDate = toPhnomPenhDate(dueTime);

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

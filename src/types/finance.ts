export type CurrencyCode = 'USD' | 'KHR';

export interface ExchangeRate {
  code: CurrencyCode;
  name: string;
  symbol: string;
  rateAgainstUSD: number; // e.g. 1 USD = 4,065 KHR
}

export type UserRole = 'cfo' | 'ap_specialist' | 'dept_manager' | 'auditor';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  email: string;
  approvalLimitUSD: number; // max amount this role can approve
  avatarUrl: string;
}

export type InvoiceType = 'payable' | 'receivable';

export type InvoiceStatus =
  | 'pending_approval'
  | 'approved'
  | 'in_review'
  | 'rejected'
  | 'scheduled'
  | 'partially_paid'
  | 'paid'
  | 'overdue';

export type PaymentMethod =
  | 'aba_pay'
  | 'khqr'
  | 'acleda'
  | 'wing'
  | 'cash'
  | 'bank_transfer'
  | 'swift'
  | 'ach'
  | 'wire'
  | 'sepa'
  | 'virtual_card'
  | 'check';

export interface PartialPaymentRecord {
  id: string;
  amount: number; // in invoice currency
  amountUSD: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string;
  notes?: string;
  recordedBy: string;
  remainingBalanceAfter: number;
}

export interface StandalonePaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  reference: string;
  notes?: string;
}

export interface DailyReportRow {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  totalPurchase: number;
  totalPayment: number;
  invoicesCount: number;
  paymentsCount: number;
  invoices?: Invoice[];
  payments?: { amount: number; reference: string; notes?: string }[];
}

export interface SettlementAllocationItem {
  invoiceId: string;
  invoiceNumber: string;
  vendorName: string;
  currency: CurrencyCode;
  totalAmount: number;
  previousBalance: number;
  allocatedAmount: number;
  remainingBalance: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalAmount: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  role: UserRole;
  action: string;
  note?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  poNumber?: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  baseAmountUSD: number; // normalized to USD for aggregated reporting
  amountPaid: number; // settled amount in invoice currency
  remainingBalance: number; // outstanding amount in invoice currency
  status: InvoiceStatus;
  paymentTerms: string; // e.g. "Net 30", "Net 15", "Due on receipt"
  department: string;
  assignedApproverRole: UserRole;
  threeWayMatched: boolean; // PO, Goods Receipt, and Invoice matched
  lineItems: InvoiceLineItem[];
  auditHistory: AuditLogEntry[];
  partialPayments?: PartialPaymentRecord[];
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paidAt?: string;
  remindersSentCount: number;
  lastReminderDate?: string;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  taxId: string; // EIN / VAT
  email: string;
  phone: string;
  address: string;
  bankName: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  defaultPaymentMethod: PaymentMethod;
  defaultPaymentTerms: string;
  rating: number; // 1 to 5
  status: 'active' | 'preferred' | 'on_hold' | 'under_review';
  totalSpendUSD: number;
  openInvoicesCount: number;
  contactPerson: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'urgent_due' | 'approval_required' | 'payment_executed' | 'reminder_dispatched';
  invoiceId?: string;
  read: boolean;
}

export interface EmailReminderTemplate {
  id: string;
  name: string;
  subject: string;
  type: 'upcoming_due' | 'past_due_mild' | 'past_due_urgent' | 'remittance_advice';
  bodyTemplate: string;
}

export interface PaymentBatch {
  id: string;
  batchNumber: string;
  createdAt: string;
  totalAmountUSD: number;
  invoiceCount: number;
  paymentMethod: PaymentMethod;
  cashbackEarnedUSD: number; // for virtual cards
  status: 'processing' | 'settled';
  invoices: Invoice[];
}

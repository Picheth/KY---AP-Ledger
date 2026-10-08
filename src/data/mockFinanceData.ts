import { Invoice, Vendor, UserProfile, NotificationItem, EmailReminderTemplate } from '../types/finance';
import { RAW_INVOICE_ROWS, buildInvoicesFromRaw } from './rawInvoiceData';

export const USER_PROFILES: UserProfile[] = [
  {
    id: 'usr_cfo',
    name: 'Picheth',
    role: 'cfo',
    title: 'Shop Owner & Managing Director',
    email: 'pichethneou@gmail.com',
    approvalLimitUSD: 1000000,
    avatarUrl: '/avatar_finance_cfo_1790394974427.jpg',
  },
  {
    id: 'usr_ap_lead',
    name: 'Sopheak',
    role: 'ap_specialist',
    title: 'Senior AP & Cashier Accountant',
    email: 'por.sopheak@gmail.com',
    approvalLimitUSD: 50000,
    avatarUrl: '/avatar_ap_specialist_1790394992254.jpg',
  },
  {
    id: 'usr_dept_mgr',
    name: 'Visal Heng',
    role: 'dept_manager',
    title: 'Inventory & Tech Purchasing Supervisor',
    email: 'visal.heng@email.com',
    approvalLimitUSD: 250000,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
  },
  {
    id: 'usr_auditor',
    name: 'Chanthanak',
    role: 'auditor',
    title: 'Statutory Tax & Financial Auditor (GDT Licensed)',
    email: 'chanthat@email.com',
    approvalLimitUSD: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
  },
];

// No seed vendors — add suppliers manually via the Suppliers page.
export const INITIAL_VENDORS: Vendor[] = [];

const VENDORS_LOOKUP: Record<string, Vendor> = {};
INITIAL_VENDORS.forEach((v) => {
  VENDORS_LOOKUP[v.name] = v;
});

export const INITIAL_INVOICES: Invoice[] = buildInvoicesFromRaw(RAW_INVOICE_ROWS, VENDORS_LOOKUP);

// No seed notifications.
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const EMAIL_TEMPLATES: EmailReminderTemplate[] = [
  {
    id: 'tmpl_upcoming',
    name: 'Upcoming Due Date Notice (Cambodia)',
    type: 'upcoming_due',
    subject: 'Notice: Payment scheduled for Electronics Invoice {{invoice_number}} (Due {{due_date}})',
    bodyTemplate: `Dear {{vendor_contact}},\n\nThis is an automated notice regarding Device & Accessories Invoice {{invoice_number}} for {{vendor_name}} in the amount of {{amount}}.\n\nAccording to our shop accounts ledger, this payment is scheduled for processing on {{due_date}} via {{payment_method}} (ABA Bank / Bakong KHQR / ACLEDA).\n\nPlease verify that your ABA Bank, ACLEDA, or Bakong KHQR beneficiary details remain current.\n\nBest regards,\nAccounts Payable & Treasury Team\n Electronics Shop (Phnom Penh)`,
  },
  {
    id: 'tmpl_past_due_mild',
    name: 'Friendly Past-Due Reminder (Wholesale & Retail AR)',
    type: 'past_due_mild',
    subject: 'Follow-up: Past Due Statement for Order {{invoice_number}}',
    bodyTemplate: `Dear {{vendor_contact}},\n\nOur shop records indicate that Invoice {{invoice_number}} issued on {{issue_date}} for the amount of {{amount}} was due on {{due_date}} and remains uncollected.\n\nThis covers commercial delivery of Mobile Phones, Tablets, Laptops, or Accessories.\n\nPlease remit via ABA PAY, Bakong KHQR, or bank transfer:\n- Account Name: KY STORE\n- ABA Account (USD): 001 882 991\n- ABA Account (KHR): 001 882 992\n- Bakong KHQR ID: angkor_tech@aba\n\nAmount Due: {{amount}}\n\nSincerely,\nKY Shop Billing & Accounts Receivable`,
  },
  {
    id: 'tmpl_past_due_urgent',
    name: 'Urgent Dunning Notice (Overdue AP/AR)',
    type: 'past_due_urgent',
    subject: 'URGENT: Outstanding Balance Notice - Device Order {{invoice_number}}',
    bodyTemplate: `ATTENTION: Accounts & Treasury Controller,\n\nThis is a priority notification that Invoice {{invoice_number}} for {{amount}} is now past due (Original Due Date: {{due_date}}).\n\nTo prevent interruption in device supply chain deliveries (Smartphones, Tablets, Accessories, Laptops), please authorize settlement today via ABA Bank or Bakong KHQR.\n\nUrgent Resolution Team,\nKY Store Financial Oversight (Phnom Penh)`,
  },
  {
    id: 'tmpl_remittance',
    name: 'Remittance Advice & Partial Confirmation',
    type: 'remittance_advice',
    subject: 'Remittance Advice: Payment Processed for Invoice {{invoice_number}}',
    bodyTemplate: `Dear {{vendor_contact}},\n\nPlease be advised that payment for Device / Accessories Invoice {{invoice_number}} has been released.\n\nPayment Details:\n- Supplier / Beneficiary: {{vendor_name}}\n- Payout Amount Settled: {{amount}}\n- Remaining Balance: {{remaining_balance}}\n- Payment Channel: {{payment_method}}\n- Transaction Hash / Ref: {{payment_reference}}\n- Effective Date: {{paid_date}}\n\nFunds have been transferred via Cambodian interbank clearing (NBC Bakong / ABA / ACLEDA).\n\nWarm regards,\nKY Shop Treasury Desk`,
  },
];

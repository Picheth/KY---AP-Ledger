import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Invoice,
  InvoiceStatus,
  PartialPaymentRecord,
  Vendor,
  CurrencyCode,
  UserRole,
  UserProfile,
  NotificationItem,
  PaymentBatch,
  PaymentMethod,
  EmailReminderTemplate,
  StandalonePaymentRecord,
} from '../types/finance';
import { SEEDED_DAILY_PAYMENTS } from '../data/dailyPaymentsSeed';
import {
  INITIAL_INVOICES,
  INITIAL_VENDORS,
  INITIAL_NOTIFICATIONS,
  USER_PROFILES,
  EMAIL_TEMPLATES,
} from '../data/mockFinanceData';
import { convertToUSD, formatCurrency } from '../utils/currency';

interface FinanceContextType {
  invoices: Invoice[];
  vendors: Vendor[];
  notifications: NotificationItem[];
  currentRole: UserRole;
  currentUser: UserProfile;
  currentCurrency: CurrencyCode;
  emailTemplates: EmailReminderTemplate[];
  paymentBatches: PaymentBatch[];
  unreadNotificationsCount: number;
  
  // Actions
  setCurrentRole: (role: UserRole) => void;
  setCurrentCurrency: (currency: CurrencyCode) => void;
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'auditHistory' | 'baseAmountUSD' | 'remindersSentCount'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>, auditNote?: string) => void;
  deleteInvoice: (id: string) => boolean;
  approveInvoice: (id: string, note?: string) => boolean;
  rejectInvoice: (id: string, reason: string) => boolean;
  executePayment: (invoiceId: string, method: PaymentMethod, paymentDate?: string) => void;
  executePartialPayment: (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string,
    paymentDate?: string
  ) => boolean;
  executeBulkPayment: (invoiceIds: string[], method: PaymentMethod) => PaymentBatch;
  executeMultiInvoiceSettlement: (
    allocations: { invoiceId: string; amount: number }[],
    method: PaymentMethod,
    totalBudget?: number,
    notes?: string,
    paymentDate?: string
  ) => PaymentBatch;
  sendEmailReminder: (invoiceId: string, templateId: string, customSubject?: string, customBody?: string) => void;
  addVendor: (vendorData: Omit<Vendor, 'id' | 'totalSpendUSD' | 'openInvoicesCount'>) => Vendor;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetToSampleData: () => void;
  dailyPayments: StandalonePaymentRecord[];
  addDailyPayment: (payment: Omit<StandalonePaymentRecord, 'id'>) => void;
  updateDailyPayment: (id: string, updates: Partial<StandalonePaymentRecord>) => void;
  deleteDailyPayment: (id: string) => void;
  updatePaymentRecord: (
    invoiceId: string,
    paymentId: string,
    updates: {
      amount?: number;
      paymentDate?: string;
      paymentMethod?: PaymentMethod | string;
      reference?: string;
      notes?: string;
    }
  ) => boolean;
  deletePaymentRecord: (invoiceId: string, paymentId: string) => boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY_INVOICES = 'ledgerflow_real_ledger_v8';
const STORAGE_KEY_VENDORS = 'ledgerflow_real_ledger_v8_vnd';
const STORAGE_KEY_NOTIFS = 'ledgerflow_real_ledger_v8_notif';
const STORAGE_KEY_ROLE = 'ledgerflow_real_ledger_v8_role';
const STORAGE_KEY_CURR = 'ledgerflow_real_ledger_v8_curr';
const STORAGE_KEY_BATCHES = 'ledgerflow_real_ledger_v8_batch';
const STORAGE_KEY_DAILY_PAYMENTS = 'ledgerflow_daily_payments_v2';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVOICES);
      const parsed: Invoice[] = saved ? JSON.parse(saved) : INITIAL_INVOICES;
      return parsed.map((inv) => {
        if (inv.vendorName === 'S3 PLN') {
          return { ...inv, vendorName: 'S3 PLP-NEW', vendorId: 'vnd_s3_plp_new' };
        }
        return inv;
      });
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VENDORS);
      const parsed: Vendor[] = saved ? JSON.parse(saved) : INITIAL_VENDORS;
      return parsed.map((v) => {
        if (v.name === 'S3 PLN') {
          return { ...v, name: 'S3 PLP-NEW', id: 'vnd_s3_plp_new' };
        }
        return v;
      });
    } catch {
      return INITIAL_VENDORS;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE);
      return (saved as UserRole) || 'cfo';
    } catch {
      return 'cfo';
    }
  });

  const [currentCurrency, setCurrentCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURR);
      if (saved === 'USD' || saved === 'KHR') return saved;
      return 'USD';
    } catch {
      return 'USD';
    }
  });

  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dailyPayments, setDailyPayments] = useState<StandalonePaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY_PAYMENTS);
      const parsed: StandalonePaymentRecord[] = saved ? JSON.parse(saved) : SEEDED_DAILY_PAYMENTS;
      return parsed.map((p) => {
        if (p.supplier === 'S3 PLN') {
          return { ...p, supplier: 'S3 PLP-NEW' };
        }
        return p;
      });
    } catch {
      return SEEDED_DAILY_PAYMENTS;
    }
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DAILY_PAYMENTS, JSON.stringify(dailyPayments));
  }, [dailyPayments]);

  const addDailyPayment = (paymentData: Omit<StandalonePaymentRecord, 'id'>) => {
    const newRecord: StandalonePaymentRecord = {
      ...paymentData,
      id: `dpay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    setDailyPayments((prev) => [newRecord, ...prev]);
  };

  const updateDailyPayment = (id: string, updates: Partial<StandalonePaymentRecord>) => {
    setDailyPayments((prev) =>
      prev.map((dp) => (dp.id === id ? { ...dp, ...updates } : dp))
    );
  };

  const deleteDailyPayment = (id: string) => {
    setDailyPayments((prev) => prev.filter((dp) => dp.id !== id));
  };

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  // Self-heal and migrate any lingering 'S3 PLN' records in state
  useEffect(() => {
    const hasLingeringPln = invoices.some((i) => i.vendorName === 'S3 PLN');
    if (hasLingeringPln) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.vendorName === 'S3 PLN'
            ? { ...i, vendorName: 'S3 PLP-NEW', vendorId: 'vnd_s3_plp_new' }
            : i
        )
      );
    }
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VENDORS, JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLE, currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURR, currentCurrency);
  }, [currentCurrency]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(paymentBatches));
  }, [paymentBatches]);

  const currentUser = useMemo(() => {
    return USER_PROFILES.find((p) => p.role === currentRole) || USER_PROFILES[0];
  }, [currentRole]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
  };

  const setCurrentCurrency = (currency: CurrencyCode) => {
    setCurrentCurrencyState(currency);
  };

  const addInvoice = (
    invoiceData: Omit<Invoice, 'id' | 'auditHistory' | 'baseAmountUSD' | 'remindersSentCount'>
  ): Invoice => {
    const baseAmountUSD = convertToUSD(invoiceData.totalAmount, invoiceData.currency);
    const newId = `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newInvoice: Invoice = {
      ...invoiceData,
      id: newId,
      baseAmountUSD,
      amountPaid: invoiceData.amountPaid || 0,
      remainingBalance: invoiceData.remainingBalance !== undefined ? invoiceData.remainingBalance : invoiceData.totalAmount,
      partialPayments: invoiceData.partialPayments || [],
      remindersSentCount: 0,
      auditHistory: [
        {
          id: `ah_${Date.now()}`,
          timestamp: nowStr,
          userName: currentUser.name,
          role: currentUser.role,
          action: 'Invoice received and entered into ledger',
        },
      ],
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title: 'New Invoice Processed',
      message: `${newInvoice.vendorName} #${newInvoice.invoiceNumber} (${formatCurrency(newInvoice.totalAmount, newInvoice.currency)}) logged into AP pipeline.`,
      timestamp: 'Just now',
      type: 'approval_required',
      invoiceId: newInvoice.id,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>, auditNote?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const newHistory = [...inv.auditHistory];
        if (auditNote) {
          newHistory.push({
            id: `ah_${Date.now()}`,
            timestamp: nowStr,
            userName: currentUser.name,
            role: currentUser.role,
            action: auditNote,
          });
        }
        const updatedTotal = updates.totalAmount !== undefined ? updates.totalAmount : inv.totalAmount;
        const updatedCurrency = updates.currency !== undefined ? updates.currency : inv.currency;
        const baseUSD = convertToUSD(updatedTotal, updatedCurrency);
        const amountPaid = updates.amountPaid !== undefined ? updates.amountPaid : (inv.amountPaid || 0);
        const remaining = updates.remainingBalance !== undefined ? updates.remainingBalance : Math.max(0, updatedTotal - amountPaid);
        const status = updates.status !== undefined ? updates.status : (remaining === 0 ? 'paid' : inv.status);

        return {
          ...inv,
          ...updates,
          baseAmountUSD: baseUSD,
          remainingBalance: remaining,
          status,
          auditHistory: newHistory,
        };
      })
    );
  };

  const deleteInvoice = (id: string): boolean => {
    const target = invoices.find((i) => i.id === id);
    if (!target) return false;

    setInvoices((prev) => prev.filter((i) => i.id !== id));

    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === target.vendorId) {
          return {
            ...v,
            openInvoicesCount: Math.max(0, v.openInvoicesCount - (target.status !== 'paid' ? 1 : 0)),
          };
        }
        return v;
      })
    );

    setNotifications((prev) => prev.filter((n) => n.invoiceId !== id));

    return true;
  };

  const approveInvoice = (id: string, note?: string): boolean => {
    const target = invoices.find((i) => i.id === id);
    if (!target) return false;

    // RBAC Limit check
    if (currentUser.approvalLimitUSD > 0 && target.baseAmountUSD > currentUser.approvalLimitUSD) {
      alert(`Approval exceeded: Your role (${currentUser.title}) limit is $${currentUser.approvalLimitUSD.toLocaleString()}. Please escalate to Finance Director/CFO.`);
      return false;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        return {
          ...inv,
          status: 'approved',
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Approved invoice for payment${note ? `: ${note}` : ''}`,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Invoice Approved',
        message: `${target.invoiceNumber} (${target.vendorName}) approved by ${currentUser.name}. Ready for disbursement batch.`,
        timestamp: 'Just now',
        type: 'approval_required',
        invoiceId: target.id,
        read: false,
      },
      ...prev,
    ]);

    return true;
  };

  const rejectInvoice = (id: string, reason: string): boolean => {
    const target = invoices.find((i) => i.id === id);
    if (!target) return false;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        return {
          ...inv,
          status: 'rejected',
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Rejected invoice: ${reason}`,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Invoice Rejected',
        message: `${target.invoiceNumber} rejected: ${reason}`,
        timestamp: 'Just now',
        type: 'approval_required',
        invoiceId: target.id,
        read: false,
      },
      ...prev,
    ]);

    return true;
  };

  const executePayment = (invoiceId: string, method: PaymentMethod, paymentDate?: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const remainingToPay = target.remainingBalance !== undefined ? target.remainingBalance : target.totalAmount - (target.amountPaid || 0);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const effectiveDate = paymentDate ? (paymentDate.includes('T') ? paymentDate.replace('T', ' ').slice(0, 16) : `${paymentDate} 12:00`) : nowStr;
    const ref = `${method.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const settleUSD = convertToUSD(remainingToPay, target.currency);

    const partialRecord: PartialPaymentRecord = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: remainingToPay,
      amountUSD: settleUSD,
      paymentDate: effectiveDate,
      paymentMethod: method,
      reference: ref,
      notes: paymentDate ? `Backdated payment applied (${paymentDate})` : 'Full balance settlement',
      recordedBy: `${currentUser.name} (${currentUser.title})`,
      remainingBalanceAfter: 0,
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status: 'paid',
          amountPaid: inv.totalAmount,
          remainingBalance: 0,
          paidAt: effectiveDate,
          paymentMethod: method,
          paymentReference: ref,
          partialPayments: [...(inv.partialPayments || []), partialRecord],
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Disbursed full payment of ${formatCurrency(remainingToPay, target.currency)} via ${method.toUpperCase()} (Ref: ${ref}, Value Date: ${effectiveDate.slice(0, 10)})`,
            },
          ],
        };
      })
    );

    // Update vendor total spend
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === target.vendorId) {
          return {
            ...v,
            totalSpendUSD: v.totalSpendUSD + settleUSD,
            openInvoicesCount: Math.max(0, v.openInvoicesCount - 1),
          };
        }
        return v;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Payment Disbursed',
        message: `Settled ${formatCurrency(remainingToPay, target.currency)} to ${target.vendorName} (${ref}). Full balance closed.`,
        timestamp: 'Just now',
        type: 'payment_executed',
        invoiceId: target.id,
        read: false,
      },
      ...prev,
    ]);
  };

  const executePartialPayment = (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string,
    paymentDate?: string
  ): boolean => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target || amount <= 0) return false;

    const currentPaid = target.amountPaid || 0;
    const currentRemaining = target.remainingBalance !== undefined ? target.remainingBalance : target.totalAmount - currentPaid;
    const settleAmount = Math.min(amount, currentRemaining);
    const newAmountPaid = currentPaid + settleAmount;
    const newRemaining = Math.max(0, target.totalAmount - newAmountPaid);
    const newStatus: InvoiceStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const effectiveDate = paymentDate ? (paymentDate.includes('T') ? paymentDate.replace('T', ' ').slice(0, 16) : `${paymentDate} 12:00`) : nowStr;
    const ref = reference || `${method.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const settleAmountUSD = convertToUSD(settleAmount, target.currency);

    const partialRecord: PartialPaymentRecord = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: settleAmount,
      amountUSD: settleAmountUSD,
      paymentDate: effectiveDate,
      paymentMethod: method,
      reference: ref,
      notes: notes || (paymentDate ? `Backdated installment (${paymentDate})` : undefined),
      recordedBy: `${currentUser.name} (${currentUser.title})`,
      remainingBalanceAfter: newRemaining,
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          amountPaid: newAmountPaid,
          remainingBalance: newRemaining,
          status: newStatus,
          paidAt: newRemaining === 0 ? effectiveDate : inv.paidAt,
          paymentMethod: method,
          paymentReference: ref,
          partialPayments: [...(inv.partialPayments || []), partialRecord],
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: newRemaining === 0
                ? `Fully settled final tranche: ${formatCurrency(settleAmount, target.currency)} via ${method.toUpperCase()} (Ref: ${ref}, Value Date: ${effectiveDate.slice(0, 10)})`
                : `Partial payment disbursed: ${formatCurrency(settleAmount, target.currency)} via ${method.toUpperCase()} (Ref: ${ref}, Value Date: ${effectiveDate.slice(0, 10)}). Remaining open balance: ${formatCurrency(newRemaining, target.currency)}`,
              note: notes,
            },
          ],
        };
      })
    );

    // Update vendor total spend
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === target.vendorId) {
          return {
            ...v,
            totalSpendUSD: v.totalSpendUSD + settleAmountUSD,
            openInvoicesCount: newRemaining === 0 ? Math.max(0, v.openInvoicesCount - 1) : v.openInvoicesCount,
          };
        }
        return v;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: newRemaining === 0 ? 'Invoice Fully Settled' : 'Partial Payment Disbursed',
        message: `${target.vendorName} #${target.invoiceNumber}: Disbursed ${formatCurrency(settleAmount, target.currency)}.${newRemaining > 0 ? ` Remaining: ${formatCurrency(newRemaining, target.currency)}.` : ''}`,
        timestamp: 'Just now',
        type: 'payment_executed',
        invoiceId: target.id,
        read: false,
      },
      ...prev,
    ]);

    return true;
  };

  const updatePaymentRecord = (
    invoiceId: string,
    paymentId: string,
    updates: {
      amount?: number;
      paymentDate?: string;
      paymentMethod?: PaymentMethod | string;
      reference?: string;
      notes?: string;
    }
  ): boolean => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return false;

    let existingPayments = target.partialPayments || [];
    
    // If invoice was marked paid without an explicit partial record, create a synthetic one
    if (existingPayments.length === 0 && target.amountPaid && target.amountPaid > 0) {
      existingPayments = [
        {
          id: `pay_synth_${target.id}`,
          amount: target.amountPaid,
          amountUSD: convertToUSD(target.amountPaid, target.currency),
          paymentDate: target.paidAt || new Date().toISOString().slice(0, 10),
          paymentMethod: (target.paymentMethod as PaymentMethod) || 'bank_transfer',
          reference: target.paymentReference || `PAY-${target.invoiceNumber}`,
          recordedBy: `${currentUser.name} (${currentUser.title})`,
          remainingBalanceAfter: target.remainingBalance || 0,
        },
      ];
    }

    const paymentIdx = existingPayments.findIndex((p) => p.id === paymentId || existingPayments.length === 1);
    if (paymentIdx === -1) return false;

    const oldPayment = existingPayments[paymentIdx];
    const newAmount = updates.amount !== undefined ? updates.amount : oldPayment.amount;
    const newDate = updates.paymentDate !== undefined ? updates.paymentDate : oldPayment.paymentDate;
    const newMethod = (updates.paymentMethod as PaymentMethod) !== undefined ? (updates.paymentMethod as PaymentMethod) : oldPayment.paymentMethod;
    const newRef = updates.reference !== undefined ? updates.reference : oldPayment.reference;
    const newNotes = updates.notes !== undefined ? updates.notes : oldPayment.notes;

    const updatedPayment: PartialPaymentRecord = {
      ...oldPayment,
      amount: newAmount,
      amountUSD: convertToUSD(newAmount, target.currency),
      paymentDate: newDate,
      paymentMethod: newMethod,
      reference: newRef,
      notes: newNotes,
    };

    const newPartialPayments = [...existingPayments];
    newPartialPayments[paymentIdx] = updatedPayment;

    // Recalculate total amount paid and remaining balance
    const totalAmountPaid = newPartialPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemainingBalance = Math.max(0, target.totalAmount - totalAmountPaid);
    const newStatus: InvoiceStatus =
      newRemainingBalance === 0
        ? 'paid'
        : totalAmountPaid > 0
        ? 'partially_paid'
        : 'approved';

    const latestPayDate = newPartialPayments.length > 0
      ? newPartialPayments.reduce((latest, p) => p.paymentDate > latest ? p.paymentDate : latest, newPartialPayments[0].paymentDate)
      : undefined;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          partialPayments: newPartialPayments,
          amountPaid: totalAmountPaid,
          remainingBalance: newRemainingBalance,
          status: newStatus,
          paidAt: newRemainingBalance === 0 ? latestPayDate : undefined,
          paymentMethod: newMethod,
          paymentReference: newRef,
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Updated payment details: ${formatCurrency(newAmount, target.currency)} on ${newDate.slice(0, 10)}${newRef ? ` (Ref: ${newRef})` : ''}`,
            },
          ],
        };
      })
    );

    return true;
  };

  const deletePaymentRecord = (
    invoiceId: string,
    paymentId: string
  ): boolean => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return false;

    let existingPayments = target.partialPayments || [];
    
    // If invoice was marked paid without an explicit partial record
    if (existingPayments.length === 0 && target.amountPaid && target.amountPaid > 0) {
      existingPayments = [
        {
          id: paymentId,
          amount: target.amountPaid,
          amountUSD: convertToUSD(target.amountPaid, target.currency),
          paymentDate: target.paidAt || new Date().toISOString().slice(0, 10),
          paymentMethod: (target.paymentMethod as PaymentMethod) || 'bank_transfer',
          reference: target.paymentReference || `PAY-${target.invoiceNumber}`,
          recordedBy: `${currentUser.name} (${currentUser.title})`,
          remainingBalanceAfter: 0,
        },
      ];
    }

    const paymentToDelete = existingPayments.find((p) => p.id === paymentId) || existingPayments[0];
    const newPartialPayments = existingPayments.filter((p) => p.id !== paymentId && p !== paymentToDelete);

    // Recalculate total amount paid and remaining balance
    const totalAmountPaid = newPartialPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemainingBalance = Math.max(0, target.totalAmount - totalAmountPaid);
    const newStatus: InvoiceStatus =
      newRemainingBalance === 0
        ? 'paid'
        : totalAmountPaid > 0
        ? 'partially_paid'
        : 'approved';

    const latestPayDate = newPartialPayments.length > 0
      ? newPartialPayments.reduce((latest, p) => p.paymentDate > latest ? p.paymentDate : latest, newPartialPayments[0].paymentDate)
      : undefined;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          partialPayments: newPartialPayments,
          amountPaid: totalAmountPaid,
          remainingBalance: newRemainingBalance,
          status: newStatus,
          paidAt: newRemainingBalance === 0 ? latestPayDate : undefined,
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Voided payment of ${formatCurrency(paymentToDelete ? paymentToDelete.amount : 0, target.currency)}. Open balance restored to ${formatCurrency(newRemainingBalance, target.currency)}.`,
            },
          ],
        };
      })
    );

    return true;
  };

  const executeBulkPayment = (invoiceIds: string[], method: PaymentMethod): PaymentBatch => {
    const targets = invoices.filter((i) => invoiceIds.includes(i.id));
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const batchNum = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalUSD = targets.reduce((sum, inv) => {
      const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.amountPaid || 0);
      return sum + convertToUSD(rem, inv.currency);
    }, 0);

    // Virtual cards get a 1.5% treasury rebate
    const cashbackUSD = method === 'virtual_card' ? totalUSD * 0.015 : 0;

    const newBatch: PaymentBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchNum,
      createdAt: nowStr,
      totalAmountUSD: totalUSD,
      invoiceCount: targets.length,
      paymentMethod: method,
      cashbackEarnedUSD: cashbackUSD,
      status: 'settled',
      invoices: targets,
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (!invoiceIds.includes(inv.id)) return inv;
        const ref = `${method.toUpperCase()}-${batchNum.slice(-4)}-${inv.invoiceNumber.slice(-4)}`;
        const rem = inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.amountPaid || 0);
        const remUSD = convertToUSD(rem, inv.currency);

        const partialRecord: PartialPaymentRecord = {
          id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount: rem,
          amountUSD: remUSD,
          paymentDate: nowStr,
          paymentMethod: method,
          reference: ref,
          notes: `Settled via Bulk Payment Batch ${batchNum}`,
          recordedBy: `${currentUser.name} (${currentUser.title})`,
          remainingBalanceAfter: 0,
        };

        return {
          ...inv,
          status: 'paid',
          amountPaid: inv.totalAmount,
          remainingBalance: 0,
          paidAt: nowStr,
          paymentMethod: method,
          paymentReference: ref,
          partialPayments: [...(inv.partialPayments || []), partialRecord],
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Settled via Bulk Payment Batch ${batchNum} (${method.toUpperCase()})`,
            },
          ],
        };
      })
    );

    // Update vendors
    setVendors((prev) =>
      prev.map((v) => {
        const vendorInvoices = targets.filter((ti) => ti.vendorId === v.id);
        if (vendorInvoices.length > 0) {
          const additionalSpend = vendorInvoices.reduce((s, vi) => {
            const rem = vi.remainingBalance !== undefined ? vi.remainingBalance : vi.totalAmount - (vi.amountPaid || 0);
            return s + convertToUSD(rem, vi.currency);
          }, 0);
          return {
            ...v,
            totalSpendUSD: v.totalSpendUSD + additionalSpend,
            openInvoicesCount: Math.max(0, v.openInvoicesCount - vendorInvoices.length),
          };
        }
        return v;
      })
    );

    setPaymentBatches((prev) => [newBatch, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Bulk Disbursement Completed',
        message: `Batch ${batchNum}: Disbursed ${formatCurrency(totalUSD, 'USD')} across ${targets.length} invoices via ${method.toUpperCase()}.${cashbackUSD > 0 ? ` Earned $${cashbackUSD.toFixed(2)} corporate card rebate!` : ''}`,
        timestamp: 'Just now',
        type: 'payment_executed',
        read: false,
      },
      ...prev,
    ]);

    return newBatch;
  };

  const executeMultiInvoiceSettlement = (
    allocations: { invoiceId: string; amount: number }[],
    method: PaymentMethod,
    totalBudget?: number,
    notes?: string,
    paymentDate?: string
  ): PaymentBatch => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const effectiveDate = paymentDate ? (paymentDate.includes('T') ? paymentDate.replace('T', ' ').slice(0, 16) : `${paymentDate} 12:00`) : nowStr;
    const batchNum = `SPLIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalAllocatedUSD = 0;
    const settledInvoices: Invoice[] = [];

    allocations.forEach((alloc) => {
      if (alloc.amount <= 0) return;
      const inv = invoices.find((i) => i.id === alloc.invoiceId);
      if (!inv) return;

      const allocUSD = convertToUSD(alloc.amount, inv.currency);
      totalAllocatedUSD += allocUSD;
      settledInvoices.push(inv);
    });

    const cashbackUSD = method === 'virtual_card' ? totalAllocatedUSD * 0.015 : 0;

    const newBatch: PaymentBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchNum,
      createdAt: effectiveDate,
      totalAmountUSD: totalAllocatedUSD,
      invoiceCount: settledInvoices.length,
      paymentMethod: method,
      cashbackEarnedUSD: cashbackUSD,
      status: 'settled',
      invoices: settledInvoices,
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        const match = allocations.find((a) => a.invoiceId === inv.id && a.amount > 0);
        if (!match) return inv;

        const currentPaid = inv.amountPaid || 0;
        const currentRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - currentPaid;
        const settleAmount = Math.min(match.amount, currentRemaining);
        const newAmountPaid = currentPaid + settleAmount;
        const newRemaining = Math.max(0, inv.totalAmount - newAmountPaid);
        const newStatus: InvoiceStatus = newRemaining === 0 ? 'paid' : 'partially_paid';
        const ref = `${method.toUpperCase()}-${batchNum.slice(-4)}-${inv.invoiceNumber.slice(-4)}`;
        const settleUSD = convertToUSD(settleAmount, inv.currency);

        const partialRecord: PartialPaymentRecord = {
          id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount: settleAmount,
          amountUSD: settleUSD,
          paymentDate: effectiveDate,
          paymentMethod: method,
          reference: ref,
          notes: notes || `Multi-invoice settlement allocation batch ${batchNum}${paymentDate ? ` (${paymentDate})` : ''}`,
          recordedBy: `${currentUser.name} (${currentUser.title})`,
          remainingBalanceAfter: newRemaining,
        };

        return {
          ...inv,
          amountPaid: newAmountPaid,
          remainingBalance: newRemaining,
          status: newStatus,
          paidAt: newRemaining === 0 ? effectiveDate : inv.paidAt,
          paymentMethod: method,
          paymentReference: ref,
          partialPayments: [...(inv.partialPayments || []), partialRecord],
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: newRemaining === 0
                ? `Fully settled via Allocation Batch ${batchNum} (${method.toUpperCase()}, Value Date: ${effectiveDate.slice(0, 10)})`
                : `Partial payment of ${formatCurrency(settleAmount, inv.currency)} via Allocation Batch ${batchNum} (${method.toUpperCase()}, Value Date: ${effectiveDate.slice(0, 10)}). Remaining balance: ${formatCurrency(newRemaining, inv.currency)}`,
              note: notes,
            },
          ],
        };
      })
    );

    // Update vendors
    setVendors((prev) =>
      prev.map((v) => {
        let vendorExtraUSD = 0;
        let invoicesFullyClosed = 0;

        allocations.forEach((alloc) => {
          const inv = invoices.find((i) => i.id === alloc.invoiceId);
          if (inv && inv.vendorId === v.id && alloc.amount > 0) {
            const currentRemaining = inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.amountPaid || 0);
            const settleAmt = Math.min(alloc.amount, currentRemaining);
            vendorExtraUSD += convertToUSD(settleAmt, inv.currency);
            if (settleAmt >= currentRemaining) invoicesFullyClosed++;
          }
        });

        if (vendorExtraUSD > 0) {
          return {
            ...v,
            totalSpendUSD: v.totalSpendUSD + vendorExtraUSD,
            openInvoicesCount: Math.max(0, v.openInvoicesCount - invoicesFullyClosed),
          };
        }
        return v;
      })
    );

    setPaymentBatches((prev) => [newBatch, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Multi-Invoice Settlement Executed',
        message: `Batch ${batchNum}: Allocated ${formatCurrency(totalAllocatedUSD, 'USD')} across ${settledInvoices.length} invoices via ${method.toUpperCase()}.${cashbackUSD > 0 ? ` Earned $${cashbackUSD.toFixed(2)} rebate!` : ''}`,
        timestamp: 'Just now',
        type: 'payment_executed',
        read: false,
      },
      ...prev,
    ]);

    return newBatch;
  };

  const sendEmailReminder = (
    invoiceId: string,
    templateId: string,
    customSubject?: string,
    customBody?: string
  ) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          remindersSentCount: inv.remindersSentCount + 1,
          lastReminderDate: nowStr.slice(0, 10),
          auditHistory: [
            ...inv.auditHistory,
            {
              id: `ah_${Date.now()}`,
              timestamp: nowStr,
              userName: currentUser.name,
              role: currentUser.role,
              action: `Dispatched automated email reminder (${tmpl?.name || 'Custom Notice'}) to ${inv.vendorName}`,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Email Reminder Dispatched',
        message: `Automated reminder delivered to ${target.vendorName} regarding ${target.invoiceNumber}.`,
        timestamp: 'Just now',
        type: 'reminder_dispatched',
        invoiceId: target.id,
        read: false,
      },
      ...prev,
    ]);
  };

  const addVendor = (vendorData: Omit<Vendor, 'id' | 'totalSpendUSD' | 'openInvoicesCount'>): Vendor => {
    const newId = `vnd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newVendor: Vendor = {
      ...vendorData,
      id: newId,
      totalSpendUSD: 0,
      openInvoicesCount: 0,
    };
    setVendors((prev) => [newVendor, ...prev]);
    return newVendor;
  };

  const updateVendor = (id: string, updates: Partial<Vendor>) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const resetToSampleData = () => {
    setInvoices(INITIAL_INVOICES);
    setVendors(INITIAL_VENDORS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setPaymentBatches([]);
    localStorage.removeItem(STORAGE_KEY_INVOICES);
    localStorage.removeItem(STORAGE_KEY_VENDORS);
    localStorage.removeItem(STORAGE_KEY_NOTIFS);
    localStorage.removeItem(STORAGE_KEY_BATCHES);
  };

  return (
    <FinanceContext.Provider
      value={{
        invoices,
        vendors,
        notifications,
        currentRole,
        currentUser,
        currentCurrency,
        emailTemplates: EMAIL_TEMPLATES,
        paymentBatches,
        unreadNotificationsCount,
        setCurrentRole,
        setCurrentCurrency,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        approveInvoice,
        rejectInvoice,
        executePayment,
        executePartialPayment,
        executeBulkPayment,
        executeMultiInvoiceSettlement,
        sendEmailReminder,
        addVendor,
        updateVendor,
        markNotificationRead,
        markAllNotificationsRead,
        resetToSampleData,
        dailyPayments,
        addDailyPayment,
        updateDailyPayment,
        deleteDailyPayment,
        updatePaymentRecord,
        deletePaymentRecord,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

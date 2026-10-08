import { Invoice, Vendor, StandalonePaymentRecord } from '../types/finance';

export interface DatabaseStatus {
  connected: boolean;
  host: string;
  port: number;
  user: string;
  name: string;
  error?: string | null;
}

export const checkDbHealth = async (): Promise<DatabaseStatus> => {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) throw new Error('API server returned ' + res.status);
    const data = await res.json();
    return {
      connected: data.database?.connected || false,
      host: data.database?.host || 'localhost',
      port: data.database?.port || 3306,
      user: data.database?.user || 'root',
      name: data.database?.name || 'ap.db',
      error: data.database?.error || null,
    };
  } catch (err: any) {
    return {
      connected: false,
      host: 'localhost',
      port: 3306,
      user: 'root',
      name: 'ap.db',
      error: err.message || 'API server offline',
    };
  }
};

export const fetchInvoicesFromDB = async (): Promise<Invoice[] | null> => {
  try {
    const res = await fetch('/api/invoices');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchVendorsFromDB = async (): Promise<Vendor[] | null> => {
  try {
    const res = await fetch('/api/vendors');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchDailyPaymentsFromDB = async (): Promise<StandalonePaymentRecord[] | null> => {
  try {
    const res = await fetch('/api/daily-payments');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const saveInvoiceToDB = async (invoice: any): Promise<boolean> => {
  try {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const recordPaymentInDB = async (
  invoiceId: string,
  paymentData: {
    amount: number;
    amountUSD?: number;
    paymentDate: string;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    recordedBy?: string;
  }
): Promise<boolean> => {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const deleteInvoiceFromDB = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
};

export const saveDailyPaymentToDB = async (payment: any): Promise<boolean> => {
  try {
    const res = await fetch('/api/daily-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const deleteDailyPaymentFromDB = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/daily-payments/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
};

export const saveVendorToDB = async (vendor: any): Promise<boolean> => {
  try {
    const res = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendor),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const deleteVendorFromDB = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
};

export const triggerDatabaseSeed = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const res = await fetch('/api/seed', { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

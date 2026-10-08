export interface StandalonePaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  notes?: string;
}

// No seed data — all payments must be entered manually by the user.
export const SEEDED_DAILY_PAYMENTS: StandalonePaymentRecord[] = [];

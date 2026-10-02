export interface StandalonePaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  notes?: string;
}

export const SEEDED_DAILY_PAYMENTS: StandalonePaymentRecord[] = [
  { id: 'spay_1', date: '2026-10-02', supplier: 'S4 LH', amount: 13000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-1002', notes: 'Daily installment payout' },
  { id: 'spay_2', date: '2026-10-01', supplier: 'S4 LH', amount: 10000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-1001', notes: 'Daily installment payout' },
  { id: 'spay_3', date: '2026-09-30', supplier: 'S3 PLP-NEW', amount: 50000.0, paymentMethod: 'aba_pay', reference: 'ABA-PLN-0930', notes: 'Daily payment to S3 PLP-NEW' },
  { id: 'spay_4', date: '2026-09-30', supplier: 'S4 LH', amount: 30000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0930', notes: 'Daily payment to S4 LH' },
  { id: 'spay_5', date: '2026-09-29', supplier: 'S4 LH', amount: 15000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0929', notes: 'Daily installment payout' },
  { id: 'spay_6', date: '2026-09-28', supplier: 'S3 PLP-NEW', amount: 40000.0, paymentMethod: 'aba_pay', reference: 'ABA-PLN-0928', notes: 'Daily payment to S3 PLP-NEW' },
  { id: 'spay_7', date: '2026-09-28', supplier: 'S4 LH', amount: 30000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0928', notes: 'Daily payment to S4 LH' },
  { id: 'spay_8', date: '2026-09-27', supplier: 'S3 PLP-NEW', amount: 40000.0, paymentMethod: 'aba_pay', reference: 'ABA-PLN-0927', notes: 'Daily payment to S3 PLP-NEW' },
  { id: 'spay_9', date: '2026-09-27', supplier: 'S4 LH', amount: 15000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0927', notes: 'Daily installment payout' },
  { id: 'spay_10', date: '2026-09-26', supplier: 'S4 LH', amount: 14000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0926', notes: 'Daily installment payout' },
  { id: 'spay_11', date: '2026-09-25', supplier: 'S3 PLP-NEW', amount: 50000.0, paymentMethod: 'aba_pay', reference: 'ABA-PLN-0925', notes: 'Daily payment to S3 PLP-NEW' },
  { id: 'spay_12', date: '2026-09-25', supplier: 'S4 LH', amount: 29000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0925', notes: 'Daily installment payout' },
  { id: 'spay_13', date: '2026-09-24', supplier: 'S3 PLP-NEW', amount: 40000.0, paymentMethod: 'aba_pay', reference: 'ABA-PLN-0924', notes: 'Daily payment to S3 PLP-NEW' },
  { id: 'spay_14', date: '2026-09-24', supplier: 'S4 LH', amount: 25000.0, paymentMethod: 'aba_pay', reference: 'ABA-S4-0924', notes: 'Daily payment to S4 LH' },
];

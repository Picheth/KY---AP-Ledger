import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Invoice, EmailReminderTemplate } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import {
  Send,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Settings,
  Sparkles,
  FileText,
} from 'lucide-react';

interface RemindersViewProps {
  preselectedInvoiceId?: string;
  onSelectInvoice: (id: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  preselectedInvoiceId,
  onSelectInvoice,
}) => {
  const {
    invoices,
    vendors,
    emailTemplates,
    sendEmailReminder,
    currentCurrency,
  } = useFinance();

  // Invoices eligible for reminders: overdue or due in next 7 days
  const eligibleInvoices = useMemo(() => {
    const today = new Date('2026-09-25');
    return invoices.filter((i) => {
      if (i.status === 'paid' || i.status === 'rejected') return false;
      if (i.status === 'overdue') return true;
      const due = new Date(i.dueDate);
      const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 7;
    });
  }, [invoices]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(() => {
    if (preselectedInvoiceId) return preselectedInvoiceId;
    return eligibleInvoices[0]?.id || invoices[0]?.id || '';
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(emailTemplates[0]?.id || '');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [autoDunningEnabled, setAutoDunningEnabled] = useState(true);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);
  const selectedTemplate = emailTemplates.find((t) => t.id === selectedTemplateId) || emailTemplates[0];

  // Interpolate template with invoice variables
  const interpolatedContent = useMemo(() => {
    if (!selectedInvoice || !selectedTemplate) {
      return { subject: '', body: '' };
    }

    const vendor = vendors.find((v) => v.id === selectedInvoice.vendorId);
    const amountStr = formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency);

    let subj = selectedTemplate.subject
      .replace(/{{invoice_number}}/g, selectedInvoice.invoiceNumber)
      .replace(/{{due_date}}/g, selectedInvoice.dueDate)
      .replace(/{{vendor_name}}/g, selectedInvoice.vendorName);

    let body = selectedTemplate.bodyTemplate
      .replace(/{{vendor_contact}}/g, vendor?.contactPerson || 'Accounting Lead')
      .replace(/{{vendor_name}}/g, selectedInvoice.vendorName)
      .replace(/{{invoice_number}}/g, selectedInvoice.invoiceNumber)
      .replace(/{{amount}}/g, amountStr)
      .replace(/{{due_date}}/g, selectedInvoice.dueDate)
      .replace(/{{issue_date}}/g, selectedInvoice.issueDate)
      .replace(/{{payment_method}}/g, (selectedInvoice.paymentMethod || 'ACH').toUpperCase())
      .replace(/{{payment_reference}}/g, selectedInvoice.paymentReference || 'N/A')
      .replace(/{{paid_date}}/g, selectedInvoice.paidAt || 'Today');

    return { subject: subj, body };
  }, [selectedInvoice, selectedTemplate, vendors]);

  // Update editor when template or invoice changes
  React.useEffect(() => {
    setCustomSubject(interpolatedContent.subject);
    setCustomBody(interpolatedContent.body);
  }, [interpolatedContent]);

  const handleSendReminder = () => {
    if (!selectedInvoiceId) return;

    sendEmailReminder(selectedInvoiceId, selectedTemplateId, customSubject, customBody);
    setSendSuccessMessage(
      `Reminder successfully delivered to ${selectedInvoice?.vendorName} (${selectedInvoice?.invoiceNumber}).`
    );

    setTimeout(() => {
      setSendSuccessMessage(null);
    }, 4000);
  };

  // Recent reminder audit records
  const reminderHistory = useMemo(() => {
    const list: { id: string; invoiceNumber: string; vendor: string; action: string; timestamp: string }[] = [];
    invoices.forEach((inv) => {
      inv.auditHistory.forEach((ah) => {
        if (ah.action.toLowerCase().includes('reminder')) {
          list.push({
            id: ah.id,
            invoiceNumber: inv.invoiceNumber,
            vendor: inv.vendorName,
            action: ah.action,
            timestamp: ah.timestamp,
          });
        }
      });
    });
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [invoices]);

  return (
    <div className="space-y-6">
      
      {/* Cadence Settings & Overview Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-900" />
              <span>Automated Dunning & Payment Reminder Engine</span>
            </h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Automates client collections (AR) and vendor due date tracking (AP) with scheduled cadences
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Auto-dispatch rules:</span>
            <button
              onClick={() => setAutoDunningEnabled(!autoDunningEnabled)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                autoDunningEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {autoDunningEnabled ? 'Active (Automated)' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Cadence Steps */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-900">Step 1: Early Notice</div>
            <div className="text-[11px] text-slate-500 mt-0.5">3 Days Before Due</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pre-verifies banking routing</div>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-slate-900">Step 2: Due Date Notice</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Day of Settlement</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Confirm batch execution</div>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-amber-900">Step 3: Past Due Follow-up</div>
            <div className="text-[11px] text-amber-700 mt-0.5">1–7 Days Delinquent</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Automated polite dunning</div>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="font-semibold text-rose-900">Step 4: Priority Escalation</div>
            <div className="text-[11px] text-rose-700 mt-0.5">14+ Days Past Due</div>
            <div className="text-[10px] text-rose-600 mt-0.5">CC Controller & AP Lead</div>
          </div>
        </div>
      </div>

      {/* Main Composer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Invoices requiring reminders (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Invoices Requiring Follow-up ({eligibleInvoices.length})
          </h3>
          <div className="text-xs text-slate-500 mb-3">
            Select an invoice to preview or customize reminder email
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {eligibleInvoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No invoices currently due or overdue.
              </div>
            ) : (
              eligibleInvoices.map((inv) => {
                const isSelected = selectedInvoiceId === inv.id;
                const isOverdue = inv.status === 'overdue';

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`p-3 cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-slate-100 border-l-4 border-slate-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{inv.vendorName}</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                        {isOverdue ? 'Overdue' : `Due: ${inv.dueDate}`}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1">
                      Reminders dispatched: <strong className="font-mono text-slate-600">{inv.remindersSentCount}</strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Email Composer & Live Preview (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Email Reminder Preview & Dispatch
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Dynamic variables populated from general ledger & invoice metadata
                </div>
              </div>

              {/* Template Select */}
              <div className="w-full sm:w-auto">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-medium focus:outline-none"
                >
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Toast */}
            {sendSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sendSuccessMessage}</span>
              </div>
            )}

            {/* Composer Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Message Body</label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={10}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-500 font-mono text-xs text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="text-slate-500">
              Recipient:{' '}
              <strong className="text-slate-800">
                {vendors.find((v) => v.id === selectedInvoice?.vendorId)?.email || 'billing@vendor.com'}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomSubject(interpolatedContent.subject);
                  setCustomBody(interpolatedContent.body);
                }}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Reset Template
              </button>
              <button
                type="button"
                disabled={!selectedInvoice}
                onClick={handleSendReminder}
                className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reminder Now</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Reminder Audit Log */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Reminder Communications Log
        </h3>
        <div className="divide-y divide-slate-100 text-xs">
          {reminderHistory.length === 0 ? (
            <div className="py-4 text-center text-slate-400">
              No automated reminders dispatched yet.
            </div>
          ) : (
            reminderHistory.map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono font-medium text-slate-900">{entry.invoiceNumber}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-800">{entry.vendor}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{entry.action}</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  {entry.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

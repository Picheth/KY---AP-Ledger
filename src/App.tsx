import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { InvoicesView } from './components/InvoicesView';
import { ApprovalsView } from './components/ApprovalsView';
import { VendorsView } from './components/VendorsView';
import { RemindersView } from './components/RemindersView';
import { DailyReportView } from './components/DailyReportView';
import { PurchasesView } from './components/PurchasesView';
import { SettlementDetailsView } from './components/SettlementDetailsView';
import { SettlementReportModal } from './components/SettlementReportModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { InvoiceIntakeModal } from './components/InvoiceIntakeModal';
import { BulkPaymentModal } from './components/BulkPaymentModal';
import { AuditReportsModal } from './components/AuditReportsModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { Invoice } from './types/finance';

function MainApp() {
  const { invoices } = useFinance();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isBulkPayOpen, setIsBulkPayOpen] = useState<boolean>(false);
  const [bulkPayPreselectedIds, setBulkPayPreselectedIds] = useState<string[]>([]);
  const [selectedSupplierForSettlement, setSelectedSupplierForSettlement] = useState<string | undefined>(undefined);
  const [isAuditReportsOpen, setIsAuditReportsOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [invoicesInitialFilter, setInvoicesInitialFilter] = useState<string>('all');
  const [reminderTargetInvoiceId, setReminderTargetInvoiceId] = useState<string | undefined>(undefined);
  const [selectedPurchasesSupplier, setSelectedPurchasesSupplier] = useState<string>('All Suppliers');
  const [selectedSettlementInvoiceId, setSelectedSettlementInvoiceId] = useState<string>('');
  const [isSettlementReportOpen, setIsSettlementReportOpen] = useState<boolean>(false);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || null;

  const handleNavigateTab = (tab: string, filter?: string) => {
    setActiveTab(tab);
    if (filter) {
      setInvoicesInitialFilter(filter);
    }
  };

  const handleOpenBulkPay = () => {
    setBulkPayPreselectedIds([]);
    setIsBulkPayOpen(true);
  };

  const handleOpenBulkPayWithSelected = (ids: string[]) => {
    setBulkPayPreselectedIds(ids);
    setIsBulkPayOpen(true);
  };

  const handleOpenReminderForInvoice = (invoice: Invoice) => {
    setReminderTargetInvoiceId(invoice.id);
    setActiveTab('reminders');
    setSelectedInvoiceId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIntake={() => setIsIntakeOpen(true)}
        onOpenAudit={() => setIsAuditReportsOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={handleNavigateTab}
            onOpenBulkPay={handleOpenBulkPay}
            onOpenIntake={() => setIsIntakeOpen(true)}
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesView
            initialSupplier={selectedPurchasesSupplier}
            onOpenSettlementDetails={(invId) => {
              const found = invoices.find((i) => i.id === invId);
              setSelectedSettlementInvoiceId(found ? found.id : invId);
              setActiveTab('settlement');
            }}
          />
        )}

        {activeTab === 'settlement' && (
          <SettlementDetailsView
            invoiceId={selectedSettlementInvoiceId}
            onBack={() => setActiveTab('purchases')}
          />
        )}

        {activeTab === 'daily-report' && (
          <DailyReportView />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            onOpenIntake={() => setIsIntakeOpen(true)}
            onOpenBulkPayWithSelected={handleOpenBulkPayWithSelected}
            initialFilter={invoicesInitialFilter}
            onOpenReminderModalForInvoice={handleOpenReminderForInvoice}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsView
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            onOpenBulkPayWithSelected={handleOpenBulkPayWithSelected}
          />
        )}

        {activeTab === 'vendors' && (
          <VendorsView
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
            onOpenSplitAllocatorForVendor={(vendorId) => {
              setSelectedSupplierForSettlement(vendorId);
              setBulkPayPreselectedIds([]);
              setIsBulkPayOpen(true);
            }}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersView
            preselectedInvoiceId={reminderTargetInvoiceId}
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        )}

      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">LedgerFlow AP & Financial Oversight</span>
            <span aria-hidden="true">·</span>
            <span>SOX 404 & GAAP Treasury Compliance</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAuditReportsOpen(true)}
              className="hover:text-slate-900 underline"
            >
              Export Monthly Audit Report
            </button>
            <span aria-hidden="true">·</span>
            <span>Multi-Currency Treasury Core</span>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoiceId(null)}
        onOpenReminderForInvoice={handleOpenReminderForInvoice}
      />

      <InvoiceIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onCreated={(inv) => setSelectedInvoiceId(inv.id)}
      />

      <BulkPaymentModal
        isOpen={isBulkPayOpen}
        onClose={() => {
          setIsBulkPayOpen(false);
          setSelectedSupplierForSettlement(undefined);
        }}
        preselectedInvoiceIds={bulkPayPreselectedIds}
        initialSupplierId={selectedSupplierForSettlement}
      />

      <AuditReportsModal
        isOpen={isAuditReportsOpen}
        onClose={() => setIsAuditReportsOpen(false)}
      />

      <SettlementReportModal
        isOpen={isSettlementReportOpen || activeTab === 'settlement-report'}
        onClose={() => {
          setIsSettlementReportOpen(false);
          if (activeTab === 'settlement-report') {
            setActiveTab('dashboard');
          }
        }}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectInvoice={(id) => setSelectedInvoiceId(id)}
      />

    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}

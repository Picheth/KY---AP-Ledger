import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyCode, UserRole } from '../types/finance';
import { EXCHANGE_RATES } from '../utils/currency';
import {
  Bell,
  Check,
  ChevronDown,
  Shield,
  FileSpreadsheet,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenIntake: () => void;
  onOpenAudit: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenIntake,
  onOpenAudit,
  onOpenNotifications,
}) => {
  const {
    currentRole,
    currentUser,
    setCurrentRole,
    currentCurrency,
    setCurrentCurrency,
    unreadNotificationsCount,
    resetToSampleData,
  } = useFinance();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'invoices', label: 'Invoices & AP' },
    { id: 'approvals', label: 'Approval Queue' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'reminders', label: 'Reminders & Dunning' },
  ];

  const rolesList: { role: UserRole; name: string; title: string; limit: string }[] = [
    { role: 'cfo', name: 'Sokha Pich', title: 'Shop Owner & Managing Director', limit: '$1,000,000 / ៛4B limit' },
    { role: 'ap_specialist', name: 'Sreymom Chan', title: 'Chief Accountant & AP Cashier', limit: '$25,000 / ៛100M limit' },
    { role: 'dept_manager', name: 'Visal Heng', title: 'Inventory & Tech Purchasing Supervisor', limit: '$100,000 / ៛400M limit' },
    { role: 'auditor', name: 'Rathana Ouk', title: 'Statutory Tax & Financial Auditor (GDT)', limit: 'Read-only audit' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Strict Top Bar Contract: 3 Zones */}
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition-colors flex items-center gap-2.5 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
                🇰🇭
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">Angkor Tech Store</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded">
                    Phnom Penh
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  Smartphones · Laptops · Tablets · Accessories · KHR (៛) & USD ($)
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Clean text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`py-1.5 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary actions & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setCurrencyMenuOpen(!currencyMenuOpen);
                  setRoleMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                title="Change active currency"
              >
                <span>{EXCHANGE_RATES[currentCurrency]?.symbol}</span>
                <span>{currentCurrency}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {currencyMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100">
                    Display Currency
                  </div>
                  {Object.values(EXCHANGE_RATES).map((rate) => (
                    <button
                      key={rate.code}
                      onClick={() => {
                        setCurrentCurrency(rate.code);
                        setCurrencyMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-slate-900">{rate.symbol}</span>
                        <span className="text-slate-700">{rate.name}</span>
                      </div>
                      {currentCurrency === rate.code && (
                        <Check className="w-3.5 h-3.5 text-slate-900" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Audit Reports Button */}
            <button
              onClick={onOpenAudit}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap border border-slate-200"
              title="Monthly Financial Auditing & Reconciliation"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Audit Reports</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title="Real-time alerts & upcoming due dates"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full" />
              )}
            </button>

            {/* Quick Invoice Intake Button */}
            <button
              onClick={onOpenIntake}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Process Invoice</span>
              <span className="sm:hidden">Intake</span>
            </button>

            {/* Role Profile Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setRoleMenuOpen(!roleMenuOpen);
                  setCurrencyMenuOpen(false);
                }}
                className="flex items-center gap-2 p-1 pl-1.5 text-xs rounded-md hover:bg-slate-100 transition-colors border border-slate-200"
                title="Switch active finance team role"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-slate-300 bg-slate-200"
                />
                <div className="hidden sm:block text-left pr-1">
                  <div className="font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{currentUser.role.replace('_', ' ')}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-900">Switch Finance Role</div>
                    <div className="text-[11px] text-slate-500">Tests role-based approval limits & access control</div>
                  </div>

                  <div className="py-1">
                    {rolesList.map((r) => {
                      const isCurrent = currentRole === r.role;
                      return (
                        <button
                          key={r.role}
                          onClick={() => {
                            setCurrentRole(r.role);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-start gap-2.5 ${
                            isCurrent ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 flex items-center justify-between">
                              <span>{r.name}</span>
                              {isCurrent && <span className="text-[10px] font-mono text-slate-500">ACTIVE</span>}
                            </div>
                            <div className="text-slate-500 text-[11px]">{r.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.limit}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 px-3 py-2 mt-1">
                    <button
                      onClick={() => {
                        resetToSampleData();
                        setRoleMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Sample Invoices & Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Mobile Navigation bar for on-the-go management */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 gap-4 text-xs font-medium text-slate-600 scrollbar-none">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`whitespace-nowrap px-1 py-1 ${
                  isActive ? 'text-slate-900 font-semibold border-b-2 border-slate-900' : ''
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <button
            onClick={onOpenAudit}
            className="whitespace-nowrap px-1 py-1 text-slate-600"
          >
            Audit Reports
          </button>
        </div>

      </div>
    </header>
  );
};

import React from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  X,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  CreditCard,
  Check,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (id: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectInvoice,
}) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useFinance();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        
        {/* Header */}
        <div>
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-900" />
              <h3 className="text-sm font-bold text-slate-900">
                Real-Time Due Date & Audit Alerts
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action: Mark all as read */}
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {notifications.filter((n) => !n.read).length} unread alerts
            </span>
            <button
              onClick={markAllNotificationsRead}
              className="text-slate-700 hover:text-slate-900 font-medium hover:underline"
            >
              Mark all read
            </button>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No alerts at this time.
              </div>
            ) : (
              notifications.map((notif) => {
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markNotificationRead(notif.id);
                      if (notif.invoiceId) {
                        onSelectInvoice(notif.invoiceId);
                        onClose();
                      }
                    }}
                    className={`p-4 text-xs transition-colors cursor-pointer ${
                      notif.read ? 'bg-white opacity-70' : 'bg-slate-50/70 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        {notif.type === 'urgent_due' && (
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        {notif.type === 'approval_required' && (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {notif.type === 'payment_executed' && (
                          <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {notif.type === 'reminder_dispatched' && (
                          <Send className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                        <span>{notif.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {notif.timestamp}
                      </span>
                    </div>

                    <div className="text-slate-600 mt-1 pl-6">
                      {notif.message}
                    </div>

                    {notif.invoiceId && (
                      <div className="mt-2 pl-6">
                        <span className="text-[11px] text-slate-900 font-medium hover:underline inline-flex items-center gap-1">
                          View details & take action →
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">System notifications updated live</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-600 hover:text-slate-900 font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

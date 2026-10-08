import React, { useState, useEffect } from 'react';
import { DatabaseStatus, checkDbHealth, triggerDatabaseSeed } from '../services/api';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Server,
  Key,
  FolderOpen,
  Terminal,
  ExternalLink,
  Table,
} from 'lucide-react';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setSeedMessage(null);
    const s = await checkDbHealth();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMessage(null);
    const res = await triggerDatabaseSeed();
    if (res.success) {
      setSeedMessage('✅ Tables created and seed data inserted successfully!');
      if (onRefreshData) onRefreshData();
    } else {
      setSeedMessage(`❌ ${res.error || 'Failed to seed database'}`);
    }
    setSeedLoading(false);
    fetchStatus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${status?.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                MySQL Workbench & Database Connection
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage connection to MySQL Server and MySQL Workbench GUI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
          
          {/* Live Status Card */}
          <div className={`p-4 rounded-lg border ${
            status?.connected
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {status?.connected ? 'MySQL Database Connected' : 'MySQL Database Offline / Local Cache Mode'}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {status?.connected
                      ? `Connected to database \`${status.name}\` at ${status.host}`
                      : status?.error || 'Make sure MySQL Server & API backend are running.'}
                  </div>
                </div>
              </div>

              <button
                onClick={fetchStatus}
                disabled={loading}
                className="px-3 py-1.5 font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-md shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Connection Parameters */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Current MySQL Configuration (.env)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-mono">HOST</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{status?.host || 'localhost'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-mono">PORT</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{status?.port || 3306}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-mono">DATABASE</div>
                <div className="font-mono font-bold text-indigo-700 text-xs mt-0.5">{status?.name || 'ap.db'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-mono">USER</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{status?.user || 'root'}</div>
              </div>
            </div>
          </div>

          {/* How to open in MySQL Workbench */}
          <div className="space-y-3 bg-slate-900 text-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-white font-semibold text-xs border-b border-slate-700 pb-2">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>How to View & Query in MySQL Workbench</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">schema.sql ready</span>
            </div>

            <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                Open <strong>MySQL Workbench</strong> on your Mac and click your MySQL Local Connection (usually <code className="text-emerald-300 font-mono">root@localhost:3306</code>).
              </li>
              <li>
                Click <strong>File → Open SQL Script...</strong> and select <code className="text-emerald-300 font-mono">schema.sql</code> from this project directory (<code className="text-slate-400">/KY---AP-Ledger/schema.sql</code>).
              </li>
              <li>
                Click the ⚡ <strong>Execute (Yellow Lightning icon)</strong> to run the script and create database <code className="text-emerald-300 font-mono">`ap.db`</code> with all tables and seed data.
              </li>
              <li>
                Under the <strong>Schemas</strong> tab on the left sidebar in Workbench, right-click and choose <strong>Refresh All</strong>. You will see <code className="text-emerald-300 font-mono">ap.db</code> with tables: <code className="text-slate-400">invoices, vendors, partial_payments, daily_payments, invoice_line_items</code>.
              </li>
            </ol>
          </div>

          {/* Seed Database Button */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">Auto-Initialize / Seed Database</div>
              <div className="text-[11px] text-slate-500">
                Automatically creates tables and populates sample KY Store invoices & vendors in MySQL.
              </div>
              {seedMessage && <div className="mt-1 font-mono text-xs">{seedMessage}</div>}
            </div>

            <button
              onClick={handleSeed}
              disabled={seedLoading}
              className="px-3.5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{seedLoading ? 'Seeding...' : 'Initialize & Seed MySQL'}</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Backend API: <code className="font-mono text-slate-700">http://localhost:5001/api</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

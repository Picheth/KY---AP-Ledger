import React from 'react';
import { DailyReportView } from './DailyReportView';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 overflow-y-auto flex-1">
          <DailyReportView onClose={onClose} isModal={true} />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { LogsIcon } from './icons/LogsIcon';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose, logs, onClearLogs }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <LogsIcon className="w-6 h-6 text-sky-500" />
            سجل عمليات النظام (Application Logs)
          </h2>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="text-xs text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
              >
                مسح السجل
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content / Logs Stream */}
        <div className="p-4 overflow-y-auto flex-grow space-y-2 font-mono text-xs bg-slate-50 dark:bg-slate-900/80">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              لا توجد عمليات مسجلة حتى الآن. ابدأ بسحب ملف صوتي أو استيراد ملف ترجمة لرؤية تفاصيل العمليات.
            </div>
          ) : (
            logs.map((log) => {
              let badgeColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
              if (log.type === 'success') badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
              if (log.type === 'error') badgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
              if (log.type === 'warn') badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

              return (
                <div key={log.id} className={`p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-800 shadow-xs flex items-start gap-2.5 transition-all`}>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap pt-0.5 font-mono">
                    [{log.timestamp}]
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badgeColor}`}>
                    {log.type}
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 flex-grow break-all leading-relaxed font-sans text-xs">
                    {log.message}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-right text-[11px] text-slate-500 dark:text-slate-400">
          إجمالي العمليات المسجلة: <span className="font-mono font-bold">{logs.length}</span>
        </div>
      </div>
    </div>
  );
};

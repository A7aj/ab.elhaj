import React, { useState } from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import { CloseIcon } from './icons/CloseIcon';
import type { ActivityLogEntry } from '../types';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLogEntry[];
  onClearLogs: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const formatted = logs
      .map(
        (entry, index) =>
          `[${index + 1}] [${entry.timestamp}] ${entry.title}` +
          (entry.modelName ? ` (النموذج: ${entry.modelName})` : '') +
          (entry.durationMs ? ` (المدة: ${(entry.durationMs / 1000).toFixed(2)} ثانية)` : '') +
          (entry.details ? `\n   تفاصيل: ${entry.details}` : '')
      )
      .join('\n\n');

    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTypeStyles = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'model':
        return {
          badgeBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          dotBg: 'bg-purple-500 ring-purple-100 dark:ring-purple-900/50',
          border: 'border-purple-200 dark:border-purple-800/60',
          label: 'نموذج AI'
        };
      case 'success':
        return {
          badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dotBg: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/50',
          border: 'border-emerald-200 dark:border-emerald-800/60',
          label: 'نجاح'
        };
      case 'warning':
        return {
          badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dotBg: 'bg-amber-500 ring-amber-100 dark:ring-amber-900/50',
          border: 'border-amber-200 dark:border-amber-800/60',
          label: 'تنبيه / بديل'
        };
      case 'error':
        return {
          badgeBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dotBg: 'bg-rose-500 ring-rose-100 dark:ring-rose-900/50',
          border: 'border-rose-200 dark:border-rose-800/60',
          label: 'فشل'
        };
      case 'info':
      default:
        return {
          badgeBg: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          dotBg: 'bg-sky-500 ring-sky-100 dark:ring-sky-900/50',
          border: 'border-slate-200 dark:border-slate-700',
          label: 'إجراء'
        };
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col transform transition-all duration-300 scale-100 font-[Tajawal,sans-serif]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="activity-log-title" className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                  سجل العمليات
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  {logs.length} {logs.length === 1 ? 'عملية' : 'عمليات'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تتبع زمني تفصيلي لكافة مراحل معالجة الصوت والنماذج وتصدير الترجمة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {logs.length > 0 && (
              <>
                <button
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                  title="نسخ السجل إلى الحافظة"
                >
                  {copied ? '✓ تم النسخ' : 'نسخ'}
                </button>
                <button
                  onClick={onClearLogs}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors"
                  title="مسح كافة العمليات المسجلة"
                >
                  مسح
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-1"
              aria-label="إغلاق"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content / Timeline */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <HistoryIcon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                لا توجد عمليات مسجلة بعد
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                بمجرد سحب أو إفلات ملف صوتي، أو تشغيل نماذج الذكاء الاصطناعي، أو تصدير ملف الـ SRT، سيتم توثيق كافة الخطوات هنا بالتوقيت الدقيق والحالة.
              </p>
            </div>
          ) : (
            <div className="relative pr-4 border-r-2 border-slate-200 dark:border-slate-700 space-y-4">
              {logs.map((entry, index) => {
                const styles = getTypeStyles(entry.type);
                return (
                  <div key={entry.id || index} className="relative group">
                    {/* Timeline Dot */}
                    <div
                      className={`absolute -right-[21px] top-1.5 w-3 h-3 rounded-full ${styles.dotBg} ring-4 transition-transform group-hover:scale-125`}
                    />

                    {/* Entry Card */}
                    <div className={`bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 md:p-3.5 border ${styles.border} transition-all hover:shadow-sm`}>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles.badgeBg}`}>
                            {styles.label}
                          </span>
                          {entry.modelName && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {entry.modelName}
                            </span>
                          )}
                          {entry.durationMs !== undefined && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              ⏱️ {(entry.durationMs / 1000).toFixed(2)} ث
                            </span>
                          )}
                        </div>

                        {/* Exact Timestamp */}
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {entry.timestamp}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {entry.title}
                      </h4>

                      {entry.details && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words whitespace-pre-wrap font-sans">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 rounded-b-2xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {logs.length > 0 ? `آخر عملية: ${logs[logs.length - 1].timestamp}` : 'في انتظار أول عملية...'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

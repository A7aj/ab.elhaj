
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="w-12 h-12 border-4 border-t-sky-500 border-slate-200 dark:border-slate-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-600 dark:text-slate-400">جاري المعالجة، قد يستغرق هذا بعض الوقت...</p>
    </div>
  );
};

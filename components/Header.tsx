import React from 'react';
import { MicIcon } from './icons/MicIcon';
import { HomeIcon } from './icons/HomeIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
            <MicIcon className="w-7 h-7 text-sky-500" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mr-2">
              محول الصوت إلى نص بالذكاء الاصطناعي
            </h1>
        </div>
        <a 
          href="https://ai.studio/apps/drive/1ODSmiqs8dOU1puPcp3w4xRI7T7K9U74v" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          <HomeIcon className="w-4 h-4" />
          <span className="hidden sm:inline">الرئيسية</span>
        </a>
      </div>
    </header>
  );
};
import React from 'react';
import type { TranscriptionOptions } from '../types';

interface OptionsPanelProps {
  options: TranscriptionOptions;
  onChange: (newOptions: Partial<TranscriptionOptions>) => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ options, onChange }) => {
  return (
    <div className="space-y-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
      <div>
        <label htmlFor="wordsPerLine" className="block mb-1.5 text-xs font-medium text-slate-900 dark:text-white">
          عدد الكلمات في السطر ({options.wordsPerLine})
        </label>
        <input
          id="wordsPerLine"
          type="range"
          min="1"
          max="20"
          value={options.wordsPerLine}
          onChange={(e) => onChange({ wordsPerLine: parseInt(e.target.value, 10) })}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600"
        />
      </div>
      <div>
        <label htmlFor="maxSilence" className="block mb-1.5 text-xs font-medium text-slate-900 dark:text-white">
          فترة الصمت القصوى (ثواني) ({options.maxSilence})
        </label>
        <input
          id="maxSilence"
          type="range"
          min="0.2"
          max="5"
          step="0.1"
          value={options.maxSilence}
          onChange={(e) => onChange({ maxSilence: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600"
        />
      </div>
    </div>
  );
};

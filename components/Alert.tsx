
import React from 'react';

interface AlertProps {
  message: string;
  type: 'error' | 'success' | 'warning';
}

export const Alert: React.FC<AlertProps> = ({ message, type }) => {
  const baseClasses = 'p-4 rounded-lg text-sm';
  const typeClasses = {
    error: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    success: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <span className="font-medium">خطأ:</span> {message}
    </div>
  );
};

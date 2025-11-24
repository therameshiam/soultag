import React from 'react';
import { Loader2 } from 'lucide-react';

export const StatusSpinner: React.FC<{ message?: string }> = ({ message = "Scanning Database..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
        <Loader2 className="w-12 h-12 text-brand-600 animate-spin relative z-10" />
      </div>
      <p className="text-gray-500 font-medium animate-pulse">{message}</p>
    </div>
  );
};

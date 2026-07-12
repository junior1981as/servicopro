import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info';

interface AlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string | React.ReactNode;
  onClose: () => void;
}

export function AlertModal({ isOpen, type, title, message, onClose }: AlertModalProps) {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-emerald-500" />,
    error: <AlertTriangle className="w-6 h-6 text-rose-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-emerald-50',
    error: 'bg-rose-50',
    info: 'bg-blue-50'
  };

  const borderColors = {
    success: 'border-emerald-200',
    error: 'border-rose-200',
    info: 'border-blue-200'
  };

  const btnColors = {
    success: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    error: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div 
        className={`bg-white rounded-xl shadow-xl border w-full max-w-md overflow-hidden duration-200 ${borderColors[type]}`}
      >
        <div className={`p-4 border-b flex items-start gap-3 ${bgColors[type]} ${borderColors[type]}`}>
          <div className="shrink-0 mt-0.5">
            {icons[type]}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5">
          <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            {message}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnColors[type]}`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

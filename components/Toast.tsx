import React, { useEffect } from 'react';
import { CheckCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto close after 4 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[300px] animate-in slide-in-from-right
      ${toast.type === 'success' ? 'bg-white/90 border-green-200 text-green-900' : 'bg-white/90 border-blue-200 text-blue-900'}
    `}>
      <div className={`
        p-1 rounded-full 
        ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}
      `}>
        {toast.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
      </div>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  );
};

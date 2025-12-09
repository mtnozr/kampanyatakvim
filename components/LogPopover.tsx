import React from 'react';
import { ActivityLog } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ClipboardList, Clock } from 'lucide-react';

interface LogPopoverProps {
  logs: ActivityLog[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const LogPopover: React.FC<LogPopoverProps> = ({ logs, isOpen, onClose, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-16 md:right-32 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-700">
          <ClipboardList size={18} />
          <h3 className="font-bold">İşlem Kütüğü</h3>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Temizle
          </button>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <ClipboardList className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">Henüz kayıt bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start">
                <div className="p-2 bg-orange-50 text-orange-500 rounded-lg shrink-0 mt-0.5">
                  <Clock size={14} />
                </div>
                <div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    {log.message}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1.5 block font-mono">
                    {format(log.timestamp, 'd MMMM yyyy HH:mm', { locale: tr })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
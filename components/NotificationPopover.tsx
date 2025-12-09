import React from 'react';
import { AppNotification } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Mail, Bell } from 'lucide-react';

interface NotificationPopoverProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ notifications, isOpen, onClose, onMarkAllRead }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-4 md:right-20 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-700">Bildirimler</h3>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            Tümünü Temizle
          </button>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">Henüz bildirim yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start">
                <div className={`
                  p-2 rounded-full shrink-0
                  ${notif.type === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}>
                  {notif.type === 'email' ? <Mail size={16} /> : <Bell size={16} />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">{notif.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                  <span className="text-[10px] text-gray-400 mt-2 block">
                    {format(notif.date, 'HH:mm', { locale: tr })}
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
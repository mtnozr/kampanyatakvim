import React from 'react';
import { X, Calendar, User as UserIcon, AlertCircle, AlignLeft, Building } from 'lucide-react';
import { CalendarEvent, User, Department } from '../types';
import { URGENCY_CONFIGS } from '../constants';
import { format } from 'date-fns';
import tr from 'date-fns/locale/tr';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  assignee?: User;
  departments: Department[];
  onClose: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, assignee, departments, onClose }) => {
  if (!event) return null;

  const config = URGENCY_CONFIGS[event.urgency];
  const department = departments.find(d => d.id === event.departmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header with Urgency Color */}
        <div className={`px-6 py-4 border-b flex justify-between items-start ${config.colorBg} bg-opacity-30 shrink-0`}>
          <div>
            <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.colorBorder} ${config.colorText} bg-white/50 mb-2`}>
              {config.label}
            </span>
            <h2 className="text-xl font-bold text-gray-800 leading-tight">{event.title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 bg-white/50 hover:bg-white rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Date Section */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tarih</p>
              <p className="text-gray-800 font-medium">
                {format(event.date, 'd MMMM yyyy, EEEE', { locale: tr })}
              </p>
            </div>
          </div>

          {/* Department Section */}
          <div className="flex items-start gap-3">
             <div className="p-2 bg-teal-50 text-teal-600 rounded-lg shrink-0">
                <Building size={20} />
             </div>
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Talep Eden Birim</p>
                <p className="text-gray-800 font-medium">
                   {department ? department.name : 'Belirtilmemiş'}
                </p>
             </div>
          </div>

          {/* Assignee Section */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <UserIcon size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Görevli Personel</p>
              {assignee ? (
                <div className="flex items-center gap-2 mt-1">
                   {assignee.emoji ? (
                     <span className="text-xl bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center border border-gray-200">
                       {assignee.emoji}
                     </span>
                   ) : (
                     <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {assignee.name.charAt(0)}
                     </div>
                   )}
                   <div>
                     <p className="text-sm font-semibold text-gray-800">{assignee.name}</p>
                     <p className="text-xs text-gray-500">{assignee.email}</p>
                   </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic mt-1">Atama yapılmadı.</p>
              )}
            </div>
          </div>

          {/* Urgency Description Section */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Aciliyet Seviyesi</p>
              <p className="text-sm text-gray-700 mt-1">
                Bu kampanya <strong>{config.label}</strong> öncelik seviyesindedir.
              </p>
            </div>
          </div>

          {/* Description Section */}
          {event.description && (
             <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg shrink-0">
                   <AlignLeft size={20} />
                </div>
                <div className="w-full">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Açıklama</p>
                   <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {event.description}
                   </p>
                </div>
             </div>
          )}

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center shrink-0">
           <button 
             onClick={onClose}
             className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
           >
             Kapat
           </button>
        </div>
      </div>
    </div>
  );
};
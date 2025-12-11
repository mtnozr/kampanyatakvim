import React from 'react';
import { CalendarEvent, User } from '../types';
import { URGENCY_CONFIGS, STATUS_STYLES } from '../constants';
import { User as UserIcon } from 'lucide-react';

interface EventBadgeProps {
  event: CalendarEvent;
  user?: User;
  onClick: (event: CalendarEvent) => void;
  isBlurred?: boolean;
  isClickable?: boolean;
}

export const EventBadge: React.FC<EventBadgeProps> = ({
  event,
  user,
  onClick,
  isBlurred = false,
  isClickable = true
}) => {
  // Eğer status varsa STATUS_STYLES, yoksa URGENCY_CONFIGS kullanılır
  const config = (event.status && STATUS_STYLES[event.status]) 
    ? STATUS_STYLES[event.status] 
    : (URGENCY_CONFIGS[event.urgency] ?? URGENCY_CONFIGS['Low']);

  const renderAvatar = () => {
    if (!user) {
      return (
        <div className="w-5 h-5 rounded-full border border-white shadow-sm bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
          <UserIcon size={10} />
        </div>
      );
    }

    if (user.emoji) {
      return (
        <div className="w-5 h-5 rounded-full border border-white shadow-sm bg-violet-100 flex items-center justify-center text-xs shrink-0" role="img" aria-label="avatar">
          {user.emoji}
        </div>
      );
    }

    // Fallback if no emoji
    return (
      <div className="w-5 h-5 rounded-full border border-white shadow-sm bg-violet-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
        {user.name.charAt(0)}
      </div>
    );
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isClickable && !isBlurred) {
          onClick(event);
        }
      }}
      className={`
        flex flex-col gap-1 mb-2 group transition-opacity
        ${isClickable && !isBlurred ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        ${isBlurred ? 'opacity-70 grayscale' : ''}
      `}
    >
      {/* Assigned User Info (Avatar + Name) */}
      <div className="flex items-center gap-1.5 px-1 min-w-0">
        {!isBlurred && renderAvatar()}
        <span className="text-[10px] text-gray-500 font-medium truncate leading-none">
          {isBlurred ? '🔒 Dolu' : (user ? user.name : 'Atanmadı')}
        </span>
      </div>

      {/* The Colored Card */}
      <div className={`
        ${config.colorBg} 
        border-l-4 ${config.colorBorder} 
        rounded-r-md rounded-l-sm p-1.5 shadow-sm
        flex flex-col gap-0.5
        ${isBlurred ? 'blur-[3px] select-none' : ''}
      `}>
        <span className={`text-[9px] font-bold uppercase tracking-wide opacity-80 ${config.colorText}`}>
          {isBlurred ? '---' : config.label}
        </span>
        <span className={`text-[11px] font-semibold leading-tight ${config.colorText} line-clamp-2`}>
          {isBlurred ? 'Diğer Birim Kampanyası' : event.title}
        </span>
      </div>
    </div>
  );
};
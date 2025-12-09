import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  isWeekend
} from 'date-fns';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';
import tr from 'date-fns/locale/tr';
import { Bell, ChevronLeft, ChevronRight, Plus, Users, ClipboardList, Loader2, Search, Filter, X, Network } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { CalendarEvent, UrgencyLevel, User, AppNotification, ToastMessage, ActivityLog, Department, IpAccessConfig } from './types';
import { INITIAL_EVENTS, DAYS_OF_WEEK, INITIAL_USERS, URGENCY_CONFIGS, TURKISH_HOLIDAYS, INITIAL_DEPARTMENTS, IP_ACCESS_CONFIG } from './constants';
import { EventBadge } from './components/EventBadge';
import { AddEventModal } from './components/AddEventModal';
import { AdminModal } from './components/AdminModal';
import { NotificationPopover } from './components/NotificationPopover';
import { LogPopover } from './components/LogPopover';
import { ToastContainer } from './components/Toast';
import { EventDetailsModal } from './components/EventDetailsModal';

// --- EMAILJS CONFIGURATION ---
const EMAILJS_SERVICE_ID = 'service_q4mufkj';
const EMAILJS_TEMPLATE_ID = 'template_mtdrews';
const EMAILJS_PUBLIC_KEY = 'RBWpN3vQtjsZQGEKl';

// --- LOCAL STORAGE KEYS ---
const STORAGE_KEYS = {
  EVENTS: 'app_events',
  USERS: 'app_users',
  DEPARTMENTS: 'app_departments',
  IP_CONFIG: 'app_ip_config',
  NOTIFICATIONS: 'app_notifications',
  LOGS: 'app_logs'
};

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- PERSISTENT STATE INITIALIZATION ---
  
  // 1. Events State with LocalStorage
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (saved) {
        return JSON.parse(saved, (key, value) => {
          // Restore Date objects from strings
          if (key === 'date') return new Date(value);
          return value;
        });
      }
    } catch (e) {
      console.error("Failed to parse events from storage", e);
    }
    return INITIAL_EVENTS;
  });

  // 2. Users State with LocalStorage
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch (e) {
      return INITIAL_USERS;
    }
  });

  // 3. Departments State with LocalStorage
  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    } catch (e) {
      return INITIAL_DEPARTMENTS;
    }
  });
  
  // 4. IP / Access Control State with LocalStorage
  const [ipConfig, setIpConfig] = useState<IpAccessConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IP_CONFIG);
      return saved ? JSON.parse(saved) : {
        designerIp: IP_ACCESS_CONFIG.DESIGNER_IP,
        departmentIps: { ...IP_ACCESS_CONFIG.DEPARTMENT_IPS }
      };
    } catch (e) {
      return {
        designerIp: IP_ACCESS_CONFIG.DESIGNER_IP,
        departmentIps: { ...IP_ACCESS_CONFIG.DEPARTMENT_IPS }
      };
    }
  });

  // Defaulting to Designer IP for first load (Not persisted usually, but simulating session)
  const [currentIp, setCurrentIp] = useState<string>(ipConfig.designerIp);
  const [isIpSimOpen, setIsIpSimOpen] = useState(false);

  // 5. Notification System State with LocalStorage
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) {
        return JSON.parse(saved, (key, value) => {
          if (key === 'date') return new Date(value);
          return value;
        });
      }
    } catch (e) {}
    return [];
  });

  // 6. Logs State with LocalStorage
  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (saved) {
        return JSON.parse(saved, (key, value) => {
          if (key === 'timestamp') return new Date(value);
          return value;
        });
      }
    } catch (e) {}
    return [];
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Search & Filter State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<Date>(new Date());
  const [viewEvent, setViewEvent] = useState<CalendarEvent | null>(null);

  // --- PERSISTENCE EFFECT HOOKS ---
  // Whenever these states change, save them to localStorage

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IP_CONFIG, JSON.stringify(ipConfig));
  }, [ipConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [logs]);


  // --- Derived Permissions based on IP ---
  const userRole = useMemo(() => {
    if (currentIp === ipConfig.designerIp) return 'designer';
    if (ipConfig.departmentIps[currentIp]) return 'department_user';
    return 'guest';
  }, [currentIp, ipConfig]);

  const currentDepartmentId = useMemo(() => {
    if (userRole === 'department_user') {
      return ipConfig.departmentIps[currentIp];
    }
    return null;
  }, [currentIp, userRole, ipConfig]);

  const currentDepartmentName = useMemo(() => {
    if (currentDepartmentId) {
      return departments.find(d => d.id === currentDepartmentId)?.name;
    }
    return null;
  }, [currentDepartmentId, departments]);

  const isDesigner = userRole === 'designer';

  // --- EmailJS Initialization ---
  useEffect(() => {
    try {
      emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY,
      });
    } catch (error) {
      console.warn('EmailJS Init Error:', error);
    }
  }, []);

  // --- Filter Logic ---
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 1. IP Access Control Filter
      if (userRole === 'department_user') {
         // Only show events that belong to the user's department
         if (event.departmentId !== currentDepartmentId) {
            return false;
         }
      }

      // 2. Search & UI Filters
      const query = searchQuery.toLowerCase();
      // Search in Title OR Event ID
      const matchesSearch = 
        event.title.toLowerCase().includes(query) || 
        event.id.toLowerCase().includes(query);
        
      const matchesAssignee = filterAssignee ? event.assigneeId === filterAssignee : true;
      const matchesUrgency = filterUrgency ? event.urgency === filterUrgency : true;
      return matchesSearch && matchesAssignee && matchesUrgency;
    });
  }, [events, searchQuery, filterAssignee, filterUrgency, userRole, currentDepartmentId]);

  // --- Calendar Logic ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); 
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const resetToToday = () => setCurrentDate(new Date());

  const getHolidayName = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return TURKISH_HOLIDAYS[dateStr];
  };

  const addToast = (message: string, type: 'success' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  // --- User Management ---
  const handleAddUser = (name: string, email: string, emoji: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      emoji: emoji
    };
    setUsers([...users, newUser]);
    addToast(`${name} başarıyla eklendi.`, 'success');
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  // --- Department Management ---
  const handleAddDepartment = (name: string) => {
    const newDept: Department = {
      id: Math.random().toString(36).substr(2, 9),
      name
    };
    setDepartments([...departments, newDept]);
    addToast(`${name} birimi eklendi.`, 'success');
  };

  const handleDeleteDepartment = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
    addToast('Birim silindi.', 'info');
  };

  // --- IP Config Management ---
  const handleUpdateIpConfig = (newConfig: IpAccessConfig) => {
    setIpConfig(newConfig);
    addToast('Erişim ayarları güncellendi.', 'success');
  };

  // --- Event Handling ---
  const handleAddEvent = async (
      title: string, 
      urgency: UrgencyLevel, 
      date: Date, 
      assigneeId?: string, 
      description?: string, 
      departmentId?: string
    ) => {
    // Generate a proper ID first to use in emails
    const eventId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const newEvent: CalendarEvent = {
      id: eventId,
      title,
      date,
      urgency,
      assigneeId,
      description,
      departmentId
    };
    setEvents([...events, newEvent]);

    if (assigneeId) {
      const assignedUser = users.find(u => u.id === assigneeId);
      if (assignedUser) {
        
        const newNotif: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Görev Ataması Yapıldı',
          message: `${assignedUser.name} kişisine "${title}" görevi atandı.`,
          date: new Date(),
          isRead: false,
          type: 'email'
        };
        setNotifications((prev) => [newNotif, ...prev]);

        const newLog: ActivityLog = {
           id: Math.random().toString(36).substr(2, 9),
           message: `${title} kampanyası için ${assignedUser.name} kişiye görev ataması yapıldı (ID: ${eventId})`,
           timestamp: new Date()
        };
        setLogs((prev) => [newLog, ...prev]);

        setIsSendingEmail(true);
        
        let emailMessage = `${format(date, 'd MMMM yyyy', { locale: tr })} tarihindeki "${title}" kampanyası için görevlendirildiniz.\nAciliyet: ${URGENCY_CONFIGS[urgency].label}`;
        
        if (description) {
          emailMessage += `\n\nAçıklama:\n${description}`;
        }
        
        // Find department name if exists
        if (departmentId) {
            const dept = departments.find(d => d.id === departmentId);
            if (dept) {
                emailMessage += `\n\nTalep Eden Birim: ${dept.name}`;
            }
        }

        // Footer message for mailto fallback (Plain text)
        const footerIdText = `Ref ID: #${eventId}`; 

        const templateParams = {
            to_email: assignedUser.email, 
            to_name: assignedUser.name, 
            name: assignedUser.name,      
            email: assignedUser.email,    
            title: title,
            message: emailMessage,
            ref_id: `#${eventId}`, // Param for EmailJS template (Footer 7pt)
        };
        
        console.log('📨 E-posta gönderimi başlatılıyor. Parametreler:', templateParams);

        try {
            const response = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams,
                EMAILJS_PUBLIC_KEY
            );
            console.log('✅ E-posta Başarılı:', response);
            addToast(`✅ E-posta gönderildi!`, 'success');
        } catch (error: any) {
            console.error('❌ E-posta Hatası (API):', error);
            addToast('⚠️ Güvenlik duvarı tespit edildi. Mail istemcisi açılıyor...', 'info');
            
            setTimeout(() => {
                const subject = encodeURIComponent(`ACİL: Görev Ataması: ${title} [#${eventId}]`);
                // Mailto doesn't support HTML styles like 7pt font, so we separate it visually
                const body = encodeURIComponent(
                    `Sayın ${assignedUser.name},\n\n${emailMessage}\n\nİyi çalışmalar.\n\n----------------\n${footerIdText}`
                );
                // Added importance=High and X-Priority=1 for High Priority email
                window.location.href = `mailto:${assignedUser.email}?subject=${subject}&body=${body}&importance=High&X-Priority=1`;
            }, 1000);

        } finally {
            setIsSendingEmail(false);
        }

      }
    } else {
        addToast('Kampanya oluşturuldu (Atama yok).', 'success');
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    addToast('Kampanya silindi.', 'info');
  };

  const handleDeleteAllEvents = () => {
    setEvents([]);
    addToast('Tüm kampanyalar silindi.', 'info');
  };

  const openAddModal = (date?: Date) => {
    // Only Designers can add events
    if (!isDesigner) return;
    
    setSelectedDateForAdd(date || new Date());
    setIsModalOpen(true);
  };

  const getEventsForDay = (date: Date) => {
    // Use filteredEvents here instead of raw events
    return filteredEvents.filter(event => isSameDay(event.date, date));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterAssignee('');
    setFilterUrgency('');
  };

  const hasActiveFilters = searchQuery || filterAssignee || filterUrgency;

  return (
    <div className="min-h-screen p-4 md:p-8 text-gray-800">
      <div className="max-w-[1400px] mx-auto flex flex-col h-[calc(100vh-4rem)]">
        
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                        {isDesigner ? 'Kampanya Takvimi' : `Takvim: ${currentDepartmentName || 'Birim Görünümü'}`}
                        {!isDesigner && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-normal lowercase">salt okunur</span>
                        )}
                    </h1>
                    {isSendingEmail && (
                    <div className="flex items-center gap-2 mt-2 text-violet-600 text-xs font-bold animate-pulse">
                        <Loader2 size={12} className="animate-spin" />
                        E-posta deneniyor...
                    </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 md:gap-4 bg-white/50 p-2 rounded-2xl backdrop-blur-sm shadow-sm flex-wrap relative z-20">
                    <button onClick={resetToToday} className="bg-violet-100 text-violet-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-200 transition-colors">
                    Bugün
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-white rounded-full transition-colors text-gray-600">
                        <ChevronLeft size={20} />
                        </button>
                        <h2 className="text-xl md:text-2xl font-bold min-w-[160px] text-center tabular-nums capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: tr })}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-white rounded-full transition-colors text-gray-600">
                        <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

                    {/* Search Toggle - Available to everyone */}
                    <button 
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`p-2 transition-colors rounded-lg shadow-sm border ${isSearchOpen || hasActiveFilters ? 'text-violet-600 bg-violet-50 border-violet-100' : 'bg-white border-gray-100 text-gray-500 hover:text-violet-600'}`}
                        title="Arama ve Filtrele"
                    >
                        <Search size={20} />
                        {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-pulse"></span>
                        )}
                    </button>

                    {/* Admin & Notifications - Only for Designers */}
                    {isDesigner && (
                        <>
                            <button 
                                onClick={() => setIsAdminOpen(true)}
                                className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-colors bg-white border border-gray-100 rounded-lg shadow-sm"
                                title="Yönetici Paneli"
                            >
                            <Users size={20} />
                            </button>

                            <div className="relative">
                                <button 
                                onClick={() => {
                                    setIsLogOpen(!isLogOpen);
                                    setIsNotifOpen(false);
                                }}
                                className={`
                                    p-2 transition-colors bg-white border border-gray-100 rounded-lg shadow-sm
                                    ${isLogOpen ? 'text-orange-600 bg-orange-50' : 'text-gray-400 hover:text-orange-600'}
                                `}
                                title="İşlem Kütüğü"
                                >
                                <ClipboardList size={20} />
                                </button>
                                
                                <LogPopover 
                                isOpen={isLogOpen}
                                logs={logs}
                                onClose={() => setIsLogOpen(false)}
                                onClear={() => setLogs([])}
                                />
                            </div>

                            <div className="relative">
                                <button 
                                onClick={() => {
                                    setIsNotifOpen(!isNotifOpen);
                                    setIsLogOpen(false);
                                }}
                                className={`
                                    p-2 transition-colors bg-white border border-gray-100 rounded-lg shadow-sm
                                    ${isNotifOpen ? 'text-violet-600 bg-violet-50' : 'text-gray-400 hover:text-violet-600'}
                                `}
                                >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                    {notifications.length}
                                    </span>
                                )}
                                </button>
                                
                                <NotificationPopover 
                                isOpen={isNotifOpen} 
                                notifications={notifications}
                                onClose={() => setIsNotifOpen(false)}
                                onMarkAllRead={() => setNotifications([])}
                                />
                            </div>

                            <button 
                                onClick={() => openAddModal()}
                                className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-transform active:scale-95"
                            >
                            <Plus size={18} />
                            <span>Ekle</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Search Bar Panel */}
            {isSearchOpen && (
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-violet-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Başlık veya Ref ID ile ara..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-500 outline-none transition-all text-sm"
                        />
                    </div>
                    
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <select
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-500 outline-none transition-all text-sm appearance-none"
                        >
                            <option value="">Tüm Personel</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <div className="absolute left-3 top-2.5 w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        <select
                            value={filterUrgency}
                            onChange={(e) => setFilterUrgency(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-500 outline-none transition-all text-sm appearance-none"
                        >
                            <option value="">Tüm Öncelikler</option>
                            {(Object.keys(URGENCY_CONFIGS) as UrgencyLevel[]).map(level => (
                                <option key={level} value={level}>{URGENCY_CONFIGS[level].label}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className={`
                            flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${hasActiveFilters 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                        `}
                    >
                        <X size={16} /> Filtreleri Temizle
                    </button>
                </div>
            )}
        </div>

        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid Body */}
        <div className="grid grid-cols-7 gap-4 flex-1 auto-rows-fr">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const isDayWeekend = isWeekend(day);
            const dayEvents = getEventsForDay(day);
            const holidayName = getHolidayName(day);
            const isHoliday = !!holidayName;

            return (
              <div 
                key={day.toString()}
                onClick={() => openAddModal(day)}
                className={`
                  relative min-h-[120px] p-2 rounded-2xl border transition-all duration-200 group
                  flex flex-col
                  ${isCurrentMonth
                    ? (isHoliday 
                        ? 'bg-red-50/70 border-red-200 shadow-sm'
                        : isDayWeekend 
                            ? 'bg-gray-100 border-gray-200 shadow-sm' 
                            : 'bg-white border-transparent shadow-sm hover:shadow-md')
                    : 'bg-gray-50/50 border-transparent opacity-60'}
                  ${isTodayDate ? 'ring-2 ring-violet-400 ring-offset-2' : ''}
                  ${!isDesigner ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                {/* Date Number & Holiday Label */}
                <div className="flex justify-between items-start mb-2">
                   {isHoliday && isCurrentMonth ? (
                     <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded leading-tight max-w-[65%] line-clamp-2">
                        {holidayName}
                     </span>
                   ) : <div></div>}
                   
                  <span className={`
                    text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full
                    ${isTodayDate 
                      ? 'bg-violet-600 text-white' 
                      : isHoliday && isCurrentMonth ? 'text-red-600'
                      : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Events List */}
                <div className="flex-1 overflow-y-auto event-scroll">
                  {dayEvents.map(event => (
                    <EventBadge 
                      key={event.id} 
                      event={event} 
                      user={users.find(u => u.id === event.assigneeId)}
                      onClick={setViewEvent}
                    />
                  ))}
                </div>

                {/* Hover Add Indicator (Only for Designers) */}
                {isDesigner && (
                    <>
                        <div className="absolute inset-0 bg-violet-50/0 group-hover:bg-violet-50/30 rounded-2xl pointer-events-none transition-colors" />
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white p-1 rounded-full shadow-sm text-violet-500">
                            <Plus size={14} />
                        </div>
                        </div>
                    </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Network / IP Simulation Tool (Floating Bottom Right) */}
      <div className="fixed bottom-4 left-4 z-40">
        <button 
            onClick={() => setIsIpSimOpen(!isIpSimOpen)}
            className="bg-gray-800 text-white p-3 rounded-full shadow-xl hover:bg-gray-700 transition-colors flex items-center gap-2 text-xs font-mono"
        >
            <Network size={16} />
            <span className="hidden md:inline">IP: {currentIp}</span>
        </button>
        {isIpSimOpen && (
            <div className="absolute bottom-14 left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-in slide-in-from-bottom-2 max-h-[300px] overflow-y-auto">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Ağ Simülasyonu</h4>
                <div className="space-y-2">
                    <button 
                        onClick={() => { setCurrentIp(ipConfig.designerIp); setIsIpSimOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded text-xs flex justify-between items-center ${currentIp === ipConfig.designerIp ? 'bg-violet-100 text-violet-700 font-bold' : 'hover:bg-gray-50'}`}
                    >
                        <span>Designer (Admin)</span>
                        <span className="opacity-50">{ipConfig.designerIp}</span>
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    {Object.entries(ipConfig.departmentIps).map(([ip, deptId]) => {
                        const deptName = departments.find(d => d.id === deptId)?.name;
                        return (
                            <button 
                                key={ip}
                                onClick={() => { setCurrentIp(ip); setIsIpSimOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded text-xs flex justify-between items-center ${currentIp === ip ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}
                            >
                                <span>{deptName || 'Bilinmeyen Birim'}</span>
                                <span className="opacity-50">{ip}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
      </div>

      <AddEventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddEvent}
        initialDate={selectedDateForAdd}
        users={users}
        departments={departments}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        users={users}
        events={events}
        departments={departments}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        onDeleteEvent={handleDeleteEvent}
        onDeleteAllEvents={handleDeleteAllEvents}
        onAddDepartment={handleAddDepartment}
        onDeleteDepartment={handleDeleteDepartment}
        ipConfig={ipConfig}
        onUpdateIpConfig={handleUpdateIpConfig}
      />

      <EventDetailsModal
        event={viewEvent}
        onClose={() => setViewEvent(null)}
        assignee={users.find(u => u.id === viewEvent?.assigneeId)}
        departments={departments}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
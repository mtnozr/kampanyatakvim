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
  isWeekend,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bell, ChevronLeft, ChevronRight, Plus, Users, ClipboardList, Loader2, Search, Filter, X, LogIn, LogOut, Database, Download, Lock } from 'lucide-react';
import emailjs from '@emailjs/browser';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CalendarEvent, UrgencyLevel, User, AppNotification, ToastMessage, ActivityLog, Department, DepartmentUser } from './types';
import { INITIAL_EVENTS, DAYS_OF_WEEK, INITIAL_USERS, URGENCY_CONFIGS, TURKISH_HOLIDAYS, INITIAL_DEPARTMENTS } from './constants';
import { EventBadge } from './components/EventBadge';
import { AddEventModal } from './components/AddEventModal';
import { AdminModal } from './components/AdminModal';
import { NotificationPopover } from './components/NotificationPopover';
import { LogPopover } from './components/LogPopover';
import { ToastContainer } from './components/Toast';
import { EventDetailsModal } from './components/EventDetailsModal';
import { DepartmentLoginModal } from './components/DepartmentLoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { setCookie, getCookie, deleteCookie } from './utils/cookies';

// --- FIREBASE IMPORTS ---
import { db } from './firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';

// --- EMAILJS CONFIGURATION ---
const EMAILJS_SERVICE_ID = 'service_q4mufkj';
const EMAILJS_TEMPLATE_ID = 'template_mtdrews';
const EMAILJS_PUBLIC_KEY = 'RBWpN3vQtjsZQGEKl';

// Normalize urgency values coming from Firestore to avoid crashes on bad data
const normalizeUrgency = (urgency: any): UrgencyLevel => {
  const validUrgencies: UrgencyLevel[] = ['Very High', 'High', 'Medium', 'Low'];
  return validUrgencies.includes(urgency) ? urgency : 'Low';
};

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- STATE MANAGEMENT (Pure Firestore) ---
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Loading States
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  // Department Users for login system (stored in Firestore)
  const [departmentUsers, setDepartmentUsers] = useState<DepartmentUser[]>([]);
  const [loggedInDeptUser, setLoggedInDeptUser] = useState<DepartmentUser | null>(null);
  const [isDeptLoginOpen, setIsDeptLoginOpen] = useState(false);

  // Logs and Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Local UI State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Search & Filter State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // Refactor: Store ID instead of object to ensure reactivity
  const [viewEventId, setViewEventId] = useState<string | null>(null);

  // Derived state for viewEvent
  const viewEvent = useMemo(() => {
    return events.find(e => e.id === viewEventId) || null;
  }, [events, viewEventId]);

  // --- FIREBASE LISTENERS (REAL-TIME SYNC) ---

  // 1. Sync Events
  useEffect(() => {
    setIsEventsLoading(true);
    const q = query(collection(db, "events"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: CalendarEvent[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const urgency = normalizeUrgency(data.urgency);

        return {
          id: doc.id,
          title: data.title,
          urgency,
          assigneeId: data.assigneeId,
          description: data.description,
          departmentId: data.departmentId,
          status: data.status, // Add status field
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
        } as CalendarEvent;
      });
      setEvents(fetchedEvents);
      setIsEventsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync Users
  useEffect(() => {
    setIsUsersLoading(true);
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const fetchedUsers: User[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      setUsers(fetchedUsers);
      setIsUsersLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Sync Departments
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "departments"), (snapshot) => {
      const fetchedDepts: Department[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department));
      setDepartments(fetchedDepts);
    });
    return () => unsubscribe();
  }, []);

  // 4. Sync Department Users (for login system)
  useEffect(() => {
    const q = query(collection(db, "departmentUsers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: DepartmentUser[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date()
      } as DepartmentUser));
      setDepartmentUsers(fetchedUsers);
    });
    return () => unsubscribe();
  }, []);

  // 5. Sync Notifications
  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifs: AppNotification[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date()
      } as AppNotification));
      setNotifications(fetchedNotifs);
    });
    return () => unsubscribe();
  }, []);

  // 6. Sync Logs
  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: ActivityLog[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp instanceof Timestamp ? doc.data().timestamp.toDate() : new Date()
      } as ActivityLog));
      setLogs(fetchedLogs);
    });
    return () => unsubscribe();
  }, []);

  // --- Derived Permissions based on Login ---
  // Designer = logged in via Firebase Auth in AdminModal
  // Department User = logged in via DepartmentLoginModal
  // Guest = not logged in

  const currentDepartmentId = loggedInDeptUser?.departmentId || undefined;
  const currentDepartmentName = useMemo(() => {
    if (currentDepartmentId) {
      return departments.find(d => d.id === currentDepartmentId)?.name;
    }
    return null;
  }, [currentDepartmentId, departments]);

  // For now, isDesigner is determined by whether user clicks admin button and logs in with Firebase Auth
  // The main calendar is public by default, but edit functions are protected
  const [isDesigner, setIsDesigner] = useState(false);
  const [isKampanyaYapan, setIsKampanyaYapan] = useState(false);

  // --- Cookie-based Auto Login ---
  // Restore designer and kampanya yapan state from cookie (runs once on mount)
  useEffect(() => {
    const savedDesignerAuth = getCookie('designer_auth');
    const savedKampanyaYapanAuth = getCookie('kampanya_yapan_auth');
    console.log('🍪 Cookie Check - designer_auth:', savedDesignerAuth, 'kampanya_yapan_auth:', savedKampanyaYapanAuth);
    if (savedDesignerAuth === 'true') {
      console.log('✅ Setting isDesigner to true from cookie');
      setIsDesigner(true);
    }
    if (savedKampanyaYapanAuth === 'true') {
      console.log('✅ Setting isKampanyaYapan to true from cookie');
      setIsKampanyaYapan(true);
    }
  }, []);

  // Restore user from cookie when departmentUsers loads
  useEffect(() => {
    const savedDeptUserId = getCookie('dept_user_id');
    if (savedDeptUserId && departmentUsers.length > 0) {
      const user = departmentUsers.find(u => u.id === savedDeptUserId);
      if (user) {
        setLoggedInDeptUser(user);
      }
    }
  }, [departmentUsers]);

  // --- EmailJS Initialization ---
  useEffect(() => {
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    } catch (error) {
      console.warn('EmailJS Init Error:', error);
    }
  }, []);

  // --- Filter Logic ---
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 1. Search & UI Filters ONLY (Access control is handled at render time)
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(query) ||
        event.id.toLowerCase().includes(query);

      const matchesAssignee = filterAssignee ? event.assigneeId === filterAssignee : true;
      const matchesUrgency = filterUrgency ? event.urgency === filterUrgency : true;
      const matchesStatus = filterStatus ? (event.status || 'Planlandı') === filterStatus : true;

      // If a department user searches, they shouldn't find blurred events by content content,
      // but we still need them in the list to render them as "blurred".
      // So if search is active, we might need to filter strict. 
      // BUT for now, let's allow basic filtering and handle "blur" logic in rendering loop.

      return matchesSearch && matchesAssignee && matchesUrgency && matchesStatus;
    });
  }, [events, searchQuery, filterAssignee, filterUrgency, filterStatus]);

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

  // --- FIREBASE ACTIONS ---

  const seedDatabase = async () => {
    try {
      if (users.length === 0) {
        for (const user of INITIAL_USERS) {
          await setDoc(doc(db, "users", user.id), user);
        }
      }
      if (departments.length === 0) {
        for (const dept of INITIAL_DEPARTMENTS) {
          await setDoc(doc(db, "departments", dept.id), dept);
        }
      }
      if (events.length === 0) {
        for (const event of INITIAL_EVENTS) {
          const { id, ...eventData } = event;
          await setDoc(doc(db, "events", id), {
            ...eventData,
            date: Timestamp.fromDate(event.date)
          });
        }
      }
      addToast('Veritabanı varsayılan verilerle dolduruldu.', 'success');
    } catch (error) {
      console.error("Seeding error:", error);
      addToast('Veri yükleme hatası!', 'info');
    }
  };

  const handleAddUser = async (name: string, email: string, emoji: string) => {
    try {
      await addDoc(collection(db, "users"), {
        name,
        email,
        emoji
      });
      addToast(`${name} başarıyla eklendi.`, 'success');
    } catch (e) {
      addToast('Hata oluştu.', 'info');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, "users", id));
      addToast('Personel silindi.', 'info');
    } catch (e) {
      addToast('Silme hatası.', 'info');
    }
  };

  const handleAddDepartment = async (name: string) => {
    try {
      await addDoc(collection(db, "departments"), { name });
      addToast(`${name} birimi eklendi.`, 'success');
    } catch (e) {
      addToast('Hata oluştu.', 'info');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "departments", id));
      addToast('Birim silindi.', 'info');
    } catch (e) {
      addToast('Silme hatası.', 'info');
    }
  };

  const handleExportPdf = async () => {
    const calendarElement = document.getElementById('printable-calendar');
    if (!calendarElement) {
      addToast('Takvim alanı bulunamadı.', 'info');
      return;
    }

    try {
      addToast('PDF hazırlanıyor...', 'info');

      // 1. Create a clone to manipulate for export
      const clone = calendarElement.cloneNode(true) as HTMLElement;

      // 2. Wrap it in a container that forces a large width (for landscape) 
      //    and white background.
      const container = document.createElement('div');
      container.style.width = '1600px';
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      container.style.fontFamily = 'Inter, sans-serif';

      // 3. Add Header Details directly to HTML (Fixes Turkish char issues in PDF Text)
      const headerTitle = document.createElement('h2');
      headerTitle.innerText = `Kampanya Yönetimi Takvimi (CRM) - ${format(currentDate, 'MMMM yyyy', { locale: tr })}`;
      headerTitle.style.marginBottom = '10px';
      headerTitle.style.textAlign = 'left';
      headerTitle.style.fontSize = '24px';
      headerTitle.style.color = '#333';

      const headerDate = document.createElement('p');
      headerDate.innerText = `Oluşturulma Tarihi: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
      headerDate.style.marginBottom = '20px';
      headerDate.style.textAlign = 'right';
      headerDate.style.fontSize = '12px';
      headerDate.style.color = '#666';

      container.appendChild(headerTitle);
      container.appendChild(headerDate);
      container.appendChild(clone);
      document.body.appendChild(container);

      // 4. Force full height for all scrollable containers in the clone
      const scrollables = clone.querySelectorAll('.event-scroll');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.height = 'auto';
        (el as HTMLElement).style.maxHeight = 'none';
      });

      // 5. Expand text truncation for export (Remove line-clamp and truncate)
      const clampedTexts = clone.querySelectorAll('.line-clamp-2, .truncate');
      clampedTexts.forEach((el) => {
        el.classList.remove('line-clamp-2');
        el.classList.remove('truncate');
        (el as HTMLElement).style.display = 'block';
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.whiteSpace = 'normal'; // Allow wrapping
      });

      // 6. Capture the container
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      // 6. Clean up
      document.body.removeChild(container);

      // 7. Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Top margin

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      pdf.save(`kampanya-takvimi-${format(currentDate, 'yyyy-MM')}.pdf`);
      addToast('PDF indirildi.', 'success');
    } catch (error) {
      console.error('PDF Export Error:', error);
      addToast('PDF oluşturulurken hata oluştu.', 'info');
    }
  };

  const handleAddDepartmentUser = async (username: string, password: string, departmentId: string, isDesignerRole: boolean, isKampanyaYapanRole: boolean) => {
    try {
      await addDoc(collection(db, "departmentUsers"), {
        username,
        password,
        departmentId,
        isDesigner: isDesignerRole,
        isKampanyaYapan: isKampanyaYapanRole,
        createdAt: Timestamp.now()
      });
      addToast(`${username} kullanıcısı eklendi.`, 'success');
    } catch (e) {
      addToast('Kullanıcı eklenemedi.', 'info');
    }
  };

  const handleDeleteDepartmentUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, "departmentUsers", id));
      addToast('Kullanıcı silindi.', 'info');
    } catch (e) {
      addToast('Silme hatası.', 'info');
    }
  };

  const handleDepartmentLogin = (user: DepartmentUser) => {
    console.log('🔐 Login - user:', user);
    console.log('🔐 Login - user.isDesigner:', user.isDesigner, 'user.isKampanyaYapan:', user.isKampanyaYapan);
    setLoggedInDeptUser(user);
    setIsDeptLoginOpen(false);
    // If user has designer role, set isDesigner state
    if (user.isDesigner) {
      console.log('✅ Setting designer cookie');
      setIsDesigner(true);
      setCookie('designer_auth', 'true', 30);
    }
    // If user has kampanya yapan role, set isKampanyaYapan state
    if (user.isKampanyaYapan) {
      console.log('✅ Setting kampanya yapan cookie');
      setIsKampanyaYapan(true);
      setCookie('kampanya_yapan_auth', 'true', 30);
    }
    // Save user ID to cookie for auto-login
    setCookie('dept_user_id', user.id, 30);
    console.log('🍪 Cookies set - designer_auth:', getCookie('designer_auth'), 'kampanya_yapan_auth:', getCookie('kampanya_yapan_auth'), 'dept_user_id:', getCookie('dept_user_id'));
    addToast(`${user.username} olarak giriş yapıldı.`, 'success');
  };

  const handleDepartmentLogout = () => {
    setLoggedInDeptUser(null);
    setIsDesigner(false);
    setIsKampanyaYapan(false);
    // Clear cookies
    deleteCookie('designer_auth');
    deleteCookie('kampanya_yapan_auth');
    deleteCookie('dept_user_id');
    addToast('Çıkış yapıldı.', 'info');
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!loggedInDeptUser) return;

    try {
      const userRef = doc(db, "departmentUsers", loggedInDeptUser.id);
      await updateDoc(userRef, {
        password: newPassword
      });
      
      // Update local state
      setLoggedInDeptUser({
        ...loggedInDeptUser,
        password: newPassword
      });
      
      addToast('Şifreniz başarıyla güncellendi.', 'success');
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  };

  const handleAddEvent = async (
    title: string,
    urgency: UrgencyLevel,
    date: Date,
    assigneeId?: string,
    description?: string,
    departmentId?: string
  ) => {

    const eventData = {
      title,
      date: Timestamp.fromDate(date),
      urgency,
      assigneeId,
      description,
      departmentId
    };

    let newEventId = "";

    try {
      const docRef = await addDoc(collection(db, "events"), eventData);
      newEventId = docRef.id;
      addToast('Kampanya oluşturuldu.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Hata: Kampanya kaydedilemedi.', 'info');
      return;
    }

    if (assigneeId) {
      const assignedUser = users.find(u => u.id === assigneeId);
      if (assignedUser) {

        await addDoc(collection(db, "notifications"), {
          title: 'Görev Ataması Yapıldı',
          message: `${assignedUser.name} kişisine "${title}" görevi atandı.`,
          date: Timestamp.now(),
          isRead: false,
          type: 'email'
        });

        await addDoc(collection(db, "logs"), {
          message: `${title} kampanyası için ${assignedUser.name} kişiye görev ataması yapıldı (ID: ${newEventId})`,
          timestamp: Timestamp.now()
        });

        setIsSendingEmail(true);

        let emailMessage = `${format(date, 'd MMMM yyyy', { locale: tr })} tarihindeki "${title}" kampanyası için görevlendirildiniz.\nAciliyet: ${URGENCY_CONFIGS[urgency].label}`;
        if (description) emailMessage += `\n\nAçıklama:\n${description}`;

        if (departmentId) {
          const dept = departments.find(d => d.id === departmentId);
          if (dept) emailMessage += `\n\nTalep Eden Birim: ${dept.name}`;
        }

        const footerIdText = `Ref ID: #${newEventId.substring(0, 6).toUpperCase()}`;
        const emailSubject = `${title} - Kampanya Görev Ataması`;

        const templateParams = {
          to_email: assignedUser.email,
          to_name: assignedUser.name,
          name: assignedUser.name,
          email: assignedUser.email,
          title: emailSubject,
          message: emailMessage,
          ref_id: footerIdText,
        };

        try {
          console.log('📧 EmailJS Gönderiliyor...', {
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_TEMPLATE_ID,
            publicKey: EMAILJS_PUBLIC_KEY,
            params: templateParams
          });
          
          const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
          
          console.log('✅ EmailJS Başarılı:', response);
          addToast(`✅ E-posta gönderildi: ${assignedUser.email}`, 'success');
        } catch (error: any) {
          console.error('❌ EmailJS Hatası:', error);
          console.error('Hata Detayı:', {
            message: error.message,
            text: error.text,
            status: error.status
          });
          
          const errorMsg = error.text || error.message || 'Bilinmeyen hata';
          addToast(`❌ E-posta hatası: ${errorMsg}`, 'info');
          addToast('Mail istemcisi açılıyor...', 'info');
          
          setTimeout(() => {
            const subject = encodeURIComponent(`ACİL: Görev Ataması: ${title} - Kampanya Görev Ataması`);
            const body = encodeURIComponent(`Sayın ${assignedUser.name},\n\n${emailMessage}\n\n----------------\n${footerIdText}`);
            window.location.href = `mailto:${assignedUser.email}?subject=${subject}&body=${body}&importance=High`;
          }, 2000);
        } finally {
          setIsSendingEmail(false);
        }
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
      addToast('Kampanya silindi.', 'info');
    } catch (e) {
      addToast('Silme hatası.', 'info');
    }
  };

  const handleEditEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const updateData: any = { ...updates };

      // Convert Date to Timestamp if date is being updated
      if (updates.date && updates.date instanceof Date) {
        updateData.date = Timestamp.fromDate(updates.date);
      }

      await setDoc(doc(db, "events", eventId), updateData, { merge: true });
      addToast('Kampanya güncellendi.', 'success');

      // Do NOT close the modal here to allow seeing the status change
      // setViewEventId(null); 

      // Log the edit
      await addDoc(collection(db, "logs"), {
        message: `Kampanya güncellendi: ${updates.title || 'Başlık değiştirilmedi'} (ID: ${eventId.substring(0, 6).toUpperCase()})`,
        timestamp: Timestamp.now()
      });
    } catch (e) {
      console.error('Edit error:', e);
      addToast('Güncelleme hatası.', 'info');
    }
  };

  const handleBulkAddEvents = async (newEvents: Partial<CalendarEvent>[]) => {
    try {
      const batch = writeBatch(db);

      newEvents.forEach(evt => {
        const docRef = doc(collection(db, "events"));
        // Ensure date is a proper Date object or Timestamp
        const eventData = {
          ...evt,
          date: evt.date instanceof Date ? Timestamp.fromDate(evt.date) : evt.date,
        };
        batch.set(docRef, eventData);
      });

      await batch.commit();
      addToast(`${newEvents.length} kampanya başarıyla eklendi.`, 'success');

      // Log generic bulk action
      await addDoc(collection(db, "logs"), {
        message: `${newEvents.length} adet kampanya toplu olarak içe aktarıldı via CSV.`,
        timestamp: Timestamp.now()
      });

    } catch (e) {
      console.error(e);
      addToast('Toplu ekleme sırasında hata oluştu.', 'info');
      throw e; // Propagate error to caller
    }
  };

  const handleDeleteAllEvents = async () => {
    try {
      events.forEach(async (ev) => {
        await deleteDoc(doc(db, "events", ev.id));
      });
      addToast('Tüm kampanyalar siliniyor...', 'info');
    } catch (e) {
      addToast('Toplu silme hatası.', 'info');
    }
  };

  const openAddModal = (date?: Date) => {
    if (!isDesigner) return;
    setSelectedDate(date || new Date());
    setIsAddModalOpen(true);
  };

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(event.date, date));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterAssignee('');
    setFilterUrgency('');
    setFilterStatus('');
  };

  const hasActiveFilters = searchQuery || filterAssignee || filterUrgency || filterStatus;

  // Render Loading State if Initial Data Fetching
  if (isEventsLoading || isUsersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FE] flex-col gap-4">
        <Loader2 size={40} className="text-violet-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Veritabanına bağlanılıyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 text-gray-800">
      <div className="max-w-[1400px] mx-auto flex flex-col h-[calc(100vh-4rem)]">

        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  {isDesigner ? (
                    <span className="bg-gradient-to-r from-violet-700 via-indigo-700 to-violet-500 bg-clip-text text-transparent drop-shadow-sm">
                      Kampanya Yönetimi Takvimi (CRM)
                    </span>
                  ) : isKampanyaYapan ? (
                    <span className="bg-gradient-to-r from-violet-700 via-indigo-700 to-violet-500 bg-clip-text text-transparent drop-shadow-sm">
                      Kampanya Yapan Görünümü
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-violet-700 via-indigo-700 to-violet-500 bg-clip-text text-transparent drop-shadow-sm font-black">
                      {`Takvim: ${(currentDepartmentName || 'Misafir Görünümü').toLocaleUpperCase('tr-TR')}`}
                    </span>
                  )}
                  {!isDesigner && !isKampanyaYapan && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-normal lowercase">salt okunur</span>
                  )}
                  {isKampanyaYapan && (
                    <span className="text-xs bg-blue-200 text-blue-600 px-2 py-0.5 rounded-md font-normal lowercase">görüntüleme</span>
                  )}
                  {isDesigner && users.length === 0 && events.length === 0 && (
                    <button
                      onClick={seedDatabase}
                      className="ml-4 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200"
                      title="Veritabanı boş görünüyor. Örnek verileri yüklemek için tıkla."
                    >
                      <Database size={12} /> Verileri Yükle
                    </button>
                  )}
                </h1>
                {(isDesigner || isKampanyaYapan) && !loggedInDeptUser && (
                  <button
                    onClick={handleDepartmentLogout}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1 font-medium"
                    title="Çıkış Yap"
                  >
                    <LogOut size={14} /> Çıkış
                  </button>
                )}
              </div>
              {loggedInDeptUser && (
                <div className="flex items-center gap-2 mt-1 text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded w-fit">
                  <LogIn size={12} /> {currentDepartmentName} Birimi olarak giriş yapıldı
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="ml-2 text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded hover:bg-teal-200 flex items-center gap-1"
                    title="Şifre Değiştir"
                  >
                    <Lock size={10} /> Şifre
                  </button>
                  <button
                    onClick={handleDepartmentLogout}
                    className="ml-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 flex items-center gap-1"
                  >
                    <LogOut size={10} /> Çıkış
                  </button>
                </div>
              )}
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

              <button
                onClick={handleExportPdf}
                className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-colors bg-white border border-gray-100 rounded-lg shadow-sm"
                title="PDF Olarak İndir"
              >
                <Download size={20} />
              </button>

              {loggedInDeptUser && (
                <div className="flex flex-col items-end mr-2">
                  <span className="text-xs font-semibold text-gray-700">{loggedInDeptUser.username}</span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {loggedInDeptUser.isDesigner ? 'Designer' : loggedInDeptUser.isKampanyaYapan ? 'Kampanya Yapan' : 'Personel'}
                  </span>
                </div>
              )}

              <button
                onClick={() => setIsAdminOpen(true)}
                className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-colors bg-white border border-gray-100 rounded-lg shadow-sm"
                title="Yönetici Paneli"
              >
                <Users size={20} />
              </button>

              {isDesigner && (
                <>
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
                      onClear={() => {
                        logs.forEach(l => deleteDoc(doc(db, "logs", l.id)));
                      }}
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
                      onMarkAllRead={() => {
                        notifications.forEach(n => deleteDoc(doc(db, "notifications", n.id)));
                      }}
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

              <div className="relative">
                <div className="absolute left-3 top-2.5 w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-500 outline-none transition-all text-sm appearance-none"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="Planlandı">Planlandı</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal Edildi">İptal Edildi</option>
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

        {/* Printable Area Wrapper */}
        <div id="printable-calendar" className="p-1">

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
                  relative min-h-[120px] p-2 rounded-2xl border transition-colors transition-shadow duration-200 group
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

                  <div className="flex-1 overflow-y-auto event-scroll">
                    {dayEvents.map(event => {
                      // Visibility Logic
                      const isMyDeptInfo = currentDepartmentId && event.departmentId === currentDepartmentId;

                      // Designer: Everything clear, everything clickable
                      // Kampanya Yapan: Everything clear, clickable to view (but not edit)
                      // Department User: 
                      //    - Own Dept: Clear, NOT clickable (read-only)
                      //    - Other Dept: Blurred, NOT clickable
                      // Guest: Blurred, NOT clickable

                      let isBlurred = false;
                      let isClickable = false;

                      if (isDesigner) {
                        isBlurred = false;
                        isClickable = true;
                      } else if (isKampanyaYapan) {
                        // Kampanya Yapan: Can see all events, can click to view details (but not edit)
                        isBlurred = false;
                        isClickable = true;
                      } else if (loggedInDeptUser) {
                        if (isMyDeptInfo) {
                          // My department: Clear but Read-Only
                          isBlurred = false;
                          isClickable = false;
                        } else {
                          // Other department: Blurred and Read-Only
                          isBlurred = true;
                          isClickable = false;
                        }
                      } else {
                        // Guest
                        isBlurred = true;
                        isClickable = false;
                      }

                      return (
                        <EventBadge
                          key={event.id}
                          event={event}
                          user={users.find(u => u.id === event.assigneeId)}
                          onClick={(e) => setViewEventId(e.id)}
                          isBlurred={isBlurred}
                          isClickable={isClickable}
                        />
                      );
                    })}
                  </div>

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
        </div> {/* End of printable-calendar */}

        {/* Login Button (Bottom Left) - Only show when not logged in */}
        <div className="fixed bottom-4 left-4 z-40 flex gap-2">
          {!loggedInDeptUser && !isDesigner && (
            <button
              onClick={() => setIsDeptLoginOpen(true)}
              className="px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              <LogIn size={14} /> Kullanıcı Girişi
            </button>
          )}
        </div>

        <AddEventModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddEvent}
          initialDate={selectedDate}
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
          departmentUsers={departmentUsers}
          onAddDepartmentUser={handleAddDepartmentUser}
          onDeleteDepartmentUser={handleDeleteDepartmentUser}
          onBulkAddEvents={handleBulkAddEvents}
          onSetIsDesigner={setIsDesigner}
        />

        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={loggedInDeptUser}
          onChangePassword={handleChangePassword}
        />

        <EventDetailsModal
          event={viewEvent}
          onClose={() => setViewEventId(null)}
          assignee={users.find(u => u.id === viewEvent?.assigneeId)}
          departments={departments}
          users={users}
          isDesigner={isDesigner}
          isKampanyaYapan={isKampanyaYapan}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />

        <DepartmentLoginModal
          isOpen={isDeptLoginOpen}
          onClose={() => setIsDeptLoginOpen(false)}
          departmentUsers={departmentUsers}
          departments={departments}
          onLogin={handleDepartmentLogin}
        />

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>

      {/* Footer */}
      <footer className="mt-8 pb-4 text-center">
        <p className="text-xs text-gray-400">
          Designed by <span className="font-medium text-gray-500">Metin Özer</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
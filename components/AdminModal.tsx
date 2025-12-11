import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, ShieldCheck, Lock, Users, Calendar, AlertTriangle, Building, UserPlus, LogOut, FileText, Download } from 'lucide-react';
import { User, CalendarEvent, Department, DepartmentUser } from '../types';
import { AVAILABLE_EMOJIS, URGENCY_CONFIGS } from '../constants';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  events: CalendarEvent[];
  departments: Department[];
  onAddUser: (name: string, email: string, emoji: string) => void;
  onDeleteUser: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteAllEvents: () => void;
  onAddDepartment: (name: string) => void;
  onDeleteDepartment: (id: string) => void;
  departmentUsers: DepartmentUser[];
  onAddDepartmentUser: (username: string, password: string, departmentId: string, isDesigner: boolean, isKampanyaYapan: boolean) => void;
  onDeleteDepartmentUser: (id: string) => void;
  onBulkAddEvents: (events: Partial<CalendarEvent>[]) => Promise<void>;
  onSetIsDesigner: (value: boolean) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  users,
  events,
  departments,
  onAddUser,
  onDeleteUser,
  onDeleteEvent,
  onDeleteAllEvents,
  onAddDepartment,
  onDeleteDepartment,
  departmentUsers,
  onAddDepartmentUser,
  onDeleteDepartmentUser,
  onBulkAddEvents,
  onSetIsDesigner
}) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'departments' | 'dept-users' | 'import-export'>('users');
  const [importText, setImportText] = useState('');

  // Loading state for auth check
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // User Form States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  // Department Form States
  const [newDeptName, setNewDeptName] = useState('');

  // Department User Form States
  const [newDeptUsername, setNewDeptUsername] = useState('');
  const [newDeptPassword, setNewDeptPassword] = useState('');
  const [newDeptUserDeptId, setNewDeptUserDeptId] = useState('');
  const [newDeptUserIsDesigner, setNewDeptUserIsDesigner] = useState(false);
  const [newDeptUserIsKampanyaYapan, setNewDeptUserIsKampanyaYapan] = useState(false);

  const [error, setError] = useState('');

  // Delete All Confirmation State
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsAuthLoading(false);
      // Only set isDesigner to true if Firebase user exists
      // Don't set to false - that would override cookie-based department user login
      if (user) {
        onSetIsDesigner(true);
      }
    });
    return () => unsubscribe();
  }, [onSetIsDesigner]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success is handled by onAuthStateChanged
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Hatalı e-posta veya şifre.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Çok fazla başarısız deneme. Lütfen bekleyin.');
      } else {
        setError('Giriş yapılamadı: ' + err.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };



  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newEmail.trim()) {
      setError('Lütfen isim ve e-posta alanlarını doldurunuz.');
      return;
    }

    if (!selectedEmoji) {
      setError('Lütfen bir emoji seçiniz.');
      return;
    }

    try {
      await onAddUser(newName, newEmail, selectedEmoji);

      // Reset form
      setNewName('');
      setNewEmail('');
      setSelectedEmoji('');
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Kullanıcı eklenirken hata oluştu: ' + err.message);
    }
  };

  const handleAddDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      setError('Birim adı boş olamaz.');
      return;
    }
    onAddDepartment(newDeptName);
    setNewDeptName('');
    setError('');
  };

  // --- Department User Management Handler ---
  const handleAddDeptUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptUsername.trim() || !newDeptPassword.trim() || !newDeptUserDeptId) {
      setError('Tüm alanları doldurunuz.');
      return;
    }

    // Check if username already exists
    const existingUser = departmentUsers.find(
      u => u.username.toLowerCase() === newDeptUsername.toLowerCase()
    );
    if (existingUser) {
      setError('Bu kullanıcı adı zaten kullanılıyor.');
      return;
    }

    onAddDepartmentUser(newDeptUsername, newDeptPassword, newDeptUserDeptId, newDeptUserIsDesigner, newDeptUserIsKampanyaYapan);
    setNewDeptUsername('');
    setNewDeptPassword('');
    setNewDeptUserDeptId('');
    setNewDeptUserIsDesigner(false);
    setNewDeptUserIsKampanyaYapan(false);
    setError('');
  };

  // --- Import / Export Handlers ---
  const handleExportCSV = () => {
    // Header
    let csvContent = "Title,Date,Urgency,Description,Department,Assignee\n";

    events.forEach(ev => {
      const dept = departments.find(d => d.id === ev.departmentId)?.name || '';
      const user = users.find(u => u.id === ev.assigneeId)?.name || '';
      const dateStr = format(ev.date, 'yyyy-MM-dd');
      // Escape commas in content
      const safeTitle = `"${ev.title.replace(/"/g, '""')}"`;
      const safeDesc = `"${(ev.description || '').replace(/"/g, '""')}"`;
      const safeDept = `"${dept.replace(/"/g, '""')}"`;
      const safeUser = `"${user.replace(/"/g, '""')}"`;

      csvContent += `${safeTitle},${dateStr},${ev.urgency},${safeDesc},${safeDept},${safeUser}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `kampanya_takvimi_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async () => {
    if (!importText.trim()) {
      setError('Lütfen CSV verisi giriniz.');
      return;
    }

    try {
      const lines = importText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase()); // Title, Date, Urgency...

      // Basic validation
      if (lines.length < 2) {
        setError('CSV içeriği boş veya sadece başlıktan oluşuyor.');
        return;
      }

      const newEvents: Partial<CalendarEvent>[] = [];

      // Helper to parse CSV line respecting quotes
      const parseCSVLine = (line: string) => {
        const result = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') inQuotes = !inQuotes;
          else if (line[i] === ',' && !inQuotes) {
            result.push(line.substring(start, i).replace(/^"|"$/g, '').replace(/""/g, '"'));
            start = i + 1;
          }
        }
        result.push(line.substring(start).replace(/^"|"$/g, '').replace(/""/g, '"'));
        return result;
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        // Map based on index assuming standard order: Title, Date, Urgency, Desc, Dept, Assignee
        // Or strictly strictly follow the order we export: Title,Date,Urgency,Description,Department,Assignee

        if (cols.length < 3) continue; // Skip invalid lines

        const title = cols[0];
        const dateStr = cols[1];
        const urgency = cols[2] as any;
        const description = cols[3];
        const deptName = cols[4];
        const userName = cols[5];

        // Resolve IDs
        const deptId = departments.find(d => d.name === deptName)?.id;
        const assigneeId = users.find(u => u.name === userName)?.id;

        newEvents.push({
          title,
          date: new Date(dateStr),
          urgency: URGENCY_CONFIGS[urgency] ? urgency : 'Medium',
          description,
          departmentId: deptId,
          assigneeId: assigneeId
        });
      }

      await onBulkAddEvents(newEvents);
      setImportText('');
      setError('');

    } catch (e) {
      console.error(e);
      setError('Import hatası: CSV formatını kontrol ediniz.');
    }
  };

  const handleDeleteAllClick = () => {
    if (isDeleteConfirming) {
      onDeleteAllEvents();
      setIsDeleteConfirming(false);
    } else {
      setIsDeleteConfirming(true);
      // Reset confirmation state after 3 seconds
      setTimeout(() => setIsDeleteConfirming(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col h-[80vh] md:h-auto md:max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="text-violet-600" size={24} />
            <h2 className="text-lg font-bold">Yönetici Paneli</h2>
          </div>
          <div className="flex items-center gap-2">
            {authUser && (
              <button
                onClick={handleLogout}
                className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1"
              >
                <LogOut size={14} /> Çıkış
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {!authUser ? (
          // Login View
          <form onSubmit={handleLogin} className="p-8 flex flex-col gap-4 items-center justify-center flex-1">
            <div className="p-4 bg-violet-50 rounded-full text-violet-500 mb-2">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Admin Girişi</h3>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Yönetim paneline erişmek için yetkili e-posta ve şifrenizi giriniz.
            </p>

            <div className="w-full max-w-xs space-y-3">
              <input
                type="email"
                placeholder="E-posta"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                autoFocus
              />
              <input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
              />
              {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center">{error}</div>}
            </div>

            <button type="submit" className="w-full max-w-xs bg-violet-600 text-white py-2 rounded-lg font-medium hover:bg-violet-700 transition shadow-lg shadow-violet-200 mt-2">
              Giriş Yap
            </button>
          </form>
        ) : (
          // Authenticated View
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Users size={16} /> Personel
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'departments' ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Building size={16} /> Birimler
              </button>
              <button
                onClick={() => setActiveTab('dept-users')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dept-users' ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <UserPlus size={16} /> Birim Kullanıcıları
              </button>
              <button
                onClick={() => setActiveTab('import-export')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'import-export' ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <FileText size={16} /> İçe/Dışa Aktar
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'events' ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Calendar size={16} /> Kampanyalar
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 relative">

              {/* --- USERS TAB --- */}
              {activeTab === 'users' && (
                <div className="flex flex-col h-full">
                  {/* Add User Form */}
                  <div className="p-6 bg-white border-b space-y-4 shrink-0">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Yeni Personel Ekle</h3>
                    <form onSubmit={handleAddSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">İsim Soyisim</label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Örn: Ali Veli"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">E-posta</label>
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="ali@mail.com"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-2 block">Emoji Seçimi</label>

                        <div className="grid grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 max-h-32 overflow-y-auto custom-scrollbar">
                          {AVAILABLE_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setSelectedEmoji(emoji)}
                              className={`
                                w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all
                                ${selectedEmoji === emoji
                                  ? 'bg-violet-600 ring-2 ring-violet-300 transform scale-110 shadow-md'
                                  : 'bg-white hover:bg-gray-200'}
                              `}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <p className="text-red-500 text-xs h-4">{error}</p>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 shadow-lg shadow-violet-200 text-sm"
                        >
                          <Plus size={16} /> Ekle
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Users List */}
                  <div className="p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Mevcut Personel ({users.length})</h3>
                    <div className="space-y-2">
                      {users.map(user => (
                        <div key={user.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-xl shadow-sm">
                              {user.emoji}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Personeli Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {users.length === 0 && (
                        <p className="text-gray-400 text-center py-4 text-sm">Henüz personel eklenmemiş.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- DEPARTMENTS TAB --- */}
              {activeTab === 'departments' && (
                <div className="flex flex-col h-full">
                  {/* Add Department Form */}
                  <div className="p-6 bg-white border-b space-y-4 shrink-0">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Yeni İş Birimi Ekle</h3>
                    <form onSubmit={handleAddDeptSubmit} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Birim Adı</label>
                        <input
                          type="text"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          placeholder="Örn: Pazarlama, İK..."
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                        />
                      </div>
                      <button type="submit" className="mt-5 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 shadow-lg shadow-violet-200 text-sm">
                        <Plus size={16} /> Ekle
                      </button>
                    </form>
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                  </div>

                  {/* Departments List */}
                  <div className="p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Tanımlı Birimler ({departments.length})</h3>
                    <div className="space-y-2">
                      {departments.map(dept => (
                        <div key={dept.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shadow-sm">
                              <Building size={18} />
                            </div>
                            <p className="font-semibold text-gray-800 text-sm">{dept.name}</p>
                          </div>
                          <button
                            onClick={() => onDeleteDepartment(dept.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Birimi Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {departments.length === 0 && (
                        <p className="text-gray-400 text-center py-4 text-sm">Henüz birim eklenmemiş.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- DEPARTMENT USERS TAB --- */}
              {activeTab === 'dept-users' && (
                <div className="flex flex-col h-full">
                  {/* Add Department User Form */}
                  <div className="p-6 bg-white border-b space-y-4 shrink-0">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <UserPlus size={14} /> Yeni Birim Kullanıcısı Ekle
                    </h3>

                    <form onSubmit={handleAddDeptUser} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">Kullanıcı Adı</label>
                          <input
                            type="text"
                            value={newDeptUsername}
                            onChange={(e) => setNewDeptUsername(e.target.value)}
                            placeholder="ornek_kullanici"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">Şifre</label>
                          <input
                            type="text"
                            value={newDeptPassword}
                            onChange={(e) => setNewDeptPassword(e.target.value)}
                            placeholder="sifre123"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">Birim</label>
                          <select
                            value={newDeptUserDeptId}
                            onChange={(e) => setNewDeptUserDeptId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm bg-white"
                          >
                            <option value="">Seçiniz</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newDeptUserIsDesigner}
                            onChange={(e) => {
                              setNewDeptUserIsDesigner(e.target.checked);
                              if (e.target.checked) setNewDeptUserIsKampanyaYapan(false);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm text-gray-700">Designer Yetkisi Ver</span>
                          <span className="text-[10px] text-gray-400">(Kampanya düzenleme izni)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newDeptUserIsKampanyaYapan}
                            onChange={(e) => {
                              setNewDeptUserIsKampanyaYapan(e.target.checked);
                              if (e.target.checked) setNewDeptUserIsDesigner(false);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Kampanya Yapan Yetkisi Ver</span>
                          <span className="text-[10px] text-gray-400">(Tüm kampanyaları görüntüleme izni)</span>
                        </label>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-red-500 text-xs h-4">{error}</p>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm flex items-center gap-2"
                        >
                          <Plus size={16} /> Ekle
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Department Users List */}
                  <div className="p-6 flex-1 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">
                      Mevcut Kullanıcılar ({departmentUsers.length})
                    </h3>
                    <div className="space-y-2">
                      {departmentUsers.map(user => {
                        const dept = departments.find(d => d.id === user.departmentId);
                        return (
                          <div key={user.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.isDesigner ? 'bg-violet-100 text-violet-600' : user.isKampanyaYapan ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600'}`}>
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800 text-sm">{user.username}</p>
                                  <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 font-mono">{user.password}</span>
                                  {user.isDesigner && (
                                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">Designer</span>
                                  )}
                                  {user.isKampanyaYapan && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Kampanya Yapan</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{dept ? dept.name : 'Silinmiş Birim'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => onDeleteDepartmentUser(user.id)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Kullanıcıyı Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                      {departmentUsers.length === 0 && (
                        <p className="text-gray-400 text-center py-4 text-sm">Henüz birim kullanıcısı eklenmemiş.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- EVENTS TAB --- */}
              {activeTab === 'events' && (
                <div className="flex flex-col h-full">
                  <div className="p-6 bg-red-50 border-b border-red-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 text-red-800">
                      <AlertTriangle size={20} />
                      <div>
                        <h4 className="font-bold text-sm">Toplu İşlem</h4>
                        <p className="text-xs text-red-600 opacity-80">Tüm takvimi sıfırlamak için kullanılır.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteAllClick}
                      disabled={events.length === 0}
                      className={`
                          px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition-all
                          ${isDeleteConfirming
                          ? 'bg-red-800 hover:bg-red-900 ring-2 ring-red-400 ring-offset-1'
                          : 'bg-red-600 hover:bg-red-700'} 
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                      {isDeleteConfirming ? 'EMİN MİSİN?' : 'TÜMÜNÜ SİL'}
                    </button>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Aktif Kampanyalar ({events.length})</h3>
                    <div className="space-y-2 pb-6">
                      {events.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                          <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-gray-500 text-sm">Henüz kampanya bulunmuyor.</p>
                        </div>
                      ) : (
                        [...events].sort((a, b) => b.date.getTime() - a.date.getTime()).map(event => {
                          const config = URGENCY_CONFIGS[event.urgency];
                          return (
                            <div key={event.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-2 h-10 rounded-full ${config.colorBg} border border-opacity-20 ${config.colorBorder}`}></div>
                                <div>
                                  <h4 className="font-semibold text-gray-800 text-sm">{event.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                      {format(event.date, 'd MMMM yyyy', { locale: tr })}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${config.colorBg} ${config.colorText} border border-opacity-20 ${config.colorBorder}`}>
                                      {config.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => onDeleteEvent(event.id)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Kampanyayı Sil"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- IMPORT / EXPORT TAB --- */}
              {activeTab === 'import-export' && (
                <div className="flex flex-col h-full bg-slate-50">
                  <div className="p-6 space-y-8">

                    {/* Export Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-violet-100 text-violet-600 rounded-lg">
                          <Download size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-800 mb-1">Dışa Aktar (CSV)</h3>
                          <p className="text-xs text-gray-500 mb-4">
                            Mevcut tüm kampanyaları, birimleri ve atanan kişileri içeren bir CSV dosyası indirir.
                            Yedekleme veya Excel'de raporlama için kullanabilirsiniz.
                          </p>
                          <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center gap-2"
                          >
                            <Download size={16} /> İndir (.csv)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Import Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                          <FileText size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-800 mb-1">İçe Aktar (CSV Yükle)</h3>
                          <p className="text-xs text-gray-500 mb-4">
                            CSV formatındaki verileri yapıştırarak toplu kampanya ekleyebilirsiniz.
                            Format: `Title, Date, Urgency, Description, Department, Assignee`
                          </p>
                          <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className="w-full h-32 p-3 text-xs font-mono border rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder='Örn: "Yaz Kampanyası",2024-06-01,High,"Açıklama","Pazarlama","Ahmet Yılmaz"'
                          />
                          <div className="flex justify-between items-center">
                            {error && <span className="text-red-500 text-xs">{error}</span>}
                            <button
                              onClick={handleImportCSV}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-start gap-2 ml-auto"
                            >
                              <FileText size={16} /> İçe Aktar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
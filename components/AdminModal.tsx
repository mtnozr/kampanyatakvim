import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, ShieldCheck, Lock, Users, Calendar, AlertTriangle, Building, Network, LogOut, FileText, Download, Upload } from 'lucide-react';
import { User, CalendarEvent, Department, IpAccessConfig } from '../types';
import { AVAILABLE_EMOJIS, URGENCY_CONFIGS } from '../constants';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  events: CalendarEvent[];
  departments: Department[];
  onAddUser: (name: string, email: string, emoji: string, avatarUrl?: string) => void;
  onDeleteUser: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteAllEvents: () => void;
  onAddDepartment: (name: string) => void;
  onDeleteDepartment: (id: string) => void;
  ipConfig: IpAccessConfig;
  onUpdateIpConfig: (config: IpAccessConfig) => void;
  onBulkAddEvents: (events: Partial<CalendarEvent>[]) => Promise<void>;
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
  ipConfig,
  onUpdateIpConfig,
  onBulkAddEvents
}) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'departments' | 'access' | 'import-export'>('users');
  const [importText, setImportText] = useState('');

  // Loading state for auth check
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // User Form States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string>('');

  // Department Form States
  const [newDeptName, setNewDeptName] = useState('');

  // Access / IP Form States
  const [newDesignerIp, setNewDesignerIp] = useState('');
  const [newMapIp, setNewMapIp] = useState('');
  const [newMapDeptId, setNewMapDeptId] = useState('');

  const [error, setError] = useState('');

  // Delete All Confirmation State
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Clear emoji selection
      setSelectedEmoji('');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newEmail.trim()) {
      setError('Lütfen isim ve e-posta alanlarını doldurunuz.');
      return;
    }

    if (!selectedEmoji && !avatarFile) {
      setError('Lütfen bir emoji seçiniz veya fotoğraf yükleyiniz.');
      return;
    }

    setIsUploading(true);

    try {
      let avatarUrl = '';

      if (avatarFile) {
        // Upload file
        const timestamp = Date.now();
        const fileRef = ref(storage, `user-avatars/${timestamp}_${avatarFile.name}`);
        const snapshot = await uploadBytes(fileRef, avatarFile);
        avatarUrl = await getDownloadURL(snapshot.ref);
      }

      // We pass generic emoji if avatar exists, or the selected emoji
      // If avatarUrl exists, EventBadge prefers it over emoji.
      // But we can pass a fallback emoji just in case.
      const emojiToSave = selectedEmoji || '👤';

      await onAddUser(newName, newEmail, emojiToSave, avatarUrl);

      // Reset form
      setNewName('');
      setNewEmail('');
      setSelectedEmoji('');
      setAvatarFile(null);
      setUploadPreview('');
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Kullanıcı eklenirken hata oluştu: ' + err.message);
    } finally {
      setIsUploading(false);
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

  // --- Access Management Handlers ---
  const handleAddDesignerIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignerIp.trim()) {
      setError('IP adresi boş olamaz.');
      return;
    }
    const currentIps = ipConfig.designerIps || [];
    if (currentIps.includes(newDesignerIp)) {
      setError('Bu IP zaten ekli.');
      return;
    }

    onUpdateIpConfig({
      ...ipConfig,
      designerIps: [...currentIps, newDesignerIp]
    });
    setNewDesignerIp('');
    setError('');
  };

  const handleRemoveDesignerIp = (ipToRemove: string) => {
    const currentIps = ipConfig.designerIps || [];
    const newIps = currentIps.filter(ip => ip !== ipToRemove);
    onUpdateIpConfig({
      ...ipConfig,
      designerIps: newIps
    });
  };

  const handleAddIpMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapIp.trim() || !newMapDeptId) {
      setError('Lütfen IP adresi ve birim seçiniz.');
      return;
    }

    // Split by comma or whitespace to support multiple IPs
    const ipsToAdd = newMapIp.split(/[,\s]+/).filter(ip => ip.trim() !== '');

    // Check for existing IPs
    const existingIps = ipsToAdd.filter(ip => ipConfig.departmentIps[ip]);

    if (existingIps.length > 0) {
      setError(`Şu IP'ler zaten tanımlı: ${existingIps.join(', ')}`);
      return;
    }

    const updatedMap = { ...ipConfig.departmentIps };
    ipsToAdd.forEach(ip => {
      updatedMap[ip] = newMapDeptId;
    });

    onUpdateIpConfig({ ...ipConfig, departmentIps: updatedMap });

    setNewMapIp('');
    setNewMapDeptId('');
    setError('');
  };

  const handleDeleteIpMapping = (ip: string) => {
    const updatedMap = { ...ipConfig.departmentIps };
    delete updatedMap[ip];
    onUpdateIpConfig({ ...ipConfig, departmentIps: updatedMap });
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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
                onClick={() => setActiveTab('access')}
                className={`flex-1 py-3 px-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'access' ? 'border-violet-600 text-violet-600 bg-violet-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Network size={16} /> Erişim
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
                        <label className="text-xs font-semibold text-gray-500 mb-2 block">Avatar Seçimi (Emoji veya Fotoğraf)</label>

                        {/* File Upload Area */}
                        <div className="mb-3">
                          <label
                            className={`
                              flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                              ${avatarFile ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 hover:border-violet-400 text-gray-500'}
                            `}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            {uploadPreview ? (
                              <div className="flex items-center gap-3">
                                <img src={uploadPreview} alt="Preview" className="w-8 h-8 rounded-full object-cover shadow-sm bg-white" />
                                <span className="text-sm font-medium">Fotoğraf Seçildi Değiştir</span>
                              </div>
                            ) : (
                              <>
                                <Upload size={18} />
                                <span className="text-sm">Fotoğraf Seç (İsteğe Bağlı)</span>
                              </>
                            )}
                          </label>
                        </div>

                        {/* Emoji Divider */}
                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-gray-100"></div>
                          <span className="flex-shrink-0 mx-2 text-[10px] text-gray-400 font-medium uppercase">Veya Emoji Seç</span>
                          <div className="flex-grow border-t border-gray-100"></div>
                        </div>

                        <div className={`grid grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 max-h-32 overflow-y-auto custom-scrollbar ${avatarFile ? 'opacity-50 pointer-events-none' : ''}`}>
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
                          disabled={isUploading}
                          className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 shadow-lg shadow-violet-200 text-sm disabled:opacity-70 disabled:cursor-wait"
                        >
                          {isUploading ? (
                            <>Yükleniyor...</>
                          ) : (
                            <><Plus size={16} /> Ekle</>
                          )}
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
                            {user.emoji ? (
                              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-xl shadow-sm">
                                {user.emoji}
                              </div>
                            ) : (
                              <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full bg-gray-200" />
                            )}
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

              {/* --- ACCESS (IP) TAB --- */}
              {activeTab === 'access' && (
                <div className="flex flex-col h-full">
                  {/* Designer IP Config */}
                  <div className="p-6 bg-white border-b space-y-4 shrink-0">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <ShieldCheck size={14} /> Admin (Designer) Erişimi
                    </h3>

                    {/* Add Designer IP Form */}
                    <form onSubmit={handleAddDesignerIp} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Yeni Admin IP Ekle</label>
                        <input
                          type="text"
                          value={newDesignerIp}
                          onChange={(e) => setNewDesignerIp(e.target.value)}
                          placeholder="Örn: 88.243..."
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm flex items-center gap-2"
                      >
                        <Plus size={16} /> Ekle
                      </button>
                    </form>

                    {/* Designer IPs List */}
                    <div className="space-y-2 mt-2">
                      {(ipConfig.designerIps || []).map((ip) => (
                        <div key={ip} className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                          <code className="text-sm text-slate-700 font-mono font-bold">{ip}</code>
                          <button
                            onClick={() => handleRemoveDesignerIp(ip)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="IP'yi Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(ipConfig.designerIps || []).length === 0 && (
                        <p className="text-xs text-orange-500 bg-orange-50 p-2 rounded border border-orange-100 italic">
                          ⚠️ Hiçbir yönetici IP adresi tanımlı değil.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Department IP Mappings */}
                  <div className="p-6 flex-1 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Network size={14} /> Birim IP Eşleştirmeleri
                    </h3>

                    {/* Add Mapping Form */}
                    <form onSubmit={handleAddIpMapping} className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">IP Adresi</label>
                          <input
                            type="text"
                            value={newMapIp}
                            onChange={(e) => setNewMapIp(e.target.value)}
                            placeholder="192.168.1.X"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Birim</label>
                          <select
                            value={newMapDeptId}
                            onChange={(e) => setNewMapDeptId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm bg-white"
                          >
                            <option value="">Seçiniz</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-red-500 text-xs h-4">{error}</p>
                        <button type="submit" className="px-4 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-xs font-bold shadow-sm">
                          Ekle
                        </button>
                      </div>
                    </form>

                    {/* Mappings List */}
                    <div className="space-y-2">
                      {Object.entries(ipConfig.departmentIps).map(([ip, deptId]) => {
                        const dept = departments.find(d => d.id === deptId);
                        return (
                          <div key={ip} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                            <div>
                              <p className="font-mono text-sm text-gray-800 font-bold">{ip}</p>
                              <p className="text-xs text-gray-500">{dept ? dept.name : 'Silinmiş Birim'}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteIpMapping(ip)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eşleştirmeyi Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                      {Object.keys(ipConfig.departmentIps).length === 0 && (
                        <p className="text-gray-400 text-center py-4 text-sm">Henüz IP tanımlaması yapılmamış.</p>
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
                          <Upload size={24} />
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
                              <Upload size={16} /> İçe Aktar
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
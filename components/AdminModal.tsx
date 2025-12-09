import React, { useState } from 'react';
import { X, Trash2, Plus, ShieldCheck, Lock, Users, Calendar, AlertTriangle, Building, Network } from 'lucide-react';
import { User, CalendarEvent, Department, IpAccessConfig } from '../types';
import { AVAILABLE_EMOJIS, URGENCY_CONFIGS } from '../constants';
import { format } from 'date-fns';
import tr from 'date-fns/locale/tr';

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
  ipConfig: IpAccessConfig;
  onUpdateIpConfig: (config: IpAccessConfig) => void;
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
  onUpdateIpConfig
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'departments' | 'access'>('users');
  
  // User Form States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  
  // Department Form States
  const [newDeptName, setNewDeptName] = useState('');

  // Access / IP Form States
  const [tempDesignerIp, setTempDesignerIp] = useState(ipConfig?.designerIp || '');
  const [newMapIp, setNewMapIp] = useState('');
  const [newMapDeptId, setNewMapDeptId] = useState('');

  const [error, setError] = useState('');

  // Delete All Confirmation State
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Hatalı şifre!');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim() || !newEmail.trim()) {
      setError('Lütfen isim ve e-posta alanlarını doldurunuz.');
      return;
    }

    if (!selectedEmoji) {
       setError('Lütfen bir emoji/avatar seçiniz.');
       return;
    }

    onAddUser(newName, newEmail, selectedEmoji);
    
    // Reset form
    setNewName('');
    setNewEmail('');
    setSelectedEmoji('');
    setError('');
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
  const handleUpdateDesignerIp = () => {
    if (!tempDesignerIp.trim()) {
        setError('Admin IP boş olamaz.');
        return;
    }
    onUpdateIpConfig({
        ...ipConfig,
        designerIp: tempDesignerIp
    });
    setError('');
  };

  const handleAddIpMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapIp.trim() || !newMapDeptId) {
        setError('Lütfen IP adresi ve birim seçiniz.');
        return;
    }
    
    // Check if IP already exists
    if (ipConfig.departmentIps[newMapIp]) {
        setError('Bu IP adresi zaten tanımlı.');
        return;
    }

    const updatedMap = { ...ipConfig.departmentIps, [newMapIp]: newMapDeptId };
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {!isAuthenticated ? (
          // Login View
          <form onSubmit={handleLogin} className="p-8 flex flex-col gap-4 items-center justify-center flex-1">
             <div className="p-4 bg-violet-50 rounded-full text-violet-500 mb-2">
                <Lock size={32} />
             </div>
             <h3 className="text-xl font-semibold text-gray-800">Giriş Yapın</h3>
             <p className="text-sm text-gray-500 text-center max-w-xs">
               Yönetim paneline erişmek için şifreyi giriniz.
             </p>
             
             <div className="w-full max-w-xs space-y-2">
               <input 
                 type="password" 
                 placeholder="Şifre"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-center tracking-widest"
                 autoFocus
               />
               {error && <p className="text-red-500 text-sm text-center">{error}</p>}
             </div>
             
             <button type="submit" className="w-full max-w-xs bg-violet-600 text-white py-2 rounded-lg font-medium hover:bg-violet-700 transition">
               Giriş
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
                          <label className="text-xs font-semibold text-gray-500 mb-2 block">Avatar Seçimi</label>
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
                          <button type="submit" className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 shadow-lg shadow-violet-200 text-sm">
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
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Designer IP Adresi</label>
                                <input 
                                    type="text" 
                                    value={tempDesignerIp}
                                    onChange={(e) => setTempDesignerIp(e.target.value)}
                                    placeholder="Örn: 192.168.1.10"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={handleUpdateDesignerIp}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm"
                            >
                                Güncelle
                            </button>
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
                           events.map(event => {
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
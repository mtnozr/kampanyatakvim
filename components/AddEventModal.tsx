import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, AlignLeft, AlertTriangle, Building } from 'lucide-react';
import { UrgencyLevel, User, Department } from '../types';
import { URGENCY_CONFIGS, TURKISH_HOLIDAYS } from '../constants';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, urgency: UrgencyLevel, date: Date, assigneeId?: string, description?: string, departmentId?: string) => void;
  initialDate?: Date;
  users: User[];
  departments: Department[];
}

export const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAdd, initialDate, users, departments }) => {
  const [title, setTitle] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Medium');
  const [dateStr, setDateStr] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [holidayWarning, setHolidayWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialDate) {
      // Format date for input type="date" (YYYY-MM-DD)
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setDateStr(formattedDate);
      checkHoliday(formattedDate);
    } else {
      setTitle('');
      setUrgency('Medium');
      setAssigneeId('');
      setDepartmentId('');
      setDescription('');
      setHolidayWarning(null);
    }
  }, [isOpen, initialDate]);

  const checkHoliday = (date: string) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

    if (TURKISH_HOLIDAYS[date]) {
      setHolidayWarning(TURKISH_HOLIDAYS[date]);
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      setHolidayWarning('Hafta Sonu');
    } else {
      setHolidayWarning(null);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateStr(newDate);
    checkHoliday(newDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateStr || !assigneeId || !departmentId) {
      alert('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    const selectedDate = new Date(dateStr);
    onAdd(title, urgency, selectedDate, assigneeId, description, departmentId);
    onClose();
    setTitle('');
    setAssigneeId('');
    setDepartmentId('');
    setDescription('');
    setHolidayWarning(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Kampanya Ekle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Holiday Warning Popup Inside Modal */}
        {holidayWarning && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-800 text-sm">Resmi Tatil Uyarısı</h4>
              <p className="text-amber-700 text-xs mt-1">
                Seçilen tarih <strong>{holidayWarning}</strong> gününe denk gelmektedir.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kampanya Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kampanya adı girin..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarih <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={handleDateChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Görev Atanan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 pl-8 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all appearance-none bg-white text-sm"
                  required
                >
                  <option value="">Seçiniz</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <UserPlus className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Talep Eden Birim <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 pl-8 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all appearance-none bg-white text-sm"
                  required
                >
                  <option value="">Seçiniz</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <Building className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <AlertCircle size={14} /> Aciliyet Durumu <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(URGENCY_CONFIGS) as UrgencyLevel[]).map((level) => {
                const config = URGENCY_CONFIGS[level];
                const isSelected = urgency === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium text-left border transition-all
                      ${isSelected
                        ? `${config.colorBg} ${config.colorBorder} border ring-1 ring-offset-1 ring-gray-300`
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}
                    `}
                  >
                    <span className={isSelected ? config.colorText : ''}>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <AlignLeft size={14} /> Açıklama <span className="text-gray-400 font-normal text-xs">(İsteğe Bağlı)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kampanya detayları, notlar vb..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-lg shadow-violet-200 transition-all transform active:scale-95"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { X, Lock, Save } from 'lucide-react';
import { DepartmentUser } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DepartmentUser | null;
  onChangePassword: (newPassword: string) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onChangePassword
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Lütfen tüm alanları doldurunuz.');
      return;
    }

    if (currentPassword !== currentUser.password) {
      setError('Mevcut şifre hatalı.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);
    try {
      await onChangePassword(newPassword);
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Şifre değiştirilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Lock size={20} className="text-violet-600" />
            Şifre Değiştir
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Şifre</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-lg shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? 'Kaydediliyor...' : <><Save size={16} /> Kaydet</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

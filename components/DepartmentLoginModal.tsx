import React, { useState } from 'react';
import { X, LogIn, User as UserIcon, Lock } from 'lucide-react';
import { DepartmentUser, Department } from '../types';

interface DepartmentLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    departmentUsers: DepartmentUser[];
    departments: Department[];
    onLogin: (user: DepartmentUser) => void;
}

export const DepartmentLoginModal: React.FC<DepartmentLoginModalProps> = ({
    isOpen,
    onClose,
    departmentUsers,
    departments,
    onLogin
}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Kullanıcı adı ve şifre gereklidir.');
            return;
        }

        const user = departmentUsers.find(
            u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        );

        if (user) {
            onLogin(user);
            setUsername('');
            setPassword('');
            onClose();
        } else {
            setError('Kullanıcı adı veya şifre hatalı.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-teal-50">
                    <div className="flex items-center gap-2 text-teal-800">
                        <LogIn size={24} />
                        <h2 className="text-lg font-bold">Birim Girişi</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 text-center">
                        Biriminize ait kullanıcı bilgileri ile giriş yapınız.
                    </p>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Kullanıcı Adı</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="kullanici_adi"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Şifre</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition shadow-lg shadow-teal-200"
                    >
                        Giriş Yap
                    </button>
                </form>
            </div>
        </div>
    );
};

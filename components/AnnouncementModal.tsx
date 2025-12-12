import { useState, useEffect } from 'react';
import { X, Megaphone, Plus, Trash2, Calendar } from 'lucide-react';
import { Announcement } from '../types';
import { format, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  isDesigner: boolean;
  currentUserId: string | null;
  onAdd: (title: string, content: string) => void;
  onDelete: (id: string) => void;
  onMarkAsRead: (announcementId: string) => void;
}

export default function AnnouncementModal({
  isOpen,
  onClose,
  announcements,
  isDesigner,
  currentUserId,
  onAdd,
  onDelete,
  onMarkAsRead,
}: AnnouncementModalProps) {
  const [isAddMode, setIsAddMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    onAdd(newTitle.trim(), newContent.trim());
    setNewTitle('');
    setNewContent('');
    setIsAddMode(false);
  };

  const sortedAnnouncements = [...announcements].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Mark unread announcements as read when modal opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      sortedAnnouncements.forEach((announcement) => {
        const isUnread = isToday(announcement.createdAt) && 
          !(announcement.readBy || []).includes(currentUserId);
        if (isUnread) {
          onMarkAsRead(announcement.id);
        }
      });
    }
  }, [isOpen, currentUserId, sortedAnnouncements, onMarkAsRead]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Megaphone className="text-violet-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Duyuru Panosu</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Add New Announcement (Admin Only) */}
          {isDesigner && (
            <div className="mb-4">
              {!isAddMode ? (
                <button
                  onClick={() => setIsAddMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors font-medium text-sm"
                >
                  <Plus size={16} />
                  Yeni Duyuru Ekle
                </button>
              ) : (
                <div className="bg-violet-50 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Duyuru Başlığı"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                  />
                  <textarea
                    placeholder="Duyuru İçeriği"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      disabled={!newTitle.trim() || !newContent.trim()}
                      className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Yayınla
                    </button>
                    <button
                      onClick={() => {
                        setIsAddMode(false);
                        setNewTitle('');
                        setNewContent('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Announcements List */}
          {sortedAnnouncements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Megaphone size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Henüz duyuru bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-xl border ${
                    isToday(announcement.createdAt) && 
                    currentUserId && 
                    !(announcement.readBy || []).includes(currentUserId)
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {announcement.title}
                        </h3>
                        {isToday(announcement.createdAt) && 
                          currentUserId && 
                          !(announcement.readBy || []).includes(currentUserId) && (
                          <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">
                            YENİ
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Calendar size={12} />
                        {format(announcement.createdAt, 'd MMMM yyyy, HH:mm', {
                          locale: tr,
                        })}
                      </div>
                    </div>
                    {isDesigner && (
                      <button
                        onClick={() => onDelete(announcement.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Duyuruyu Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

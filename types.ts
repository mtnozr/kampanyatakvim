export type UrgencyLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export interface User {
  id: string;
  name: string;
  email: string;
  emoji?: string;     // New property for selected emoji
}

export interface Department {
  id: string;
  name: string;
}

export type CampaignStatus = 'Planlandı' | 'Tamamlandı' | 'İptal Edildi';

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
  urgency: UrgencyLevel; // Changed from platform
  assigneeId?: string; // ID of the assigned User
  departmentId?: string; // ID of the requesting Department
  status?: CampaignStatus;
}

export interface UrgencyConfig {
  label: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
  type: 'email' | 'system';
}

export interface ActivityLog {
  id: string;
  message: string;
  timestamp: Date;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info';
}

export interface DepartmentUser {
  id: string;
  username: string;
  password: string;
  departmentId: string;
  isDesigner?: boolean;
  isKampanyaYapan?: boolean;
  createdAt: Date;
}
export type UrgencyLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // Made optional as we might use emoji instead
  emoji?: string;     // New property for selected emoji
}

export interface Department {
  id: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
  urgency: UrgencyLevel; // Changed from platform
  assigneeId?: string; // ID of the assigned User
  departmentId?: string; // ID of the requesting Department
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

export interface IpAccessConfig {
  designerIp: string;
  departmentIps: Record<string, string>; // key: IP Address, value: Department ID
}
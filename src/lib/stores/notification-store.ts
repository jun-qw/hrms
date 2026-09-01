'use client';

/**
 * Notification store — a DB-backed client cache. Hydrated once per session
 * from fetchSystemData() (which only returns the signed-in employee's own
 * notifications); mutations apply optimistically and sync through server
 * actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';

export type NotificationType =
  | 'approval_request'    // 결재 요청받음
  | 'approval_approved'   // 내 결재가 승인됨
  | 'approval_rejected'   // 내 결재가 반려됨
  | 'attendance_approved' // 근태신청 승인
  | 'attendance_rejected' // 근태신청 반려
  | 'leave_approved'      // 휴가 승인
  | 'leave_rejected'      // 휴가 반려
  | 'info';               // 일반 정보

export interface Notification {
  id: string;
  recipient_id: string;    // employee_id
  type: NotificationType;
  title: string;
  message: string;
  link?: string;           // 클릭 시 이동할 경로
  is_read: boolean;
  created_at: string;
  related_id?: string;     // 관련 approval_id, leave_request_id 등
}

interface NotificationState {
  hydrated: boolean;
  notifications: Notification[];
}

interface NotificationActions {
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;
  addNotification: (n: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (recipientId: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: (recipientId: string) => void;
  getByRecipient: (recipientId: string) => Notification[];
  getUnreadCount: (recipientId: string) => number;
}

export type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchSystemData();
    if (data) set({ notifications: data.notifications, hydrated: true });
  };

  const failSync = () => {
    toast.error('알림 저장에 실패했습니다. 데이터를 다시 불러옵니다.', { id: 'notification-sync' });
    void reload();
  };

  return {
    hydrated: false,
    notifications: [],

    hydrate: (data) => set({ notifications: data.notifications, hydrated: true }),
    reload,

    addNotification: (n) => {
      const tempId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: Notification = {
        ...n,
        id: tempId,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ notifications: [optimistic, ...s.notifications] }));
      void api.createNotification(n).then((saved) => {
        if (saved) {
          set((s) => ({
            notifications: s.notifications.map((x) => (x.id === tempId ? saved : x)),
          }));
        } else {
          failSync();
        }
      });
    },

    markAsRead: (id) => {
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      }));
      void api.markNotificationRead(id).then((saved) => {
        if (!saved) failSync();
      });
    },

    markAllAsRead: (recipientId) => {
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.recipient_id === recipientId ? { ...n, is_read: true } : n,
        ),
      }));
      void api.markAllNotificationsRead(recipientId).then((ok) => {
        if (!ok) failSync();
      });
    },

    deleteNotification: (id) => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      void api.deleteNotification(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    clearAll: (recipientId) => {
      set((s) => ({
        notifications: s.notifications.filter((n) => n.recipient_id !== recipientId),
      }));
      void api.clearNotifications(recipientId).then((ok) => {
        if (!ok) failSync();
      });
    },

    getByRecipient: (recipientId) =>
      get()
        .notifications.filter((n) => n.recipient_id === recipientId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),

    getUnreadCount: (recipientId) =>
      get().notifications.filter((n) => n.recipient_id === recipientId && !n.is_read).length,
  };
});

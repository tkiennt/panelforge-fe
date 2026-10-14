// src/services/notification.service.ts
import axiosClient from '../api/axiosClient';
import { NotificationListDto, NotificationDto } from '@/types';

export const notificationService = {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại (GET /api/notifications)
   */
  getNotifications: async (
    unreadOnly = false,
    pageIndex = 1,
    pageSize = 20,
  ): Promise<NotificationListDto> => {
    try {
      const response = await axiosClient.get<NotificationListDto>('/notifications', {
        params: {
          unreadOnly,
          pageIndex,
          pageSize,
        },
      });
      return (
        response.data || {
          items: [],
          totalCount: 0,
          unreadCount: 0,
          pageIndex: 1,
          pageSize: 20,
        }
      );
    } catch (error) {
      console.warn('Không thể nạp danh sách thông báo:', error);
      return {
        items: [],
        totalCount: 0,
        unreadCount: 0,
        pageIndex: 1,
        pageSize: 20,
      };
    }
  },

  /**
   * Đánh dấu một thông báo là đã đọc (POST /api/notifications/{id}/read)
   */
  markAsRead: async (notificationId: string): Promise<number> => {
    try {
      const response = await axiosClient.post<{ marked: number }>(
        `/notifications/${notificationId}/read`,
      );
      return response.data?.marked ?? 1;
    } catch (error) {
      console.error('Không thể đánh dấu đã đọc:', error);
      return 0;
    }
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc (POST /api/notifications/read-all)
   */
  markAllAsRead: async (): Promise<number> => {
    try {
      const response = await axiosClient.post<{ marked: number }>('/notifications/read-all');
      return response.data?.marked ?? 0;
    } catch (error) {
      console.error('Không thể đánh dấu đọc tất cả:', error);
      return 0;
    }
  },

  /**
   * Kích hoạt quét thông báo nhắc việc và yêu cầu sửa sắp/đã quá hạn (POST /api/notifications/send-reminders)
   */
  sendReminders: async (leadHours = 24): Promise<{ created: number }> => {
    try {
      const response = await axiosClient.post<{ created: number }>('/notifications/send-reminders', null, {
        params: { leadHours },
      });
      return response.data || { created: 0 };
    } catch (error) {
      console.error('Không thể kích hoạt gửi thông báo nhắc hạn:', error);
      return { created: 0 };
    }
  },
};

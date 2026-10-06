import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from './notification.service';
import axiosClient from '../api/axiosClient';

vi.mock('../api/axiosClient');

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getNotifications gọi GET /notifications kèm unreadOnly, pageIndex, pageSize', async () => {
    const mockList = {
      items: [
        {
          id: 'noti-1',
          type: 'AssignmentAssigned',
          title: 'Nhiệm vụ mới',
          message: 'Bạn được giao vẽ chì',
          createdAt: '2026-10-06T19:00:00Z',
        },
      ],
      totalCount: 1,
      unreadCount: 1,
      pageIndex: 1,
      pageSize: 20,
    };
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockList });

    const result = await notificationService.getNotifications(true, 1, 20);
    expect(axiosClient.get).toHaveBeenCalledWith('/notifications', {
      params: {
        unreadOnly: true,
        pageIndex: 1,
        pageSize: 20,
      },
    });
    expect(result).toEqual(mockList);
  });

  it('markAsRead gọi POST /notifications/{id}/read', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { marked: 1 } });

    const result = await notificationService.markAsRead('noti-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/notifications/noti-1/read');
    expect(result).toBe(1);
  });

  it('markAllAsRead gọi POST /notifications/read-all', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { marked: 5 } });

    const result = await notificationService.markAllAsRead();
    expect(axiosClient.post).toHaveBeenCalledWith('/notifications/read-all');
    expect(result).toBe(5);
  });
});

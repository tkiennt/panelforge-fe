import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { userService } from './user.service';

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('userService', () => {
  const mockUser = {
    id: 'user-123',
    firebaseUid: 'fb-123',
    username: 'Tatsuki Fujimoto',
    email: 'fujimoto@panelforge.studio',
    avatar: 'https://example.com/avatar.jpg',
    phoneNumber: '+84901234567',
    isActive: true,
    role: 'USER',
    createdAt: '2026-01-15T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi GET /Users/me khi nạp thông tin hồ sơ của chính mình', async () => {
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockUser });

    const result = await userService.getMyProfile();

    expect(axiosClient.get).toHaveBeenCalledWith('/Users/me');
    expect(result).toEqual(mockUser);
  });

  it('gọi PUT /Users/{id} với payload tương ứng khi cập nhật hồ sơ', async () => {
    const updated = { ...mockUser, username: 'Fujimoto Sensei' };
    vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: updated });

    const result = await userService.updateProfile('user-123', {
      username: 'Fujimoto Sensei',
      phoneNumber: '+84901234567',
      avatar: 'https://example.com/avatar.jpg',
    });

    expect(axiosClient.put).toHaveBeenCalledWith('/Users/user-123', {
      username: 'Fujimoto Sensei',
      phoneNumber: '+84901234567',
      avatar: 'https://example.com/avatar.jpg',
    });
    expect(result.username).toBe('Fujimoto Sensei');
  });

  it('gọi PUT /Users/firebase/{firebaseUid} khi cập nhật qua Firebase UID', async () => {
    const updated = { ...mockUser, username: 'Fujimoto FB' };
    vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: updated });

    const result = await userService.updateProfileByFirebaseUid('fb-123', {
      username: 'Fujimoto FB',
    });

    expect(axiosClient.put).toHaveBeenCalledWith('/Users/firebase/fb-123', {
      username: 'Fujimoto FB',
    });
    expect(result.username).toBe('Fujimoto FB');
  });
});

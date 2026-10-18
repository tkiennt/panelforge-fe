// src/services/offlineQueue.service.ts
import axiosClient from '../api/axiosClient';

export type OfflineActionType =
  | 'ADD_ELEMENT'
  | 'MOVE_ELEMENT'
  | 'UPDATE_ELEMENT_TEXT'
  | 'SET_READING_ORDER'
  | 'DELETE_ELEMENT'
  | 'CREATE_SCRIPT_LINE'
  | 'UPDATE_SCRIPT_LINE'
  | 'DELETE_SCRIPT_LINE'
  | 'CREATE_PANEL'
  | 'UPDATE_PANEL_COORDINATES'
  | 'ASSIGN_PANEL_SCENE'
  | 'ASSIGN_PANEL_SCRIPT_LINES'
  | 'DELETE_PANEL';

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  clientRefId: string; // clientElementId, clientLineId, or clientRefId
  createdAt: string;
  retryCount: number;
  lastError?: string;
  lastStatusCode?: number;
  conflictData?: any;
}

export interface OfflineQueueState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  items: OfflineQueueItem[];
}

function getCurrentUserId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'default';
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.id || u.userId) return String(u.id || u.userId);
    }
    const token = localStorage.getItem('token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.nameid || payload.sub) return String(payload.nameid || payload.sub);
      }
    }
  } catch {
    // fallback
  }
  return 'default';
}

function getStorageKey(): string {
  const uid = getCurrentUserId();
  return `panelforge_offline_queue_${uid}`;
}

class OfflineQueueService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncAt: string | null = null;
  private listeners: Set<(state: OfflineQueueState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.flushQueue().catch((err) => {
          console.error('[OfflineQueue] Tự động đồng bộ khi online thất bại:', err);
        });
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });
    }
  }

  public getQueue(): OfflineQueueItem[] {
    try {
      const key = getStorageKey();
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(items: OfflineQueueItem[]): void {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(items));
      this.notify();
    } catch (e) {
      console.error('[OfflineQueue] Không thể lưu queue vào localStorage:', e);
    }
  }

  public setOnline(status: boolean): void {
    this.isOnline = status;
    this.notify();
    if (status && !this.isSyncing) {
      this.flushQueue().catch(console.error);
    }
  }

  public enqueue(
    item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>,
    options?: { autoFlush?: boolean },
  ): OfflineQueueItem {
    const queue = this.getQueue();
    const newItem: OfflineQueueItem = {
      ...item,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newItem);
    this.saveQueue(queue);

    // Nếu đang online và autoFlush != false thì kích hoạt flush
    if (options?.autoFlush !== false && this.isOnline && !this.isSyncing) {
      this.flushQueue().catch(console.error);
    }

    return newItem;
  }

  public removeItem(id: string): void {
    const queue = this.getQueue().filter((it) => it.id !== id);
    this.saveQueue(queue);
  }

  public updateItemPayload(id: string, newPayload: any): void {
    const queue = this.getQueue().map((it) =>
      it.id === id
        ? { ...it, payload: newPayload, lastStatusCode: undefined, lastError: undefined }
        : it,
    );
    this.saveQueue(queue);
  }

  public getConflicts(): OfflineQueueItem[] {
    return this.getQueue().filter(
      (it) => it.lastStatusCode && it.lastStatusCode >= 400 && it.lastStatusCode < 500,
    );
  }

  public async flushQueue(): Promise<{ succeeded: number; failed: number }> {
    if (this.isSyncing) return { succeeded: 0, failed: 0 };
    const queue = this.getQueue();
    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    this.isSyncing = true;
    this.notify();

    let succeeded = 0;
    let failed = 0;
    const remaining: OfflineQueueItem[] = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        if (item.method === 'POST') {
          await axiosClient.post(item.endpoint, item.payload);
        } else if (item.method === 'PUT') {
          await axiosClient.put(item.endpoint, item.payload);
        } else if (item.method === 'DELETE') {
          await axiosClient.delete(item.endpoint, { params: item.payload });
        }
        succeeded++;
      } catch (err: any) {
        const status = err.response?.status;
        const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
        item.lastError = err.response?.data?.message || err.message || 'Lỗi gửi yêu cầu';

        if (isNetworkError) {
          this.isOnline = false;
          // Giữ item hiện tại và toàn bộ item chưa chạy tiếp theo
          remaining.push(item, ...queue.slice(i + 1));
          failed++;
          break;
        } else if (status && status >= 400 && status < 500) {
          // Lỗi 4xx (409 Conflict, 400 Validation, v.v.):
          // TUYỆT ĐỐI KHÔNG thử lại mù quáng rồi xoá bỏ làm mất thao tác của người dùng!
          // Giữ lại item và dừng luồng đồng bộ để người dùng giải quyết xung đột.
          item.lastStatusCode = status;
          item.conflictData = err.response?.data;
          remaining.push(item, ...queue.slice(i + 1));
          failed++;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('panelforge:offline_conflict', {
                detail: {
                  item,
                  status,
                  message: item.lastError,
                  conflict: err.response?.data?.conflict,
                  code: err.response?.data?.code,
                },
              }),
            );
          }
          break;
        } else {
          // Lỗi 5xx máy chủ tạm thời -> cho phép retry tối đa 3 lần
          item.retryCount += 1;
          if (item.retryCount < 3) {
            remaining.push(item);
          }
          failed++;
        }
      }
    }

    this.isSyncing = false;
    this.lastSyncAt = new Date().toISOString();
    this.saveQueue(remaining);

    return { succeeded, failed };
  }

  public clearQueue(): void {
    this.saveQueue([]);
  }

  public getState(): OfflineQueueState {
    const items = this.getQueue();
    return {
      isOnline: this.isOnline,
      pendingCount: items.length,
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      items,
    };
  }

  public subscribe(listener: (state: OfflineQueueState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[OfflineQueue] Listener error:', err);
      }
    });
  }
}

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;

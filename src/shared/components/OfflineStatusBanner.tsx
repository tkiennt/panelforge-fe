import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { offlineQueueService, OfflineQueueState } from '@/services/offlineQueue.service';

export const OfflineStatusBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [queueState, setQueueState] = useState<OfflineQueueState>(offlineQueueService.getState());
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const unsub = offlineQueueService.subscribe((state) => {
      setQueueState(state);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    const res = await offlineQueueService.flushQueue();
    if (res.succeeded > 0 && offlineQueueService.getState().pendingCount === 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
  };

  if (queueState.isOnline && queueState.pendingCount === 0 && !justSynced) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs transition-all ${
        !queueState.isOnline
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : justSynced
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
      } ${className}`}
    >
      <div className='flex items-center gap-2'>
        {!queueState.isOnline ? (
          <WifiOff className='w-4 h-4 text-amber-600 shrink-0' />
        ) : justSynced ? (
          <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
        ) : (
          <CloudUpload className='w-4 h-4 text-blue-600 shrink-0' />
        )}
        <span>
          {!queueState.isOnline ? (
            <>
              <strong>Chế độ ngoại tuyến:</strong> Mất kết nối mạng.{' '}
              {queueState.pendingCount > 0 ? (
                <>
                  Có <strong>{queueState.pendingCount}</strong> thao tác đã được lưu tạm trên máy và
                  sẽ tự động đồng bộ khi có kết nối lại (NFR-09 Idempotent).
                </>
              ) : (
                'Các thao tác thêm/sửa sẽ được lưu tạm an toàn trên máy.'
              )}
            </>
          ) : justSynced ? (
            <>
              <strong>Đã đồng bộ thành công!</strong> Mọi thao tác ngoại tuyến đã được gửi lên máy
              chủ an toàn.
            </>
          ) : (
            <>
              Có <strong>{queueState.pendingCount}</strong> thao tác đang chờ đồng bộ lên máy chủ.
            </>
          )}
        </span>
      </div>

      {queueState.pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={queueState.isSyncing}
          className='inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-white/80 border border-current rounded-lg font-semibold text-[11px] shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-50'
        >
          <RefreshCw className={`w-3 h-3 ${queueState.isSyncing ? 'animate-spin' : ''}`} />
          <span>{queueState.isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
        </button>
      )}
    </div>
  );
};

export default OfflineStatusBanner;

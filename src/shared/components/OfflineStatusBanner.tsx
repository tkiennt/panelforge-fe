import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { offlineQueueService, OfflineQueueState } from '@/services/offlineQueue.service';
import { useTranslation } from '@/lib/i18n';
import '@/shared/components/lucian/lucian-091.css';

export const OfflineStatusBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
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

  const isOffline = !queueState.isOnline;

  return (
    <div
      role='status'
      aria-live='polite'
      className={`pf-offline-banner ${isOffline ? 'is-offline' : ''} ${
        justSynced ? 'is-synced' : ''
      } ${className}`}
    >
      <div className='pf-offline-left'>
        {isOffline ? (
          <span className='pf-wifi-waves' aria-hidden='true'>
            <svg viewBox='0 0 24 24'>
              <path className='wave-outer' d='M2.8 9.2a13.2 13.2 0 0 1 18.4 0' />
              <path className='wave-mid' d='M5.7 12.4a9 9 0 0 1 12.6 0' />
              <path className='wave-inner' d='M8.6 15.6a4.8 4.8 0 0 1 6.8 0' />
              <circle cx='12' cy='19' r='1.5' fill='currentColor' stroke='none' />
            </svg>
          </span>
        ) : justSynced ? (
          <CheckCircle2 className='w-5 h-5 text-emerald-600 shrink-0' />
        ) : (
          <CloudUpload className='w-5 h-5 text-blue-600 shrink-0' />
        )}
        <div className='pf-offline-content text-xs'>
          {isOffline ? (
            <>
              <strong>{t('common.offline.title')}</strong>{' '}
              {queueState.pendingCount > 0 ? (
                <>
                  Có <span className='pf-offline-badge'>{queueState.pendingCount}</span> thao tác đã
                  lưu tạm, sẽ tự động đồng bộ khi có mạng.
                </>
              ) : (
                t('common.offline.noConnection')
              )}
            </>
          ) : justSynced ? (
            <>
              <strong>{t('common.offline.synced')}</strong>
            </>
          ) : (
            <>
              Có <span className='pf-offline-badge'>{queueState.pendingCount}</span> thao tác đang
              chờ đồng bộ lên máy chủ.
            </>
          )}
        </div>
      </div>

      {queueState.pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={queueState.isSyncing}
          className='pf-offline-sync-btn'
          aria-label={t('common.offline.syncNow')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${queueState.isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {queueState.isSyncing ? t('common.offline.syncing') : t('common.offline.syncNow')}
          </span>
        </button>
      )}
    </div>
  );
};

export default OfflineStatusBanner;

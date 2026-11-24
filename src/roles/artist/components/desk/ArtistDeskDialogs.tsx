import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';

export const ArtworkPreviewDialog: React.FC<{
  imageUrl: string;
  title: string;
  onClose: () => void;
}> = ({ imageUrl, title, onClose }) => {
  const { t } = useTranslation('artist');
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size='xl'
      title={title}
      closeLabel={t('dialogs.closeArtworkPreview')}
    >
      <div className='p-2 flex items-center justify-center overflow-auto'>
        <img
          src={imageUrl}
          alt={title}
          className='max-w-full max-h-[80vh] object-contain rounded'
        />
      </div>
    </Modal>
  );
};

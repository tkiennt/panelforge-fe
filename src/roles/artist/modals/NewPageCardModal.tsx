import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { KanbanCard, KanbanStageKey } from '@/types';
import { Modal } from '@/shared/ui';

interface NewPageCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (card: KanbanCard) => void;
  onShowToast: (title: string, desc: string) => void;
}

export const NewPageCardModal: React.FC<NewPageCardModalProps> = ({
  isOpen,
  onClose,
  onAddCard,
  onShowToast,
}) => {
  const { t } = useTranslation('artist');
  const [pageNumber, setPageNumber] = useState('');
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<KanbanStageKey>('pencil');
  const [assignee, setAssignee] = useState('Kenji S.');
  const [pageType, setPageType] = useState<'Action' | 'Dialogue' | 'Spread'>('Action');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageNumber.trim() || !title.trim()) return;

    const newCard: KanbanCard = {
      id: `card-${Date.now()}`,
      pageNumber: pageNumber.toUpperCase().startsWith('PAGE')
        ? pageNumber.toUpperCase()
        : `PAGE ${pageNumber}`,
      stage: stage,
      title: title.trim(),
      assignee: assignee,
      assigneeRole: 'Artist',
      assigneeInitials:
        assignee
          .split(' ')
          .map((n) => n[0])
          .join('') || 'KS',
      avatarBg: '#F97316',
      dueText: 'Nov 28',
      pageType: pageType,
      tags: [pageType, 'CHAPTER 5', '600 DPI'],
      aiAssistBadge: 'LoRA Infill',
    };

    onAddCard(newCard);
    onShowToast(
      'Page Card Created',
      `${newCard.pageNumber} added to ${stage.toUpperCase()} pipeline.`,
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      closeLabel={t('common.close')}
      title={
        <div className='flex items-center gap-2.5'>
          <div className='p-2 bg-[#FFF2E6] text-[#C2410C] rounded-xl border border-[#FDBA74]'>
            <Layers className='w-4 h-4' />
          </div>
          <span className='font-serif font-bold text-sm text-[#1C1917]'>
            {t('newPageCardModal.title')}
          </span>
        </div>
      }
      description={t('newPageCardModal.description')}
    >
      <form onSubmit={handleSubmit} className='space-y-4 text-xs'>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='block font-semibold text-[#1C1917] mb-1.5'>
              {t('newPageCardModal.pageNumberLabel')}
            </label>
            <input
              type='text'
              required
              placeholder={t('newPageCardModal.pageNumberPlaceholder')}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              className='w-full px-3 py-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] text-[#1C1917] focus:outline-none focus:border-[#F97316] font-mono'
            />
          </div>

          <div>
            <label className='block font-semibold text-[#1C1917] mb-1.5'>
              {t('newPageCardModal.pageTypeLabel')}
            </label>
            <select
              value={pageType}
              onChange={(e) => setPageType(e.target.value as any)}
              className='w-full px-3 py-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] text-[#1C1917] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
            >
              <option value='Action'>{t('newPageCardModal.pageTypeAction')}</option>
              <option value='Dialogue'>{t('newPageCardModal.pageTypeDialogue')}</option>
              <option value='Spread'>{t('newPageCardModal.pageTypeSpread')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className='block font-semibold text-[#1C1917] mb-1.5'>
            {t('newPageCardModal.sceneTitleLabel')}
          </label>
          <input
            type='text'
            required
            placeholder={t('newPageCardModal.sceneTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='w-full px-3 py-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] text-[#1C1917] focus:outline-none focus:border-[#F97316]'
          />
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='block font-semibold text-[#1C1917] mb-1.5'>
              {t('newPageCardModal.initialStageLabel')}
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as KanbanStageKey)}
              className='w-full px-3 py-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] text-[#1C1917] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
            >
              <option value='script'>{t('newPageCardModal.stages.script')}</option>
              <option value='pencil'>{t('newPageCardModal.stages.pencil')}</option>
              <option value='ink'>{t('newPageCardModal.stages.ink')}</option>
              <option value='color'>{t('newPageCardModal.stages.color')}</option>
              <option value='letter'>{t('newPageCardModal.stages.letter')}</option>
              <option value='review'>{t('newPageCardModal.stages.review')}</option>
              <option value='approved'>{t('newPageCardModal.stages.approved')}</option>
            </select>
          </div>

          <div>
            <label className='block font-semibold text-[#1C1917] mb-1.5'>
              {t('newPageCardModal.assigneeLabel')}
            </label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className='w-full px-3 py-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] text-[#1C1917] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
            >
              <option value='Kenji S.'>Kenji S. (Artist)</option>
              <option value='Arata M.'>Arata M. (Writer)</option>
              <option value='Mei L.'>Mei L. (Artist)</option>
              <option value='Yuto T.'>Yuto T. (Artist)</option>
              <option value='Tatsuki F.'>Tatsuki F. (Producer)</option>
            </select>
          </div>
        </div>

        <div className='pt-2 flex items-center justify-between border-t border-[#D8D2C5]'>
          <button
            type='button'
            onClick={onClose}
            className='px-3.5 py-2 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] text-[#57534E] text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            {t('newPageCardModal.cancel')}
          </button>
          <button
            type='submit'
            className='px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-xl shadow-soft-sm transition-all cursor-pointer active:scale-95'
          >
            {t('newPageCardModal.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewPageCardModal;

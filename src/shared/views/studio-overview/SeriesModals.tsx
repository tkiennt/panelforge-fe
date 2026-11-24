import React from 'react';
import { X, Sparkles, Edit2, Globe, BookOpen, Check, Loader2 } from 'lucide-react';
import { PipelineTemplateDto } from '@/services/pipeline.service';
import { SeriesDto } from '@/services/series.service';
import { SYSTEM_COVERS, type SystemImage } from '@/shared/utils/systemImages';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

export interface CoverPickerModalProps {
  series: { id: string; title: string } | null;
  savingCoverId: string | null;
  onClose: () => void;
  onPickSystemCover: (img: SystemImage) => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  series,
  savingCoverId,
  onClose,
  onPickSystemCover,
}) => {
  const { t } = useTranslation();
  if (!series) return null;

  return (
    <Modal
      isOpen={Boolean(series)}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='lg'
      title={t('workspace.seriesModals.coverTitle')}
      data-testid='system-cover-picker'
      dismissible={!savingCoverId}
    >
      <div
        className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between'>
          <h3 id='cover-picker-title' className='text-sm font-bold text-[#44403C]'>
            {t('workspace.seriesModals.coverHeading', { title: series.title })}
          </h3>
          <button
            type='button'
            autoFocus
            onClick={onClose}
            disabled={Boolean(savingCoverId)}
            className='p-1 text-[#57534E] hover:text-[#44403C] cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-[#F97316]'
            aria-label={t('common.actions.close')}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
        <p className='text-xs text-[#57534E]'>{t('workspace.seriesModals.coverDesc')}</p>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {SYSTEM_COVERS.map((img) => (
            <button
              key={img.id}
              type='button'
              data-testid={`system-cover-${img.id}`}
              onClick={() => onPickSystemCover(img)}
              disabled={Boolean(savingCoverId)}
              className='relative p-1.5 rounded-lg border border-[#D8D2C5] hover:border-[#F97316] bg-white flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#F97316]'
            >
              <img
                src={img.url}
                alt={img.name}
                className='w-full aspect-[366/594] object-cover rounded-md'
              />
              <span className='text-[11px] font-semibold text-[#44403C]'>
                {savingCoverId === img.id ? t('workspace.seriesModals.savingEllipsis') : img.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export interface CreateSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onTitleChange: (v: string) => void;
  format: string;
  onFormatChange: (v: string) => void;
  direction: number;
  onDirectionChange: (v: number) => void;
  genre: string;
  onGenreChange: (v: string) => void;
  synopsis: string;
  onSynopsisChange: (v: string) => void;
  storyArc: string;
  onStoryArcChange: (v: string) => void;
  pipelineTemplates: PipelineTemplateDto[];
  templateId: string;
  onTemplateIdChange: (v: string) => void;
  creating: boolean;
}

export const CreateSeriesModal: React.FC<CreateSeriesModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  onTitleChange,
  format,
  onFormatChange,
  direction,
  onDirectionChange,
  genre,
  onGenreChange,
  synopsis,
  onSynopsisChange,
  storyArc,
  onStoryArcChange,
  pipelineTemplates,
  templateId,
  onTemplateIdChange,
  creating,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='lg'
      title={t('workspace.seriesModals.createTitle')}
    >
      <div className='bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col text-xs'>
        {/* Header */}
        <div className='p-5 border-b border-stone-200 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0'>
              <BookOpen className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-bold text-stone-900 text-base'>
                {t('workspace.seriesModals.createTitle')}
              </h3>
              <p className='text-xs text-stone-500'>{t('workspace.seriesModals.createSubtitle')}</p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <form onSubmit={onSubmit} className='p-6 flex flex-col gap-4 text-xs'>
          <div className='flex flex-col gap-3.5'>
            <h4 className='font-semibold text-stone-800 pb-1 border-b border-stone-100 text-sm'>
              {t('workspace.seriesModals.sectionPubInfo')}
            </h4>

            {/* Title */}
            <div className='flex flex-col gap-1'>
              <label className='font-semibold text-stone-700'>
                {t('workspace.seriesModals.seriesNameLabel')}
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder={t('workspace.seriesModals.seriesNamePlaceholder')}
                className='w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
                required
              />
            </div>

            {/* Genre */}
            <div className='flex flex-col gap-1'>
              <label className='font-semibold text-stone-700'>
                {t('workspace.seriesModals.genreLabel')}
              </label>
              <input
                type='text'
                value={genre}
                onChange={(e) => onGenreChange(e.target.value)}
                placeholder={t('workspace.seriesModals.genrePlaceholder')}
                className='w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs'
                required
              />
            </div>

            {/* Format Radio Cards */}
            <div className='flex flex-col gap-1.5'>
              <label className='font-semibold text-stone-700'>
                {t('workspace.seriesModals.formatLabel')}
              </label>
              <div className='grid grid-cols-2 gap-2'>
                <label
                  className={`border rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all ${
                    format === 'MANGA'
                      ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-stone-800'>Manga B5</span>
                    <input
                      type='radio'
                      name='format_choice'
                      value='MANGA'
                      checked={format === 'MANGA'}
                      onChange={() => {
                        onFormatChange('MANGA');
                        onDirectionChange(1);
                      }}
                      className='accent-orange-600'
                    />
                  </div>
                  <span className='text-[11px] text-stone-500'>
                    {t('workspace.seriesModals.mangaDesc')}
                  </span>
                </label>

                <label
                  className={`border rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all ${
                    format === 'WEBTOON'
                      ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-stone-800'>Webtoon</span>
                    <input
                      type='radio'
                      name='format_choice'
                      value='WEBTOON'
                      checked={format === 'WEBTOON'}
                      onChange={() => {
                        onFormatChange('WEBTOON');
                        onDirectionChange(2);
                      }}
                      className='accent-orange-600'
                    />
                  </div>
                  <span className='text-[11px] text-stone-500'>
                    {t('workspace.seriesModals.webtoonDesc')}
                  </span>
                </label>
              </div>
            </div>

            {/* Pipeline Template */}
            <div className='flex flex-col gap-1'>
              <label
                htmlFor='create-series-pipeline-template'
                className='font-semibold text-stone-700'
              >
                {t('workspace.seriesModals.pipelineLabel')}
              </label>
              <select
                id='create-series-pipeline-template'
                value={templateId}
                onChange={(e) => onTemplateIdChange(e.target.value)}
                className='w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs'
              >
                <option value=''>{t('workspace.seriesModals.pipelineDefault')}</option>
                {pipelineTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.isDefault ? t('workspace.seriesModals.systemTemplateTag') : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Synopsis */}
            <div className='flex flex-col gap-1'>
              <label className='font-semibold text-stone-700'>
                {t('workspace.seriesModals.synopsisLabel')}
              </label>
              <textarea
                rows={2}
                value={synopsis}
                onChange={(e) => onSynopsisChange(e.target.value)}
                placeholder={t('workspace.seriesModals.synopsisPlaceholder')}
                className='w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs resize-none'
              />
            </div>
          </div>

          <div className='pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 rounded-lg border border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors'
            >
              {t('workspace.seriesModals.cancelBtn')}
            </button>
            <button
              type='submit'
              disabled={creating}
              className='px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors'
            >
              {creating ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>{t('workspace.seriesModals.creatingBtn')}</span>
                </>
              ) : (
                <>
                  <Check className='w-4 h-4 stroke-[2.5]' />
                  <span>{t('workspace.seriesModals.submitCreateBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export interface EditSeriesModalProps {
  series: SeriesDto | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onTitleChange: (v: string) => void;
  synopsis: string;
  onSynopsisChange: (v: string) => void;
  storyArc: string;
  onStoryArcChange: (v: string) => void;
  genre: string;
  onGenreChange: (v: string) => void;
  format: string;
  onFormatChange: (v: string) => void;
  direction: number;
  onDirectionChange: (v: number) => void;
  schedule: string;
  onScheduleChange: (v: string) => void;
  isCompleted: boolean;
  onCompletedChange: (v: boolean) => void;
  originalLanguage?: string;
  onOriginalLanguageChange?: (v: string) => void;
  releaseLanguages?: string[];
  onReleaseLanguagesChange?: (v: string[]) => void;
  updating: boolean;
}

export const EditSeriesModal: React.FC<EditSeriesModalProps> = ({
  series,
  onClose,
  onSubmit,
  title,
  onTitleChange,
  synopsis,
  onSynopsisChange,
  storyArc,
  onStoryArcChange,
  genre,
  onGenreChange,
  format,
  onFormatChange,
  direction,
  onDirectionChange,
  schedule,
  onScheduleChange,
  isCompleted,
  onCompletedChange,
  originalLanguage,
  onOriginalLanguageChange,
  releaseLanguages,
  onReleaseLanguagesChange,
  updating,
}) => {
  const { t } = useTranslation();
  if (!series) return null;

  return (
    <Modal
      isOpen={Boolean(series)}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='lg'
      title={t('workspace.seriesModals.editTitle')}
    >
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <div className='flex items-center gap-2'>
            <Edit2 className='w-4 h-4 text-[#F97316]' />
            <h3 className='text-sm font-bold text-[#171717]'>
              {t('workspace.seriesModals.editHeading')}
            </h3>
          </div>
          <button type='button' onClick={onClose} className='text-[#888888] hover:text-[#171717]'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <form onSubmit={onSubmit} className='space-y-3.5 text-xs'>
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              {t('workspace.seriesModals.editNameLabel')}
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              required
            />
          </div>

          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              {t('workspace.seriesModals.synopsisLabel')}
            </label>
            <textarea
              rows={2}
              value={synopsis}
              onChange={(e) => onSynopsisChange(e.target.value)}
              placeholder={t('workspace.seriesModals.editSynopsisPlaceholder')}
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
            />
          </div>

          <div>
            <div className='flex items-center justify-between mb-1'>
              <label className='block font-semibold text-[#171717]'>
                {t('workspace.seriesModals.storyArcLabel')}
              </label>
              <span className='text-xs text-[#888888] font-mono'>
                {t('workspace.seriesModals.aiWriterInput')}
              </span>
            </div>
            <textarea
              rows={3}
              value={storyArc}
              onChange={(e) => onStoryArcChange(e.target.value)}
              placeholder={t('workspace.seriesModals.storyArcPlaceholder')}
              className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
            />
            <p className='text-xs text-[#737373] mt-1'>
              {t('workspace.seriesModals.storyArcHint')}
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                {t('workspace.seriesModals.editGenreLabel')}
              </label>
              <select
                value={genre}
                onChange={(e) => onGenreChange(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value='Action / Sci-Fi'>Action / Sci-Fi</option>
                <option value='Fantasy / Isekai'>Fantasy / Isekai</option>
                <option value='Mystery / Detective'>Mystery / Detective</option>
                <option value='Horror / Supernatural'>Horror / Supernatural</option>
                <option value='Slice of Life / Drama'>Slice of Life / Drama</option>
              </select>
            </div>

            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                {t('workspace.seriesModals.editFormatLabel')}
              </label>
              <select
                value={format}
                onChange={(e) => onFormatChange(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value='Manga (B&W Standard)'>Manga (B&W Standard)</option>
                <option value='Webtoon (Vertical Scroll)'>Webtoon (Vertical Scroll)</option>
                <option value='Comic (Color Format)'>Comic (Color Format)</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                {t('workspace.seriesModals.directionLabel')}
              </label>
              <select
                value={direction}
                onChange={(e) => onDirectionChange(parseInt(e.target.value, 10))}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              >
                <option value={1}>{t('workspace.seriesModals.dirRtl')}</option>
                <option value={0}>{t('workspace.seriesModals.dirLtr')}</option>
                <option value={2}>{t('workspace.seriesModals.dirVertical')}</option>
              </select>
            </div>

            <div>
              <label className='block font-semibold text-[#171717] mb-1'>
                {t('workspace.seriesModals.scheduleLabel')}
              </label>
              <input
                type='text'
                value={schedule}
                onChange={(e) => onScheduleChange(e.target.value)}
                placeholder={t('workspace.seriesModals.schedulePlaceholder')}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
              />
            </div>

            <label className='flex items-center gap-2 font-semibold text-[#171717] cursor-pointer'>
              <input
                type='checkbox'
                checked={isCompleted}
                onChange={(e) => onCompletedChange(e.target.checked)}
                className='w-4 h-4 accent-[#F97316]'
                data-testid='edit-series-completed'
              />
              {t('workspace.seriesModals.completedLabel')}
              <span className='font-normal text-xs text-[#888888]'>
                {t('workspace.seriesModals.completedHint')}
              </span>
            </label>
          </div>

          {/* Cấu hình ngôn ngữ Series (BR-34: Multilingual Lettering) */}
          <div className='p-3 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-2.5'>
            <div className='flex items-center gap-1.5 font-bold text-[#171717]'>
              <Globe className='w-4 h-4 text-[#F97316]' />
              <span>{t('workspace.seriesModals.multilingualHeading')}</span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  {t('workspace.seriesModals.originalLangLabel')}
                </label>
                <select
                  value={originalLanguage || 'vi'}
                  onChange={(e) => {
                    const newOrig = e.target.value;
                    onOriginalLanguageChange?.(newOrig);
                    if (releaseLanguages && !releaseLanguages.includes(newOrig)) {
                      onReleaseLanguagesChange?.([...releaseLanguages, newOrig]);
                    }
                  }}
                  className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                >
                  <option value='vi'>{t('workspace.seriesModals.langVi')}</option>
                  <option value='en'>English (EN)</option>
                </select>
              </div>

              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  {t('workspace.seriesModals.releaseLangsLabel')}
                </label>
                <div className='flex flex-wrap gap-2 pt-1'>
                  {['vi', 'en'].map((code) => {
                    const isOrig = (originalLanguage || 'vi').toLowerCase() === code;
                    const isChecked = isOrig || (releaseLanguages || ['vi', 'en']).includes(code);
                    return (
                      <label
                        key={code}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-orange-50 border-orange-300 text-orange-900 font-semibold'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type='checkbox'
                          disabled={isOrig}
                          checked={isChecked}
                          onChange={(e) => {
                            if (isOrig) return;
                            const current = releaseLanguages || ['vi', 'en'];
                            if (e.target.checked) {
                              onReleaseLanguagesChange?.([...current, code]);
                            } else {
                              onReleaseLanguagesChange?.(current.filter((c) => c !== code));
                            }
                          }}
                          className='w-3.5 h-3.5 accent-[#F97316]'
                        />
                        <span>
                          {code.toUpperCase()}
                          {isOrig ? t('workspace.seriesModals.originalTag') : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB]'
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type='submit'
              disabled={updating || !title.trim()}
              className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold disabled:opacity-50'
            >
              {updating ? t('common.actions.saving') : t('workspace.seriesModals.saveChangesBtn')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

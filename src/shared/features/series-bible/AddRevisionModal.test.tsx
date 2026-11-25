import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddRevisionModal } from './AddRevisionModal';
import { groupRevisionsIntoVariants } from './BibleEntityDetailModal';

const entity = {
  id: 'entry-1',
  name: 'AKIRA',
  code: 'CHR_AKIRA',
  category: 'Character',
  description: 'Kiếm sĩ áo choàng xanh',
  subtitle: '',
  attributes: {},
  gallery: [],
} as any;

const revision = (stageName: string | null) =>
  ({
    id: `rev-${stageName ?? 'default'}`,
    bibleEntryId: 'entry-1',
    versionNumber: 1,
    stageName,
    variantLabel: stageName ?? '',
    reviewStatus: 'Draft',
    snapshotJson: '{}',
    events: [],
  }) as any;

const renderArtistSubmit = (stageName: string | null) => {
  const onConfirmArtistSubmit = vi.fn();
  const existingVariants = groupRevisionsIntoVariants([revision(stageName)]);
  render(
    <AddRevisionModal
      isOpen
      revisionTarget={entity}
      supersedeTarget={null}
      existingVariants={existingVariants}
      isArtistConceptSubmit
      isArtistResubmit={false}
      isArtist
      isProducer={false}
      revisionReworkFeedback={null}
      initialVariantLabel={existingVariants[0].variantLabel}
      initialName='AKIRA'
      initialSubtitle=''
      initialSummary='Nộp bản vẽ Concept Art'
      initialDescription='Kiếm sĩ áo choàng xanh'
      initialReferenceImageUrl='/api/series/s-1/bible/assets/abc'
      expectedVersionNumber={1}
      savingRevision={false}
      uploadingRevImage={false}
      onUploadImage={vi.fn()}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      onConfirmArtistSubmit={onConfirmArtistSubmit}
    />,
  );
  fireEvent.click(screen.getByTestId('save-revision-submit-btn'));
  return onConfirmArtistSubmit;
};

describe('AddRevisionModal – biến thể có sẵn (BIB-02, Q23)', () => {
  it('biến thể mặc định (stageName null) gửi variantLabel rỗng, không gửi nhãn đã dịch', () => {
    const onConfirm = renderArtistSubmit(null);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].variantLabel).toBe('');
  });

  it('biến thể có tên gửi đúng stageName gốc', () => {
    const onConfirm = renderArtistSubmit('Lúc nhỏ');

    expect(onConfirm.mock.calls[0][0].variantLabel).toBe('Lúc nhỏ');
  });
});

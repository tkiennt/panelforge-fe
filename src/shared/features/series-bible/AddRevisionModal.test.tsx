import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddRevisionModal } from './AddRevisionModal';
import { groupRevisionsIntoVariants } from './revisionVariants';

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

describe('AddRevisionModal – tạo biến thể mới', () => {
  it('dùng bố cục ngang và kế thừa đầy đủ dữ liệu nhân vật hiện tại', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const currentCharacter = {
      ...entity,
      detailsJson: '{}',
      attributes: {
        age: '20',
        artistNotes: '- Chiều cao: 170 cm\n- Màu mắt: xanh',
      },
    } as any;

    render(
      <AddRevisionModal
        isOpen
        revisionTarget={currentCharacter}
        supersedeTarget={null}
        existingVariants={[]}
        isNewVariantInitial
        isArtistConceptSubmit={false}
        isArtistResubmit={false}
        isArtist={false}
        isProducer={false}
        revisionReworkFeedback={null}
        initialVariantLabel=''
        initialName='AKIRA'
        initialSubtitle=''
        initialSummary='Tạo biến thể thiết kế mới'
        initialDescription=''
        initialReferenceImageUrl='/api/series/s-1/bible/assets/reference'
        expectedVersionNumber={2}
        savingRevision={false}
        uploadingRevImage={false}
        onUploadImage={vi.fn()}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByTestId('revision-form-layout')).toHaveClass('lg:grid-cols-12');
    expect(screen.getByTestId('revision-name-readonly')).toHaveTextContent('AKIRA');
    expect(screen.getByTestId('revision-age-input')).toHaveValue('20');
    expect(screen.getByTestId('spec-fields-editor').querySelector('textarea')).toHaveValue(
      '- Chiều cao: 170 cm\n- Màu mắt: xanh',
    );
    fireEvent.change(screen.getByTestId('revision-variant-label-input'), {
      target: { value: 'Trưởng thành' },
    });
    fireEvent.click(screen.getByTestId('save-revision-submit-btn'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'AKIRA',
      variantLabel: 'Trưởng thành',
      stageName: 'Trưởng thành',
      isNewVariant: true,
      referenceImageUrl: '/api/series/s-1/bible/assets/reference',
    });
    expect(JSON.parse(payload.detailsJson)).toMatchObject({
      age: '20',
      artistNotes: '- Chiều cao: 170 cm\n- Màu mắt: xanh',
    });
  });
});

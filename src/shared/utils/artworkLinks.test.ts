import { describe, it, expect } from 'vitest';
import {
  findUploadAssignment,
  needsArtworkLink,
  parseLinkExpiry,
  ARTWORK_LINK_SKEW_MS,
} from './artworkLinks';
import { errorMessage } from '@/shared/features/collaboration/collaborationRules';

const asg = (over: Record<string, unknown>) =>
  ({
    id: 'a',
    chapterId: 'c1',
    entityType: 'Page',
    targetEntityId: 'p1',
    pipelineStageId: 'stage-page',
    status: 'InProgress',
    ...over,
  }) as never;

describe('findUploadAssignment', () => {
  const target = { chapterId: 'c1', pageId: 'p1', panelId: 'pn1' };

  it('ưu tiên việc theo Panel hơn việc theo Page', () => {
    const list = [
      asg({ id: 'page' }),
      asg({
        id: 'panel',
        entityType: 'Panel',
        targetEntityId: 'pn1',
        pipelineStageId: 'stage-panel',
      }),
    ];
    expect(findUploadAssignment(list, target)?.id).toBe('panel');
  });

  it('rơi về việc theo Page khi không có việc theo Panel', () => {
    expect(findUploadAssignment([asg({ id: 'page' })], target)?.id).toBe('page');
  });

  it('rơi về việc theo Chapter khi không có việc theo Panel hoặc Page', () => {
    expect(
      findUploadAssignment([asg({ id: 'chap', entityType: 'Chapter', targetEntityId: 'c1' })], target)?.id,
    ).toBe('chap');
  });

  it('bỏ qua việc chưa InProgress, khác chương hoặc khác đối tượng', () => {
    const list = [
      asg({ status: 'Assigned' }),
      asg({ chapterId: 'c2' }),
      asg({ targetEntityId: 'other' }),
      asg({ entityType: 'Panel', targetEntityId: 'pn-other' }),
    ];
    expect(findUploadAssignment(list, target)).toBeUndefined();
  });
});

describe('needsArtworkLink / parseLinkExpiry', () => {
  const now = 1_000_000;

  it('cần link khi chưa có hoặc đã/sắp hết hạn', () => {
    expect(needsArtworkLink(undefined, now)).toBe(true);
    expect(needsArtworkLink(now - 1, now)).toBe(true);
    expect(needsArtworkLink(now + ARTWORK_LINK_SKEW_MS - 1, now)).toBe(true);
    expect(needsArtworkLink(now + ARTWORK_LINK_SKEW_MS + 1, now)).toBe(false);
  });

  it('đọc expiresAtUtc, dự phòng 4 phút khi không hợp lệ', () => {
    expect(parseLinkExpiry('2026-10-13T10:00:00Z', now)).toBe(Date.parse('2026-10-13T10:00:00Z'));
    expect(parseLinkExpiry('không-phải-ngày', now)).toBe(now + 4 * 60_000);
    expect(parseLinkExpiry(undefined, now)).toBe(now + 4 * 60_000);
  });
});

describe('errorMessage với problem+json', () => {
  it('ưu tiên error/message của BE, rồi errors, rồi title', () => {
    expect(errorMessage({ response: { data: { error: 'Lỗi BE' } } }, 'x')).toBe('Lỗi BE');
    expect(
      errorMessage(
        {
          response: {
            data: {
              title: 'One or more validation errors occurred.',
              errors: { StageId: ['StageId không hợp lệ.'] },
            },
          },
          message: 'Request failed with status code 400',
        },
        'x',
      ),
    ).toBe('StageId không hợp lệ.');
    expect(
      errorMessage(
        {
          response: { data: { title: 'Bad Request' } },
          message: 'Request failed with status code 400',
        },
        'x',
      ),
    ).toBe('Bad Request');
    expect(errorMessage(null, 'mặc định')).toBe('mặc định');
  });
});

// src/roles/writer/components/script/flow/comic-editor/ScriptVersioning.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialVersion,
  autosaveDraftAction,
  submitScriptAction,
  requestChangesAction,
  approveScriptAction,
  unlockScriptAction,
  restoreVersionAction,
  bumpMinor,
  bumpMajor,
} from './versioning/scriptVersionActions';
import { computeScriptDiff, analyzeScriptLineCategory } from './versioning/scriptDiffEngine';
import { ScriptVersion } from './versioning/types';

describe('Script Versioning Lifecycle & Diff System', () => {
  const CHAPTER_ID = 'chap-test-01';
  let initialVersions: ScriptVersion[];
  let currentId: string;

  beforeEach(() => {
    const v1 = createInitialVersion(
      CHAPTER_ID,
      '# Page 1\n- Panel 1: Close-up\nMINH: Xin chào',
      null,
      'writer-01'
    );
    initialVersions = [v1];
    currentId = v1.id;
  });

  // 1. Autosave does NOT increment version
  it('1. Autosave does NOT increment version (Working Draft rule)', () => {
    const vBefore = initialVersions[0];
    expect(vBefore.versionNumber).toBe('1.0');
    expect(vBefore.major).toBe(1);
    expect(vBefore.minor).toBe(0);
    expect(vBefore.status).toBe('DRAFT');

    // Giả lập gõ phím liên tục & debounce autosave
    const newText = '# Page 1\n- Panel 1: Close-up\nMINH: Xin chào thế giới\n- Panel 2: Wide shot';
    const { versions, updatedVersion } = autosaveDraftAction(
      initialVersions,
      currentId,
      newText,
      { type: 'doc', content: [] }
    );

    // Kiểm tra số phiên bản TUYỆT ĐỐI KHÔNG TĂNG
    expect(updatedVersion.versionNumber).toBe('1.0');
    expect(updatedVersion.major).toBe(1);
    expect(updatedVersion.minor).toBe(0);
    expect(updatedVersion.rawText).toBe(newText);
    expect(updatedVersion.status).toBe('DRAFT');
    expect(versions.length).toBe(1);
  });

  // 2. Submitting locks draft into IN_REVIEW
  it('2. Submitting locks draft into IN_REVIEW (Submit for Review rule)', () => {
    const { versions, updatedVersion } = submitScriptAction(initialVersions, currentId);

    expect(updatedVersion.status).toBe('IN_REVIEW');
    expect(updatedVersion.versionNumber).toBe('1.0');
    expect(updatedVersion.major).toBe(1);
    expect(updatedVersion.minor).toBe(0);
    expect(versions[0].status).toBe('IN_REVIEW');

    // Thử autosave khi đang IN_REVIEW sẽ bị chặn, không sửa đè
    const tryAutosave = autosaveDraftAction(versions, currentId, 'Nội dung sửa lén');
    expect(tryAutosave.updatedVersion.rawText).not.toBe('Nội dung sửa lén');
  });

  // 3. Requesting changes increments minor version (v1.0 -> v1.1)
  it('3. Requesting changes increments minor version (v1.0 -> v1.1) with changeLog', () => {
    // Bước 1: Gửi duyệt
    const submitted = submitScriptAction(initialVersions, currentId);

    // Bước 2: Producer yêu cầu chỉnh sửa
    const feedbackNotes = 'Cần tăng thêm thoại kịch tính cho nhân vật Minh ở trang 1.';
    const { versions, newDraftVersion } = requestChangesAction(
      submitted.versions,
      currentId,
      feedbackNotes,
      'producer-01'
    );

    // Kiểm tra version bump: minor tăng từ 0 lên 1 -> "1.1"
    expect(newDraftVersion.versionNumber).toBe('1.1');
    expect(newDraftVersion.major).toBe(1);
    expect(newDraftVersion.minor).toBe(1);
    expect(newDraftVersion.status).toBe('DRAFT');
    expect(newDraftVersion.changeLog).toBe(feedbackNotes);
    expect(newDraftVersion.isLocked).toBe(false);

    // Bản cũ trở thành DEPRECATED
    const oldVer = versions.find((v) => v.id === currentId);
    expect(oldVer?.status).toBe('DEPRECATED');

    // Thử một vòng phản hồi tiếp theo: v1.1 -> v1.2
    const submittedV1_1 = submitScriptAction(versions, newDraftVersion.id);
    const feedbackRound2 = requestChangesAction(
      submittedV1_1.versions,
      newDraftVersion.id,
      'Thêm âm thanh sfx',
      'producer-01'
    );
    expect(feedbackRound2.newDraftVersion.versionNumber).toBe('1.2');
    expect(feedbackRound2.newDraftVersion.major).toBe(1);
    expect(feedbackRound2.newDraftVersion.minor).toBe(2);
  });

  // 4. Unlocking an approved script increments major version (v1.1 -> v2.0)
  it('4. Unlocking an approved script increments major version (v1.1 -> v2.0)', () => {
    // Thiết lập kịch bản đang ở v1.1
    const v1_1: ScriptVersion = {
      id: `ver-${CHAPTER_ID}-1.1`,
      chapterId: CHAPTER_ID,
      versionNumber: '1.1',
      major: 1,
      minor: 1,
      rawText: '# Page 1\n- Panel 1: Close-up\nMINH: Lời thoại v1.1',
      snapshotAST: null,
      status: 'IN_REVIEW',
      isLocked: false,
      createdBy: 'writer-01',
      createdAt: new Date().toISOString(),
    };

    const versionsWithV1_1 = [...initialVersions, v1_1];

    // Producer duyệt kịch bản (Approve)
    const approved = approveScriptAction(versionsWithV1_1, v1_1.id, 'producer-01');
    expect(approved.approvedVersion.status).toBe('APPROVED');
    expect(approved.approvedVersion.isLocked).toBe(true);
    expect(approved.approvedVersion.approvedBy).toBe('producer-01');

    // Producer sau đó mở khóa sửa lại (Post-Approval Unlock)
    const unlocked = unlockScriptAction(approved.versions, v1_1.id, 'producer-01');

    // Kiểm tra MAJOR BUMP: 1.1 -> 2.0
    expect(unlocked.newMajorDraftVersion.versionNumber).toBe('2.0');
    expect(unlocked.newMajorDraftVersion.major).toBe(2);
    expect(unlocked.newMajorDraftVersion.minor).toBe(0);
    expect(unlocked.newMajorDraftVersion.status).toBe('DRAFT');
    expect(unlocked.newMajorDraftVersion.isLocked).toBe(false);

    // Bản APPROVED v1.1 cũ vẫn giữ nguyên làm baseline
    const previousApproved = unlocked.versions.find((v) => v.id === v1_1.id);
    expect(previousApproved?.status).toBe('APPROVED');
    expect(previousApproved?.isLocked).toBe(true);
  });

  // 5. Diff engine accurately flags deleted and added lines
  it('5. Diff engine accurately flags deleted, added, and modified lines', () => {
    const oldScript = [
      '# Page 1',
      '- Panel 1: Wide shot',
      'MINH: Câu thoại cũ',
      '- Panel 2: Low angle',
      '* BÙM! *',
    ].join('\n');

    const newScript = [
      '# Page 1',
      '- Panel 1: Close-up', // modified camera shot
      'MINH: Câu thoại mới đã cập nhật', // modified dialogue
      '- Panel 2: Low angle', // unchanged
      // removed '* BÙM! *'
      '- Panel 3: High angle', // added
      'LAN: Em đã đến đây!', // added
    ].join('\n');

    const diff = computeScriptDiff(oldScript, newScript);

    // Kiểm tra tổng số thay đổi
    expect(diff.addedCount).toBeGreaterThan(0);
    expect(diff.removedCount).toBeGreaterThan(0);
    expect(diff.lines.length).toBeGreaterThan(0);

    // Dòng bị xóa
    const removedLine = diff.lines.find(
      (l) => l.type === 'removed' && l.text.includes('* BÙM! *')
    );
    expect(removedLine).toBeDefined();

    // Dòng được thêm mới
    const addedPanel3 = diff.lines.find(
      (l) => l.type === 'added' && l.text.includes('Panel 3: High angle')
    );
    expect(addedPanel3).toBeDefined();

    const addedDialogue = diff.lines.find(
      (l) => l.type === 'added' && l.text.includes('LAN: Em đã đến đây!')
    );
    expect(addedDialogue).toBeDefined();

    // Dòng modified (camera angle hoặc thoại biến đổi)
    const modifiedLines = diff.lines.filter((l) => l.type === 'modified');
    expect(modifiedLines.length).toBeGreaterThanOrEqual(1);

    // Kiểm tra side-by-side alignment
    expect(diff.sideBySide.left.length).toBe(diff.sideBySide.right.length);
  });

  // 6. Test khôi phục kịch bản (Restore)
  it('6. Restores content from historical version into current draft', () => {
    const vOld: ScriptVersion = {
      id: 'ver-old',
      chapterId: CHAPTER_ID,
      versionNumber: '1.0',
      major: 1,
      minor: 0,
      rawText: 'Nội dung nguyên bản cổ xưa',
      snapshotAST: null,
      status: 'DEPRECATED',
      isLocked: false,
      createdBy: 'writer-01',
      createdAt: new Date().toISOString(),
    };

    const vCurDraft: ScriptVersion = {
      id: 'ver-current-draft',
      chapterId: CHAPTER_ID,
      versionNumber: '1.2',
      major: 1,
      minor: 2,
      rawText: 'Nội dung draft hiện tại bị lỗi',
      snapshotAST: null,
      status: 'DRAFT',
      isLocked: false,
      createdBy: 'writer-01',
      createdAt: new Date().toISOString(),
    };

    const list = [vOld, vCurDraft];
    const { updatedVersion } = restoreVersionAction(list, vCurDraft.id, vOld.id);

    expect(updatedVersion.rawText).toBe('Nội dung nguyên bản cổ xưa');
    expect(updatedVersion.versionNumber).toBe('1.2'); // Giữ nguyên version draft hiện tại
  });
});


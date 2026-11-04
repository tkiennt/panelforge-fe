// src/roles/writer/components/script/flow/comic-editor/versioning/scriptVersionActions.ts
import { ScriptVersion } from './types';

/**
 * Tạo định danh phiên bản chuỗi từ major và minor: "1.0", "1.1", "2.0"
 */
export function formatVersionNumber(major: number, minor: number): string {
  return `${major}.${minor}`;
}

/**
 * Tăng minor version (khi Producer yêu cầu chỉnh sửa)
 * Ví dụ: 1.0 -> 1.1, 1.1 -> 1.2
 */
export function bumpMinor(currentMajor: number, currentMinor: number): {
  major: number;
  minor: number;
  versionNumber: string;
} {
  const minor = currentMinor + 1;
  return {
    major: currentMajor,
    minor,
    versionNumber: formatVersionNumber(currentMajor, minor),
  };
}

/**
 * Tăng major version (khi kịch bản đã duyệt được Producer mở khóa sửa lại)
 * Ví dụ: 1.0 -> 2.0, 1.1 -> 2.0, 2.3 -> 3.0
 */
export function bumpMajor(currentMajor: number): {
  major: number;
  minor: number;
  versionNumber: string;
} {
  const major = currentMajor + 1;
  return {
    major,
    minor: 0,
    versionNumber: formatVersionNumber(major, 0),
  };
}

/**
 * Khởi tạo phiên bản nháp đầu tiên v1.0
 */
export function createInitialVersion(
  chapterId: string,
  rawText: string = '',
  snapshotAST: any = null,
  userId: string = 'writer-current'
): ScriptVersion {
  return {
    id: `ver-${chapterId}-1.0-${Date.now()}`,
    chapterId,
    versionNumber: '1.0',
    major: 1,
    minor: 0,
    rawText,
    snapshotAST,
    status: 'DRAFT',
    isLocked: false,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * QUY TẮC A: Autosave / Working Draft (KHÔNG tăng số phiên bản)
 * Khi status === 'DRAFT', chỉ cập nhật rawText và snapshotAST. Số phiên bản giữ nguyên.
 */
export function autosaveDraftAction(
  versions: ScriptVersion[],
  currentVersionId: string,
  rawText: string,
  snapshotAST?: any
): { versions: ScriptVersion[]; updatedVersion: ScriptVersion } {
  const index = versions.findIndex((v) => v.id === currentVersionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản với ID ${currentVersionId}`);
  }

  const current = versions[index];

  // Nếu đang khóa hoặc không phải DRAFT, không cho phép autosave đè
  if (current.isLocked || current.status !== 'DRAFT') {
    return { versions, updatedVersion: current };
  }

  const updatedVersion: ScriptVersion = {
    ...current,
    rawText,
    snapshotAST: snapshotAST !== undefined ? snapshotAST : current.snapshotAST,
    // Số phiên bản giữ nguyên tuyệt đối: major, minor, versionNumber không đổi!
  };

  const newVersions = [...versions];
  newVersions[index] = updatedVersion;

  return { versions: newVersions, updatedVersion };
}

/**
 * QUY TẮC B: Submit for Review (v1.0 DRAFT -> v1.0 IN_REVIEW)
 * Đóng băng nội dung vào snapshot bất biến v1.0 (IN_REVIEW).
 * Writer chuyển sang chế độ chỉ đọc chờ duyệt.
 */
export function submitScriptAction(
  versions: ScriptVersion[],
  currentVersionId: string
): { versions: ScriptVersion[]; updatedVersion: ScriptVersion } {
  const index = versions.findIndex((v) => v.id === currentVersionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản với ID ${currentVersionId}`);
  }

  const current = versions[index];
  if (current.status !== 'DRAFT') {
    throw new Error(`Chỉ có thể gửi duyệt bản nháp (DRAFT). Trạng thái hiện tại: ${current.status}`);
  }

  const updatedVersion: ScriptVersion = {
    ...current,
    status: 'IN_REVIEW',
    isLocked: false, // In review: không cho sửa, chờ Producer
  };

  const newVersions = [...versions];
  newVersions[index] = updatedVersion;

  return { versions: newVersions, updatedVersion };
}

/**
 * QUY TẮC C: Producer Feedback Loop (Minor Bump v1.0 -> v1.1)
 * Producer nhấn "Request Changes" kèm ghi chú phản hồi.
 * Tạo bản nháp mới v1.1 (DRAFT) kế thừa nội dung từ v1.0, gán changeLog.
 */
export function requestChangesAction(
  versions: ScriptVersion[],
  currentVersionId: string,
  feedbackNotes: string,
  producerId: string = 'producer-reviewer'
): { versions: ScriptVersion[]; newDraftVersion: ScriptVersion } {
  const index = versions.findIndex((v) => v.id === currentVersionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản với ID ${currentVersionId}`);
  }

  const reviewedVersion = versions[index];
  if (reviewedVersion.status !== 'IN_REVIEW') {
    throw new Error(`Chỉ có thể yêu cầu sửa đổi khi kịch bản đang chờ duyệt (IN_REVIEW).`);
  }

  // Đánh dấu bản trước đó
  const updatedReviewedVersion: ScriptVersion = {
    ...reviewedVersion,
    status: 'DEPRECATED',
  };

  // Tính minor mới
  const nextBump = bumpMinor(reviewedVersion.major, reviewedVersion.minor);

  // Tạo bản DRAFT mới với minor bump
  const newDraftVersion: ScriptVersion = {
    id: `ver-${reviewedVersion.chapterId}-${nextBump.versionNumber}-${Date.now()}`,
    chapterId: reviewedVersion.chapterId,
    versionNumber: nextBump.versionNumber,
    major: nextBump.major,
    minor: nextBump.minor,
    rawText: reviewedVersion.rawText,
    snapshotAST: reviewedVersion.snapshotAST,
    status: 'DRAFT',
    changeLog: feedbackNotes,
    isLocked: false,
    createdBy: reviewedVersion.createdBy,
    createdAt: new Date().toISOString(),
  };

  const newVersions = [...versions];
  newVersions[index] = updatedReviewedVersion;
  newVersions.push(newDraftVersion);

  return { versions: newVersions, newDraftVersion };
}

/**
 * QUY TẮC D.1: Approve Script (Trạng thái APPROVED, isLocked = true)
 * Producer nhấn "Approve Script". Script bị khóa cố định cho Artist vẽ thumbnail/storyboard.
 */
export function approveScriptAction(
  versions: ScriptVersion[],
  currentVersionId: string,
  producerId: string = 'producer-reviewer'
): { versions: ScriptVersion[]; approvedVersion: ScriptVersion } {
  const index = versions.findIndex((v) => v.id === currentVersionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản với ID ${currentVersionId}`);
  }

  const current = versions[index];
  if (current.status !== 'IN_REVIEW' && current.status !== 'DRAFT') {
    throw new Error(`Không thể duyệt kịch bản ở trạng thái ${current.status}`);
  }

  const approvedVersion: ScriptVersion = {
    ...current,
    status: 'APPROVED',
    isLocked: true,
    approvedBy: producerId,
  };

  const newVersions = [...versions];
  newVersions[index] = approvedVersion;

  return { versions: newVersions, approvedVersion };
}

/**
 * QUY TẮC D.2: Post-Approval Unlock (Major Bump v1.x -> v2.0)
 * Producer mở khóa kịch bản đã được duyệt trước đó.
 * Tự động tăng lên MAJOR version tiếp theo (v1.1 APPROVED -> v2.0 DRAFT).
 * Bản APPROVED cũ vẫn được giữ nguyên làm mốc đối chiếu (baseline) cho Artist.
 */
export function unlockScriptAction(
  versions: ScriptVersion[],
  currentVersionId: string,
  producerId: string = 'producer-reviewer'
): { versions: ScriptVersion[]; newMajorDraftVersion: ScriptVersion } {
  const index = versions.findIndex((v) => v.id === currentVersionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản với ID ${currentVersionId}`);
  }

  const approvedVersion = versions[index];
  if (approvedVersion.status !== 'APPROVED' && !approvedVersion.isLocked) {
    throw new Error(`Chỉ có thể mở khóa kịch bản đã duyệt (APPROVED).`);
  }

  // Tăng lên Major tiếp theo: v1.x -> v2.0
  const nextBump = bumpMajor(approvedVersion.major);

  const newMajorDraftVersion: ScriptVersion = {
    id: `ver-${approvedVersion.chapterId}-${nextBump.versionNumber}-${Date.now()}`,
    chapterId: approvedVersion.chapterId,
    versionNumber: nextBump.versionNumber,
    major: nextBump.major,
    minor: nextBump.minor,
    rawText: approvedVersion.rawText,
    snapshotAST: approvedVersion.snapshotAST,
    status: 'DRAFT',
    changeLog: `Mở khóa sửa đổi sau duyệt từ bản v${approvedVersion.versionNumber}`,
    isLocked: false,
    createdBy: producerId,
    createdAt: new Date().toISOString(),
  };

  // Bản approved cũ giữ nguyên trạng thái APPROVED và isLocked = true
  const newVersions = [...versions, newMajorDraftVersion];

  return { versions: newVersions, newMajorDraftVersion };
}

/**
 * Khôi phục kịch bản từ một bản ghi lịch sử trong quá khứ
 */
export function restoreVersionAction(
  versions: ScriptVersion[],
  currentVersionId: string,
  targetVersionId: string
): { versions: ScriptVersion[]; updatedVersion: ScriptVersion } {
  const target = versions.find((v) => v.id === targetVersionId);
  if (!target) {
    throw new Error(`Không tìm thấy phiên bản nguồn với ID ${targetVersionId}`);
  }

  const curIndex = versions.findIndex((v) => v.id === currentVersionId);
  if (curIndex === -1) {
    throw new Error(`Không tìm thấy phiên bản hiện tại với ID ${currentVersionId}`);
  }

  const current = versions[curIndex];

  // Nếu bản hiện tại là DRAFT và chưa khóa, áp dụng nội dung vào bản nháp hiện tại
  if (current.status === 'DRAFT' && !current.isLocked) {
    const updatedVersion: ScriptVersion = {
      ...current,
      rawText: target.rawText,
      snapshotAST: target.snapshotAST,
      changeLog: `Đã khôi phục nội dung từ v${target.versionNumber}`,
    };
    const newVersions = [...versions];
    newVersions[curIndex] = updatedVersion;
    return { versions: newVersions, updatedVersion };
  }

  // Nếu bản hiện tại đã khóa/in review, không thể đè trực tiếp
  throw new Error(`Không thể khôi phục đè lên phiên bản đang khóa hoặc chờ duyệt.`);
}


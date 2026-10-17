import type {
  ProvenanceEdge,
  ProvenanceEventType,
  ProvenanceNode,
  ProvenanceReportResponse,
} from '@/services/aiAgents.service';
import { normalizeRole } from '@/shared/features/collaboration/collaborationRules';

/**
 * Hàm thuần cho màn Lịch sử & Provenance (CF4). Chỉ là UX: Backend vẫn kiểm quyền thật
 * (Provenance Report: Producer/Editor; snapshot và lịch sử AI: mọi thành viên Workspace).
 */

/** UC-19: Producer xem Provenance Report; Editor xem chỉ đọc. Role khác BE trả 403 nên ẩn tab. */
export const canViewProvenanceReport = (role?: string | null): boolean => {
  const r = normalizeRole(role);
  return r === 'PRODUCER' || r === 'EDITOR';
};

export const EVENT_LABEL: Record<ProvenanceEventType, string> = {
  RunStarted: 'AI bắt đầu chạy',
  RunCompleted: 'AI chạy xong',
  RunFailed: 'AI chạy lỗi',
  StepCompleted: 'Agent hoàn thành bước',
  SuggestionCreated: 'AI đề xuất',
  DecisionMade: 'Người quyết định',
  RevisionCreated: 'Tạo phiên bản nội dung',
  SnapshotCreated: 'Producer duyệt chương',
  ArtworkUploaded: 'Họa sĩ tải artwork',
  LetteringChanged: 'Letterer chỉnh sửa chữ',
  WorkSubmitted: 'Nộp công đoạn',
  ReviewDecided: 'Biên tập viên thẩm định',
};

/** Nhóm màu: AI (tím), người (xanh lá), lỗi (đỏ), duyệt (cam). */
export const eventTone = (type: ProvenanceEventType): 'ai' | 'human' | 'error' | 'approval' => {
  if (type === 'RunFailed') return 'error';
  if (
    type === 'DecisionMade' ||
    type === 'RevisionCreated' ||
    type === 'ArtworkUploaded' ||
    type === 'LetteringChanged' ||
    type === 'WorkSubmitted'
  )
    return 'human';
  if (type === 'SnapshotCreated' || type === 'ReviewDecided') return 'approval';
  return 'ai';
};

/** Revision do AI hay người tạo (BE ghi `origin` trong details; fallback theo sourceSuggestionId). */
export const revisionOrigin = (node: ProvenanceNode): 'AI' | 'Human' => {
  const d = node.details ?? {};
  if (d.origin === 'AI' || d.origin === 'Human') return d.origin;
  return d.SourceSuggestionId || d.sourceSuggestionId ? 'AI' : 'Human';
};

/** Đọc một trường trong details không phân biệt PascalCase/camelCase (BE trả object ẩn danh). */
export const detail = (node: ProvenanceNode | undefined, key: string): unknown => {
  const d = node?.details;
  if (!d) return undefined;
  if (key in d) return d[key];
  const alt =
    key[0] === key[0].toUpperCase()
      ? key[0].toLowerCase() + key.slice(1)
      : key[0].toUpperCase() + key.slice(1);
  return d[alt];
};

export interface RevisionTrace {
  revision: ProvenanceNode;
  origin: 'AI' | 'Human';
  suggestion?: ProvenanceNode;
  decision?: ProvenanceNode;
  step?: ProvenanceNode;
  run?: ProvenanceNode;
  previousVersion?: ProvenanceNode;
  /** Revision gốc nếu đây là bản khôi phục. */
  restoredFrom?: ProvenanceNode;
  /** Các bản duyệt chương có chứa revision này. */
  snapshots: ProvenanceNode[];
}

const incoming = (edges: ProvenanceEdge[], toId: string, rel: string) =>
  edges.filter((e) => e.toId === toId && e.relationship === rel).map((e) => e.fromId);
const outgoing = (edges: ProvenanceEdge[], fromId: string, rel: string) =>
  edges.filter((e) => e.fromId === fromId && e.relationship === rel).map((e) => e.toId);

/**
 * BR-10: truy ngược một revision → đề xuất AI → bước agent → run, cùng quyết định của người và bản duyệt chứa nó.
 * Trả lời "agent nào, từ revision nào, tạo ra nội dung này và ai đã duyệt".
 */
export function traceRevision(
  report: ProvenanceReportResponse,
  revisionId: string,
): RevisionTrace | null {
  const byId = new Map(report.nodes.map((n) => [n.id, n]));
  const revision = byId.get(revisionId);
  if (!revision || revision.nodeType !== 'Revision') return null;

  const pick = (ids: string[], type: ProvenanceNode['nodeType']) =>
    ids.map((id) => byId.get(id)).find((n) => n?.nodeType === type);

  const suggestion = pick(incoming(report.edges, revisionId, 'originatedFrom'), 'Suggestion');
  const decision =
    pick(incoming(report.edges, revisionId, 'created'), 'Decision') ??
    (suggestion ? pick(outgoing(report.edges, suggestion.id, 'decided'), 'Decision') : undefined);
  const step = suggestion
    ? pick(incoming(report.edges, suggestion.id, 'produced'), 'Step')
    : undefined;
  const run = step ? pick(incoming(report.edges, step.id, 'produced'), 'Run') : undefined;
  const previousVersion = pick(incoming(report.edges, revisionId, 'previousVersion'), 'Revision');
  const restoredFrom = pick(incoming(report.edges, revisionId, 'restoredFrom'), 'Revision');
  const snapshots = outgoing(report.edges, revisionId, 'includedIn')
    .map((id) => byId.get(id))
    .filter((n): n is ProvenanceNode => n?.nodeType === 'Snapshot');

  return {
    revision,
    origin: revisionOrigin(revision),
    suggestion,
    decision,
    step,
    run,
    previousVersion,
    restoredFrom,
    snapshots,
  };
}

/** Revision mới nhất trước, để chọn truy vết. */
export const revisionsOf = (report: ProvenanceReportResponse): ProvenanceNode[] =>
  report.nodes
    .filter((n) => n.nodeType === 'Revision')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

/** Rút gọn hash/id dài để hiển thị (đủ để đối chiếu bằng mắt). */
export const shortHash = (value?: string | null, size = 10): string =>
  !value ? '—' : value.length <= size ? value : `${value.slice(0, size)}…`;

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
};

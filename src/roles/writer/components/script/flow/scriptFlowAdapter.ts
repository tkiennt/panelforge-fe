// src/roles/writer/components/script/flow/scriptFlowAdapter.ts
/**
 * Chuyển đổi hai chiều giữa tài liệu editor (các dòng `el`) và dữ liệu máy chủ:
 * ScriptLine (Kind, SpeakerLabel, Text) + khung Trang → Panel (Panel.Direction).
 *
 * Quy ước lưu (không đọc định dạng cũ — D6):
 * - Action → Kind.Action · Caption → Kind.Narration · SFX → Kind.Sfx.
 * - Character + (Parens) + Dialogue → một dòng Kind.Dialogue, SpeakerLabel = "TÊN" hoặc "TÊN (PARENS)".
 *   Parens là "nghĩ"/"thought" → Kind.Thought, SpeakerLabel = "TÊN".
 * - Chữ của dòng Panel → Panel.Direction. Dòng Trang không mang chữ.
 */
import type { JSONContent } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  NarrationMode,
  SceneDetailDto,
  ScriptLineKind,
  ScriptLineRefInput,
} from '@/services/scriptLine.service';
import type { PageDto } from '@/services/page.service';
import type { PanelDto } from '@/types/pipeline';
import { GnElement, isThoughtParens } from './grammar/scriptGrammar';
import { MangaBlockType } from './types';

export function generateGuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import type {
  ScriptTreeCast,
  ScriptTreeLine,
  ScriptTreePanel,
  ScriptTreePage,
  ChapterScriptBody,
} from '@/services/chapter.service';
export type { ScriptTreeCast, ScriptTreeLine, ScriptTreePanel, ScriptTreePage, ChapterScriptBody };

export function isValidGuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export interface ExtractedScriptLinePayload {
  scriptLineId: string;
  sceneId: string;
  kind?: ScriptLineKind | number;
  speakerLabel?: string | null;
  text?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  narrationMode: NarrationMode;
  lineOrder: number;
  blockType?: MangaBlockType;
  panelId?: string | null;
  pageNumber?: number;
  panelNumber?: number;
  refs?: ScriptLineRefInput[] | null;
}

export interface ScriptStructurePanelDraft {
  panelNumber: number;
  /** Id Panel trên máy chủ nếu dòng panel đã từng lưu. */
  panelId: string | null;
  direction: string;
  castRevisions?: { bibleEntryId: string; revisionId: string }[] | null;
}

export interface ScriptStructurePageDraft {
  pageNumber: number;
  panels: ScriptStructurePanelDraft[];
}

export interface ScriptDocSnapshot {
  lines: ExtractedScriptLinePayload[];
  pages: ScriptStructurePageDraft[];
  tree?: ChapterScriptBody;
}

// ───────────────────────── máy chủ → editor ─────────────────────────

function toKind(
  kind: unknown,
  dialogueText?: string | null,
  speakerLabel?: string | null,
): ScriptLineKind {
  if (typeof kind === 'number' && ScriptLineKind[kind] !== undefined) return kind as ScriptLineKind;
  if (typeof kind === 'string') {
    const byName = (ScriptLineKind as unknown as Record<string, number>)[kind];
    if (typeof byName === 'number') return byName as ScriptLineKind;
    const n = Number(kind);
    if (!Number.isNaN(n) && ScriptLineKind[n] !== undefined) return n as ScriptLineKind;
  }
  if (dialogueText || speakerLabel) return ScriptLineKind.Dialogue;
  return ScriptLineKind.Action;
}

function line(
  el: GnElement,
  text?: string | null,
  refId: string | null = null,
  refs?: ScriptLineRefInput[] | null,
  castRevisions?: { bibleEntryId: string; revisionId: string }[] | null,
): JSONContent {
  const value = (text ?? '').trim();
  const attrs: Record<string, any> = { el, refId };
  if (castRevisions && castRevisions.length > 0) {
    attrs.castRevisions = castRevisions;
  }

  if (!value) {
    return { type: 'scriptLine', attrs };
  }

  if (refs && refs.length > 0 && (el === 'action' || el === 'caption' || el === 'sfx')) {
    type Segment = { from: number; to: number; ref: ScriptLineRefInput };
    const segments: Segment[] = [];
    const lowerValue = value.toLowerCase();

    for (const ref of refs) {
      const lowerTarget = ref.surfaceText.toLowerCase().trim();
      if (!lowerTarget) continue;
      let idx = 0;
      while ((idx = lowerValue.indexOf(lowerTarget, idx)) !== -1) {
        segments.push({
          from: idx,
          to: idx + lowerTarget.length,
          ref,
        });
        idx += lowerTarget.length;
      }
    }

    segments.sort((a, b) => a.from - b.from);
    const nonOverlapping: Segment[] = [];
    let lastTo = 0;
    for (const seg of segments) {
      if (seg.from >= lastTo) {
        nonOverlapping.push(seg);
        lastTo = seg.to;
      }
    }

    if (nonOverlapping.length > 0) {
      const content: JSONContent[] = [];
      let cursor = 0;
      for (const seg of nonOverlapping) {
        if (seg.from > cursor) {
          content.push({ type: 'text', text: value.substring(cursor, seg.from) });
        }
        content.push({
          type: 'text',
          text: value.substring(seg.from, seg.to),
          marks: [
            {
              type: 'bibleRef',
              attrs: {
                entryId: seg.ref.bibleEntryId ?? null,
                surfaceText: seg.ref.surfaceText,
                newDraft: seg.ref.newDraft ?? null,
              },
            },
          ],
        });
        cursor = seg.to;
      }
      if (cursor < value.length) {
        content.push({ type: 'text', text: value.substring(cursor) });
      }
      return { type: 'scriptLine', attrs, content };
    }
  }

  return {
    type: 'scriptLine',
    attrs,
    content: [{ type: 'text', text: value }],
  };
}

/** "KAI (OFF)" → { name: "KAI", parens: "OFF" } */
export function splitSpeakerLabel(label?: string | null): { name: string; parens: string | null } {
  const raw = (label ?? '').replace(/:+$/, '').trim();
  const m = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (m && m[1].trim()) return { name: m[1].trim(), parens: m[2].trim() || null };
  return { name: raw, parens: null };
}

interface ServerLine {
  id: string;
  lineOrder: number;
  kind: ScriptLineKind;
  speakerLabel: string | null;
  text: string;
  panelId: string | null;
  refs?: ScriptLineRefInput[] | null;
}

function collectLines(scenes: SceneDetailDto[]): ServerLine[] {
  return [...scenes]
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .flatMap((s) =>
      [...(s.scriptLines ?? [])]
        .sort((a, b) => a.lineOrder - b.lineOrder)
        .map((l) => ({
          id: l.id,
          lineOrder: l.lineOrder,
          kind: toKind(l.kind, l.dialogueText, l.speakerLabel),
          speakerLabel: l.speakerLabel ?? null,
          text: (l.text ?? l.dialogueText ?? l.stageDirection ?? '').trim(),
          panelId: l.panelId ?? null,
          refs: (l as any).refs ?? null,
        })),
    )
    .filter((l) => l.text.length > 0);
}

function linesToNodes(lines: ServerLine[]): JSONContent[] {
  const out: JSONContent[] = [];
  let prevSpeaker: string | null = null;
  for (const l of lines) {
    if (l.kind === ScriptLineKind.Dialogue || l.kind === ScriptLineKind.Thought) {
      const { name, parens: labelParens } = splitSpeakerLabel(l.speakerLabel);
      const parens = l.kind === ScriptLineKind.Thought ? 'nghĩ' : labelParens;
      const speaker = name.toUpperCase();
      // Cùng người nói ngay sau thoại trước, có Parens: viết tiếp dưới tên cũ như WriterSolo.
      if (!(parens && prevSpeaker === speaker && out[out.length - 1]?.attrs?.el === 'dialogue')) {
        out.push(line('character', speaker ? `${speaker}:` : ''));
      }
      if (parens) out.push(line('parens', parens));
      out.push(line('dialogue', l.text, l.id));
      prevSpeaker = speaker;
      continue;
    }
    prevSpeaker = null;
    const el: GnElement =
      l.kind === ScriptLineKind.Narration
        ? 'caption'
        : l.kind === ScriptLineKind.Sfx
          ? 'sfx'
          : 'action';
    out.push(line(el, l.text, l.id, l.refs));
  }
  return out;
}

/**
 * Dựng tài liệu editor từ Scene (dòng) + Trang + Panel của chương.
 * Dòng chưa gắn Panel nào được đặt vào cuối Panel cuối cùng để không mất chữ.
 */
export function scriptToDoc(
  scenes: SceneDetailDto[],
  pages: PageDto[],
  panels: PanelDto[],
): JSONContent {
  const lines = collectLines(scenes);
  const byPanel = new Map<string, ServerLine[]>();
  const orphans: ServerLine[] = [];
  const knownPanelIds = new Set(panels.map((p) => p.id));
  for (const l of lines) {
    if (l.panelId && knownPanelIds.has(l.panelId)) {
      const list = byPanel.get(l.panelId) ?? [];
      list.push(l);
      byPanel.set(l.panelId, list);
    } else {
      orphans.push(l);
    }
  }

  const content: JSONContent[] = [];
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  for (const page of sortedPages) {
    content.push(line('page'));
    const pagePanels = panels
      .filter((p) => p.pageId === page.id)
      .sort((a, b) => a.panelNumber - b.panelNumber);
    for (const panel of pagePanels) {
      content.push(
        line('panel', panel.direction ?? '', panel.id, null, (panel as any).castRevisions ?? null),
      );
      content.push(...linesToNodes(byPanel.get(panel.id) ?? []));
    }
  }

  if (content.length === 0) {
    content.push(line('page'), line('panel'));
  }
  if (orphans.length > 0) {
    if (!content.some((n) => n.attrs?.el === 'panel')) content.push(line('panel'));
    content.push(...linesToNodes(orphans));
  }
  return { type: 'doc', content };
}

// ───────────────────────── editor → máy chủ ─────────────────────────

const BLOCK_TYPE: Record<'action' | 'caption' | 'sfx' | 'dialogue' | 'thought', MangaBlockType> = {
  action: 'stage_direction',
  caption: 'caption',
  sfx: 'sfx',
  dialogue: 'dialogue',
  thought: 'thought',
};

const stripParens = (s: string) =>
  s
    .trim()
    .replace(/^\(\s*/, '')
    .replace(/\s*\)$/, '')
    .trim();

export function extractRefs(node: PMNode): ScriptLineRefInput[] {
  const lineRefs: ScriptLineRefInput[] = [];
  node.descendants((child) => {
    if (child.isText && child.marks.length > 0) {
      for (const m of child.marks) {
        if (m.type.name === 'bibleRef') {
          const entryId = (m.attrs.entryId as string | null) || null;
          const surf = (m.attrs.surfaceText as string | null) || child.text || '';
          const newDraft = (m.attrs.newDraft as { name: string; category?: number } | null) || null;
          if (
            surf &&
            !lineRefs.some(
              (r) =>
                (entryId && r.bibleEntryId === entryId) ||
                (!entryId && newDraft && r.newDraft?.name === newDraft.name) ||
                r.surfaceText.toLowerCase() === surf.toLowerCase(),
            )
          ) {
            lineRefs.push({
              surfaceText: surf,
              bibleEntryId: entryId,
              newDraft: newDraft,
            });
          }
        }
      }
    }
  });
  return lineRefs;
}

/**
 * SCR-14: Xây dựng toàn bộ cây dữ liệu kịch bản (Trang → Panel (kèm direction + castRevisions) → Dòng (kèm refs))
 * trực tiếp từ tài liệu editor.
 */
export function docToScriptTree(
  doc: PMNode,
  expectedRevisionId?: string | null,
): ChapterScriptBody {
  const pages: ScriptTreePage[] = [];
  let pageNo = 0;
  let panelNo = 0;
  let currentPage: ScriptTreePage | null = null;
  let currentPanel: ScriptTreePanel | null = null;
  let speaker: string | null = null;
  let parens: string | null = null;

  const ensurePage = () => {
    if (!currentPage) {
      pageNo += 1;
      currentPage = {
        id: null,
        number: pageNo,
        panels: [],
      };
      pages.push(currentPage);
    }
    return currentPage;
  };

  const ensurePanel = () => {
    const p = ensurePage();
    if (!currentPanel) {
      panelNo += 1;
      currentPanel = {
        id: null,
        number: panelNo,
        direction: null,
        castRevisions: null,
        lines: [],
      };
      p.panels = p.panels ?? [];
      p.panels.push(currentPanel);
    }
    return currentPanel;
  };

  doc.forEach((node) => {
    const el = node.attrs.el as GnElement;
    const text = node.textContent.trim();
    const refId = (node.attrs.refId as string | null) ?? null;

    switch (el) {
      case 'page': {
        pageNo += 1;
        panelNo = 0;
        currentPanel = null;
        speaker = null;
        parens = null;
        currentPage = {
          id: isValidGuid(refId) ? refId : null,
          number: pageNo,
          panels: [],
        };
        pages.push(currentPage);
        return;
      }
      case 'panel': {
        ensurePage();
        panelNo += 1;
        speaker = null;
        parens = null;
        const rawCast =
          (node.attrs.castRevisions as Array<{
            entryId?: string;
            bibleEntryId?: string;
            revisionId: string;
          }> | null) ?? null;
        const castRevisions: ScriptTreeCast[] | null =
          rawCast && rawCast.length > 0
            ? rawCast
                .map((c) => ({
                  entryId: c.entryId || c.bibleEntryId || '',
                  revisionId: c.revisionId,
                }))
                .filter((c) => !!c.entryId && !!c.revisionId)
            : null;

        currentPanel = {
          id: isValidGuid(refId) ? refId : null,
          number: panelNo,
          direction: text || null,
          ...(castRevisions && castRevisions.length > 0 ? { castRevisions } : {}),
          lines: [],
        };
        currentPage!.panels = currentPage!.panels ?? [];
        currentPage!.panels.push(currentPanel);
        return;
      }
      case 'character': {
        speaker = text ? text.replace(/:+$/, '').trim().toUpperCase() : null;
        parens = null;
        return;
      }
      case 'parens': {
        parens = stripParens(text) || null;
        return;
      }
      case 'dialogue': {
        if (text) {
          const panel = ensurePanel();
          const thought = isThoughtParens(parens);
          const label = speaker
            ? parens && !thought
              ? `${speaker} (${parens.toUpperCase()})`
              : speaker
            : null;
          const refs = extractRefs(node);
          panel.lines = panel.lines ?? [];
          panel.lines.push({
            id: isValidGuid(refId) ? refId : null,
            kind: thought ? ScriptLineKind.Thought : ScriptLineKind.Dialogue,
            speakerLabel: label,
            text,
            refs: refs.length > 0 ? refs : null,
          });
        }
        parens = null;
        return;
      }
      default: {
        speaker = null;
        parens = null;
        if (!text) return;
        const panel = ensurePanel();
        const refs = extractRefs(node);
        const kind =
          el === 'caption'
            ? ScriptLineKind.Narration
            : el === 'sfx'
              ? ScriptLineKind.Sfx
              : ScriptLineKind.Action;
        panel.lines = panel.lines ?? [];
        panel.lines.push({
          id: isValidGuid(refId) ? refId : null,
          kind,
          speakerLabel: null,
          text,
          refs: refs.length > 0 ? refs : null,
        });
      }
    }
  });

  return {
    expectedRevisionId: expectedRevisionId ?? null,
    pages,
  };
}

export const docToChapterScript = docToScriptTree;

/** Đọc tài liệu editor thành danh sách dòng + khung Trang/Panel để lưu. Dòng trống bị bỏ qua. */
export function docToScript(doc: PMNode, sceneId: string): ScriptDocSnapshot {
  const lines: ExtractedScriptLinePayload[] = [];
  const pages: ScriptStructurePageDraft[] = [];
  let pageNo = 0;
  let panelNo = 0;
  let panelId: string | null = null;
  let speaker: string | null = null;
  let parens: string | null = null;

  const ensurePage = () => {
    if (pages.length === 0) {
      pageNo = 1;
      pages.push({ pageNumber: 1, panels: [] });
    }
  };

  const push = (
    kind: ScriptLineKind,
    text: string,
    refId: string | null,
    blockType: MangaBlockType,
    speakerLabel: string | null = null,
    refs: ScriptLineRefInput[] | null = null,
  ) => {
    const isSpeech = kind === ScriptLineKind.Dialogue || kind === ScriptLineKind.Thought;
    lines.push({
      scriptLineId: refId || generateGuid(),
      sceneId,
      kind,
      speakerLabel,
      text,
      dialogueText: isSpeech ? text : null,
      stageDirection: isSpeech ? null : text,
      narrationMode: 'Present',
      lineOrder: lines.length + 1,
      blockType,
      panelId,
      pageNumber: pageNo,
      panelNumber: panelNo,
      refs: refs && refs.length > 0 ? refs : null,
    });
  };

  doc.forEach((node) => {
    const el = node.attrs.el as GnElement;
    const text = node.textContent.trim();
    const refId = (node.attrs.refId as string | null) ?? null;
    switch (el) {
      case 'page':
        pageNo += 1;
        panelNo = 0;
        panelId = null;
        speaker = null;
        parens = null;
        pages.push({ pageNumber: pageNo, panels: [] });
        return;
      case 'panel': {
        ensurePage();
        panelNo += 1;
        panelId = refId;
        speaker = null;
        parens = null;
        const panelCastRevs =
          (node.attrs.castRevisions as { bibleEntryId: string; revisionId: string }[] | null) ??
          null;
        pages[pages.length - 1].panels.push({
          panelNumber: panelNo,
          panelId: refId,
          direction: text,
          ...(panelCastRevs && panelCastRevs.length > 0 ? { castRevisions: panelCastRevs } : {}),
        });
        return;
      }
      case 'character':
        speaker = text ? text.replace(/:+$/, '').trim().toUpperCase() : null;
        parens = null;
        return;
      case 'parens':
        parens = stripParens(text) || null;
        return;
      case 'dialogue': {
        if (text) {
          const thought = isThoughtParens(parens);
          const label = speaker
            ? parens && !thought
              ? `${speaker} (${parens.toUpperCase()})`
              : speaker
            : null;
          push(
            thought ? ScriptLineKind.Thought : ScriptLineKind.Dialogue,
            text,
            refId,
            thought ? BLOCK_TYPE.thought : BLOCK_TYPE.dialogue,
            label,
          );
        }
        parens = null;
        return;
      }
      default: {
        speaker = null;
        parens = null;
        if (!text) return;

        // Trích xuất refs từ các mark bibleRef trong dòng (BIB-16, 1A, 2A, 5A)
        const lineRefs = extractRefs(node);

        if (el === 'caption')
          push(ScriptLineKind.Narration, text, refId, BLOCK_TYPE.caption, null, lineRefs);
        else if (el === 'sfx')
          push(ScriptLineKind.Sfx, text, refId, BLOCK_TYPE.sfx, null, lineRefs);
        else push(ScriptLineKind.Action, text, refId, BLOCK_TYPE.action, null, lineRefs);
      }
    }
  });

  return { lines, pages, tree: docToScriptTree(doc) };
}

// src/roles/writer/components/script/flow/scriptFlowAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ScriptLineKind, SceneDetailDto } from '@/services/scriptLine.service';
import type { PageDto } from '@/services/page.service';
import type { PanelDto } from '@/types/pipeline';
import { ScriptDocument, ScriptLineBlockNode } from './nodes/ScriptLineBlockNode';
import { docToScript, scriptToDoc, splitSpeakerLabel } from './scriptFlowAdapter';

const PAGE_ID = '11111111-1111-4111-8111-111111111111';
const PANEL_1 = '22222222-2222-4222-8222-222222222222';
const PANEL_2 = '33333333-3333-4333-8333-333333333333';

const toNode = (doc: JSONContent) =>
  new Editor({
    extensions: [
      StarterKit.configure({
        document: false,
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        trailingNode: false,
      }),
      ScriptDocument,
      ScriptLineBlockNode,
    ],
    content: doc,
  }).state.doc;

const page = { id: PAGE_ID, chapterId: 'c', pageNumber: 1 } as PageDto;
const panels = [
  { id: PANEL_1, pageId: PAGE_ID, panelNumber: 1, direction: 'Toàn cảnh mái nhà' },
  { id: PANEL_2, pageId: PAGE_ID, panelNumber: 2, direction: null },
] as PanelDto[];

const scene = (lines: Partial<SceneDetailDto['scriptLines'][number]>[]): SceneDetailDto =>
  ({
    id: 'scene-1',
    chapterId: 'c',
    sceneNumber: 1,
    createdAt: '',
    scriptLines: lines.map((l, i) => ({ id: `l${i}`, lineOrder: i + 1, ...l })),
  }) as SceneDetailDto;

describe('scriptFlowAdapter', () => {
  it('splitSpeakerLabel tách tên và sắc thái', () => {
    expect(splitSpeakerLabel('KAI (OFF)')).toEqual({ name: 'KAI', parens: 'OFF' });
    expect(splitSpeakerLabel('KAI')).toEqual({ name: 'KAI', parens: null });
    expect(splitSpeakerLabel(null)).toEqual({ name: '', parens: null });
  });

  it('scriptToDoc dựng Trang → Panel (kèm Direction) → các dòng theo Kind', () => {
    const doc = scriptToDoc(
      [
        scene([
          { kind: ScriptLineKind.Action, text: 'Kai đứng ở mép', panelId: PANEL_1 },
          {
            kind: ScriptLineKind.Dialogue,
            speakerLabel: 'KAI (OFF)',
            text: 'Đi thôi',
            panelId: PANEL_1,
          },
          {
            kind: ScriptLineKind.Thought,
            speakerLabel: 'MIA',
            text: 'Hắn nói dối',
            panelId: PANEL_2,
          },
          { kind: ScriptLineKind.Narration, text: 'Nửa đêm', panelId: PANEL_2 },
          { kind: ScriptLineKind.Sfx, text: 'BÙM', panelId: PANEL_2 },
        ]),
      ],
      [page],
      panels,
    );
    const shape = (doc.content ?? []).map((n) => [n.attrs?.el, n.content?.[0]?.text ?? '']);
    expect(shape).toEqual([
      ['page', ''],
      ['panel', 'Toàn cảnh mái nhà'],
      ['action', 'Kai đứng ở mép'],
      ['character', 'KAI:'],
      ['parens', 'OFF'],
      ['dialogue', 'Đi thôi'],
      ['panel', ''],
      ['character', 'MIA:'],
      ['parens', 'nghĩ'],
      ['dialogue', 'Hắn nói dối'],
      ['caption', 'Nửa đêm'],
      ['sfx', 'BÙM'],
    ]);
  });

  it('chương trống mở sẵn một Trang và một Panel', () => {
    const doc = scriptToDoc([], [], []);
    expect((doc.content ?? []).map((n) => n.attrs?.el)).toEqual(['page', 'panel']);
  });

  it('docToScript lưu Kind, SpeakerLabel, số Trang/Panel và Direction; bỏ dòng trống', () => {
    const line = (el: string, text = '', refId: string | null = null): JSONContent => ({
      type: 'scriptLine',
      attrs: { el, refId },
      ...(text ? { content: [{ type: 'text', text }] } : {}),
    });
    const snapshot = docToScript(
      toNode({
        type: 'doc',
        content: [
          line('page'),
          line('panel', 'Toàn cảnh', PANEL_1),
          line('action', 'Panel 3 cho thấy cả thành phố'),
          line('character', 'kai'),
          line('parens', 'off'),
          line('dialogue', 'Đi thôi'),
          line('action'),
          line('character', 'MIA'),
          line('parens', 'nghĩ'),
          line('dialogue', 'Hắn nói dối'),
          line('page'),
          line('panel'),
          line('caption', 'Nửa đêm'),
          line('sfx', 'BÙM'),
        ],
      }),
      'scene-1',
    );

    expect(snapshot.pages).toEqual([
      { pageNumber: 1, panels: [{ panelNumber: 1, panelId: PANEL_1, direction: 'Toàn cảnh' }] },
      { pageNumber: 2, panels: [{ panelNumber: 1, panelId: null, direction: '' }] },
    ]);
    expect(
      snapshot.lines.map((l) => [l.kind, l.speakerLabel, l.text, l.pageNumber, l.panelNumber]),
    ).toEqual([
      [ScriptLineKind.Action, null, 'Panel 3 cho thấy cả thành phố', 1, 1],
      [ScriptLineKind.Dialogue, 'KAI (OFF)', 'Đi thôi', 1, 1],
      [ScriptLineKind.Thought, 'MIA', 'Hắn nói dối', 1, 1],
      [ScriptLineKind.Narration, null, 'Nửa đêm', 2, 1],
      [ScriptLineKind.Sfx, null, 'BÙM', 2, 1],
    ]);
    expect(snapshot.lines.every((l) => l.speakerCharacterId === null)).toBe(true);
    expect(snapshot.lines[1].dialogueText).toBe('Đi thôi');
    expect(snapshot.lines[0].stageDirection).toBe('Panel 3 cho thấy cả thành phố');
  });

  it('lưu rồi nạp lại giữ nguyên tài liệu', () => {
    const original = scriptToDoc(
      [
        scene([
          { kind: ScriptLineKind.Action, text: 'Mưa', panelId: PANEL_1 },
          {
            kind: ScriptLineKind.Dialogue,
            speakerLabel: 'KAI',
            text: 'Lạnh quá',
            panelId: PANEL_1,
          },
        ]),
      ],
      [page],
      [panels[0]],
    );
    const snapshot = docToScript(toNode(original), 'scene-1');
    expect(snapshot.lines.map((l) => [l.scriptLineId, l.kind, l.text])).toEqual([
      ['l0', ScriptLineKind.Action, 'Mưa'],
      ['l1', ScriptLineKind.Dialogue, 'Lạnh quá'],
    ]);
    expect(snapshot.pages[0].panels[0]).toEqual({
      panelNumber: 1,
      panelId: PANEL_1,
      direction: 'Toàn cảnh mái nhà',
    });
  });

  it('nhận diện Dialogue và dựng Character khi dòng từ server thiếu kind nhưng có speakerLabel/dialogueText', () => {
    const doc = scriptToDoc(
      [
        scene([
          {
            dialogueText: 'Xin chào',
            speakerLabel: 'NARUTO',
            panelId: PANEL_1,
          } as any,
        ]),
      ],
      [page],
      [panels[0]],
    );
    const shape = (doc.content ?? []).map((n) => [n.attrs?.el, n.content?.[0]?.text ?? '']);
    expect(shape).toContainEqual(['character', 'NARUTO:']);
    expect(shape).toContainEqual(['dialogue', 'Xin chào']);
  });
});

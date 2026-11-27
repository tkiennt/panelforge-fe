// src/roles/writer/components/script/flow/scriptFlowAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ScriptLineKind, SceneDetailDto } from '@/services/scriptLine.service';
import type { PageDto } from '@/services/page.service';
import type { PanelDto } from '@/types/pipeline';
import { ScriptDocument, ScriptLineBlockNode, BibleRefMark } from './nodes/ScriptLineBlockNode';
import { docToScript, scriptToDoc, splitSpeakerLabel, docToScriptTree } from './scriptFlowAdapter';

const PAGE_ID = '11111111-1111-4111-8111-111111111111';
const PANEL_1 = '22222222-2222-4222-8222-222222222222';
const PANEL_2 = '33333333-3333-4333-8333-333333333333';

const toNode = (doc: JSONContent) => {
  const editor = new Editor({
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
      BibleRefMark,
    ],
    content: doc,
  });
  const node = editor.state.doc;
  editor.destroy();
  return node;
};

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

  it('dòng cũ có cả thoại lẫn chỉ dẫn cảnh: tách chỉ dẫn thành dòng hành động, lưu lại không mất chữ', () => {
    const doc = scriptToDoc(
      [
        scene([
          {
            speakerLabel: 'Akira',
            dialogueText: 'Chuẩn bị đi!',
            stageDirection: 'Akira nhìn xuống đoàn xe',
            panelId: PANEL_1,
          },
        ]),
      ],
      [page],
      panels,
    );
    const shape = (doc.content ?? []).map((n) => [n.attrs?.el, n.content?.[0]?.text ?? '']);
    expect(shape).toEqual([
      ['page', ''],
      ['panel', 'Toàn cảnh mái nhà'],
      ['action', 'Akira nhìn xuống đoàn xe'],
      ['character', 'AKIRA:'],
      ['dialogue', 'Chuẩn bị đi!'],
      ['panel', ''],
    ]);

    const saved = docToScript(toNode(doc), 'scene-1').lines;
    expect(saved.map((l) => [l.kind, l.text])).toEqual([
      [ScriptLineKind.Action, 'Akira nhìn xuống đoàn xe'],
      [ScriptLineKind.Dialogue, 'Chuẩn bị đi!'],
    ]);
    // Dòng thoại giữ id cũ; dòng chỉ dẫn tách ra nhận id mới
    expect(saved[1].scriptLineId).toBe('l0');
    expect(saved[0].scriptLineId).not.toBe('l0');
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

  it('docToScriptTree dựng toàn bộ cây Trang -> Panel (direction + castRevisions) -> Dòng (refs)', () => {
    const lineWithMark = (
      el: string,
      text: string,
      refId: string | null = null,
      castRevisions?: { entryId: string; revisionId: string }[] | null,
      refMarks?: Array<{ entryId: string; surfaceText: string }>,
    ): JSONContent => ({
      type: 'scriptLine',
      attrs: {
        el,
        refId,
        ...(castRevisions ? { castRevisions } : {}),
      },
      ...(text
        ? {
            content:
              refMarks && refMarks.length > 0
                ? [
                    {
                      type: 'text',
                      text,
                      marks: refMarks.map((m) => ({
                        type: 'bibleRef',
                        attrs: {
                          entryId: m.entryId,
                          surfaceText: m.surfaceText,
                        },
                      })),
                    },
                  ]
                : [{ type: 'text', text }],
          }
        : {}),
    });

    const expectedRevisionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const entryId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const revisionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const lineId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    const node = toNode({
      type: 'doc',
      content: [
        lineWithMark('page', '', PAGE_ID),
        lineWithMark('panel', 'Toàn cảnh thành phố Neo Tokyo', PANEL_1, [{ entryId, revisionId }]),
        lineWithMark('action', 'Akira nhìn xuống', lineId, null, [
          { entryId, surfaceText: 'Akira' },
        ]),
        lineWithMark('character', 'AKIRA'),
        lineWithMark('parens', 'nói khẽ'),
        lineWithMark('dialogue', 'Chúng ta phải đi thôi'),
        lineWithMark('page', ''),
        lineWithMark('panel', 'Cận cảnh gương mặt', PANEL_2),
        lineWithMark('character', 'MIA'),
        lineWithMark('parens', 'nghĩ'),
        lineWithMark('dialogue', 'Hắn đang giấu điều gì đó'),
        lineWithMark('caption', 'Đêm dần tàn'),
        lineWithMark('sfx', 'TIẾNG SẤM'),
      ],
    });

    const tree = docToScriptTree(node, expectedRevisionId);

    expect(tree.expectedRevisionId).toBe(expectedRevisionId);
    expect(tree.pages).toHaveLength(2);

    // Page 1
    const p1 = tree.pages![0];
    expect(p1.id).toBe(PAGE_ID);
    expect(p1.number).toBe(1);
    expect(p1.panels).toHaveLength(1);

    const pan1 = p1.panels![0];
    expect(pan1.id).toBe(PANEL_1);
    expect(pan1.number).toBe(1);
    expect(pan1.direction).toBe('Toàn cảnh thành phố Neo Tokyo');
    expect(pan1.castRevisions).toEqual([{ entryId, revisionId }]);
    expect(pan1.lines).toHaveLength(2);

    expect(pan1.lines![0]).toEqual({
      id: lineId,
      kind: ScriptLineKind.Action,
      speakerLabel: null,
      text: 'Akira nhìn xuống',
      refs: [{ bibleEntryId: entryId, surfaceText: 'Akira', newDraft: null }],
    });

    expect(pan1.lines![1]).toEqual({
      id: null,
      kind: ScriptLineKind.Dialogue,
      speakerLabel: 'AKIRA (NÓI KHẼ)',
      text: 'Chúng ta phải đi thôi',
      refs: null,
    });

    // Page 2
    const p2 = tree.pages![1];
    expect(p2.id).toBeNull();
    expect(p2.number).toBe(2);
    expect(p2.panels).toHaveLength(1);

    const pan2 = p2.panels![0];
    expect(pan2.id).toBe(PANEL_2);
    expect(pan2.number).toBe(1);
    expect(pan2.direction).toBe('Cận cảnh gương mặt');
    expect(pan2.lines).toHaveLength(3);

    expect(pan2.lines![0]).toEqual({
      id: null,
      kind: ScriptLineKind.Thought,
      speakerLabel: 'MIA',
      text: 'Hắn đang giấu điều gì đó',
      refs: null,
    });
    expect(pan2.lines![1]).toEqual({
      id: null,
      kind: ScriptLineKind.Narration,
      speakerLabel: null,
      text: 'Đêm dần tàn',
      refs: null,
    });
    expect(pan2.lines![2]).toEqual({
      id: null,
      kind: ScriptLineKind.Sfx,
      speakerLabel: null,
      text: 'TIẾNG SẤM',
      refs: null,
    });
  });

  it('scriptToDoc giữ page.id và docToScriptTree khớp quy tắc BE: tách trùng line.id, bỏ refs trên Dialogue, phân biệt castRevisions [] và null', () => {
    const entryId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const revisionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const lineId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    // 1. Round-trip scriptToDoc -> docToScriptTree giữ page.id, panel.id, direction, line.id
    const roundTripDoc = scriptToDoc(
      [scene([{ id: lineId, kind: ScriptLineKind.Action, text: 'Mở màn', panelId: PANEL_1 }])],
      [page],
      [panels[0]],
    );
    const roundTripTree = docToScriptTree(toNode(roundTripDoc), 'rev-1');
    expect(roundTripTree.pages?.[0].id).toBe(PAGE_ID);
    expect(roundTripTree.pages?.[0].panels?.[0].id).toBe(PANEL_1);
    expect(roundTripTree.pages?.[0].panels?.[0].direction).toBe('Toàn cảnh mái nhà');
    expect(roundTripTree.pages?.[0].panels?.[0].lines?.[0].id).toBe(lineId);

    // 2. Trùng lineId (copy/paste), bibleRef lỡ dính trên dialogue, castRevisions [] (gỡ hết) vs null (giữ nguyên)
    const node = toNode({
      type: 'doc',
      content: [
        { type: 'scriptLine', attrs: { el: 'page', refId: PAGE_ID } },
        { type: 'scriptLine', attrs: { el: 'panel', refId: PANEL_1, castRevisions: [] } },
        {
          type: 'scriptLine',
          attrs: { el: 'action', refId: lineId },
          content: [{ type: 'text', text: 'Dòng gốc' }],
        },
        {
          type: 'scriptLine',
          attrs: { el: 'action', refId: lineId },
          content: [{ type: 'text', text: 'Dòng dán lại bị trùng id' }],
        },
        {
          type: 'scriptLine',
          attrs: { el: 'character', refId: null },
          content: [{ type: 'text', text: 'KAI:' }],
        },
        {
          type: 'scriptLine',
          attrs: { el: 'dialogue', refId: null },
          content: [
            {
              type: 'text',
              text: 'Chào',
              marks: [{ type: 'bibleRef', attrs: { entryId, surfaceText: 'Chào' } }],
            },
          ],
        },
        {
          type: 'scriptLine',
          attrs: { el: 'panel', refId: PANEL_2, castRevisions: [{ entryId, revisionId }] },
        },
        { type: 'scriptLine', attrs: { el: 'panel', refId: null } },
      ],
    });

    const tree = docToScriptTree(node, null);
    const p1Panels = tree.pages![0].panels!;

    // Panel 1: castRevisions: [] được giữ nguyên để BE gỡ biến thể của panel
    expect(p1Panels[0].castRevisions).toEqual([]);
    // Dòng trùng lineId: dòng đầu giữ GUID, dòng thứ 2 đổi thành null
    expect(p1Panels[0].lines![0].id).toBe(lineId);
    expect(p1Panels[0].lines![1].id).toBeNull();
    // Dialogue luôn refs: null để BE không báo 400
    expect(p1Panels[0].lines![2].kind).toBe(ScriptLineKind.Dialogue);
    expect(p1Panels[0].lines![2].refs).toBeNull();
    // Panel 2: có castRevisions hợp lệ
    expect(p1Panels[1].castRevisions).toEqual([{ entryId, revisionId }]);
    // Panel 3: không đụng tới castRevisions -> không gửi field (BE hiểu là null = giữ nguyên)
    expect('castRevisions' in p1Panels[2]).toBe(false);
  });

  it('giữ nguyên castRevisions neo đúng theo từng Panel ID khi chèn hoặc xoá Panel ở giữa trang', () => {
    const entryA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const revA1 = '11111111-1111-4111-8111-111111111111';
    const entryB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const revB2 = '22222222-2222-4222-8222-222222222222';
    const PANEL_3 = '33333333-3333-4333-8333-333333333333';

    // Kịch bản chèn 1 Panel mới (refId: null) vào giữa Panel 1 và Panel 3, và xoá Panel 2 cũ khỏi trang
    const docAfterMidInsertAndDelete = toNode({
      type: 'doc',
      content: [
        { type: 'scriptLine', attrs: { el: 'page', refId: PAGE_ID } },
        {
          type: 'scriptLine',
          attrs: {
            el: 'panel',
            refId: PANEL_1,
            castRevisions: [{ entryId: entryA, revisionId: revA1 }],
          },
        },
        {
          type: 'scriptLine',
          attrs: { el: 'action', refId: null },
          content: [{ type: 'text', text: 'Khung 1 giữ nguyên' }],
        },
        {
          type: 'scriptLine',
          attrs: { el: 'panel', refId: null },
        },
        {
          type: 'scriptLine',
          attrs: { el: 'action', refId: null },
          content: [{ type: 'text', text: 'Khung mới chèn giữa trang' }],
        },
        {
          type: 'scriptLine',
          attrs: {
            el: 'panel',
            refId: PANEL_3,
            castRevisions: [{ entryId: entryB, revisionId: revB2 }],
          },
        },
        {
          type: 'scriptLine',
          attrs: { el: 'action', refId: null },
          content: [{ type: 'text', text: 'Khung 3 cũ nay mang số thứ tự 3' }],
        },
      ],
    });

    const tree = docToScriptTree(docAfterMidInsertAndDelete, null);
    const outPanels = tree.pages![0].panels!;

    expect(outPanels).toHaveLength(3);
    expect(outPanels[0].id).toBe(PANEL_1);
    expect(outPanels[0].castRevisions).toEqual([{ entryId: entryA, revisionId: revA1 }]);

    expect(outPanels[1].id).toBeNull();
    expect(outPanels[1].lines?.[0].text).toBe('Khung mới chèn giữa trang');
    expect('castRevisions' in outPanels[1]).toBe(false);

    expect(outPanels[2].id).toBe(PANEL_3);
    expect(outPanels[2].lines?.[0].text).toBe('Khung 3 cũ nay mang số thứ tự 3');
    expect(outPanels[2].castRevisions).toEqual([{ entryId: entryB, revisionId: revB2 }]);
  });
});

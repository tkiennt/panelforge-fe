import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import { BibleRefMark, ScriptDocument, ScriptLineBlockNode } from './nodes/ScriptLineBlockNode';
import { docToScriptTree } from './scriptFlowAdapter';

describe('scriptFlowAdapter Bible draft payload', () => {
  it('serializes the backend enum category name', () => {
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
      content: {
        type: 'doc',
        content: [
          { type: 'scriptLine', attrs: { el: 'page', refId: null } },
          { type: 'scriptLine', attrs: { el: 'panel', refId: null } },
          {
            type: 'scriptLine',
            attrs: { el: 'action', refId: null },
            content: [
              {
                type: 'text',
                text: 'Thanh kiếm',
                marks: [
                  {
                    type: 'bibleRef',
                    attrs: {
                      entryId: null,
                      surfaceText: 'Thanh kiếm',
                      newDraft: { name: 'Thanh kiếm', category: 'Prop' },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(docToScriptTree(editor.state.doc).pages?.[0].panels?.[0].lines?.[0].refs).toEqual([
      {
        surfaceText: 'Thanh kiếm',
        bibleEntryId: null,
        newDraft: { name: 'Thanh kiếm', category: 'Prop' },
      },
    ]);
    editor.destroy();
  });
});

// src/roles/writer/components/script/flow/comic-editor/extensions/ComicKeymapExtension.ts
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { getNextPageNumber, getNextPanelNumber, extractPageNumber, extractPanelNumber } from '../comicCounting';

export interface ComicKeymapOptions {
  onBlockTransformed?: (type: string, detail?: string) => void;
}

export const ComicKeymapExtension = Extension.create<ComicKeymapOptions>({
  name: 'comicKeymap',
  priority: 1000,

  addOptions() {
    return {
      onBlockTransformed: undefined,
    };
  },

  addKeyboardShortcuts() {
    return {
      // 0. SPACE TRIGGER: # / ! + Space -> Trang, - / " + Space -> Panel
      Space: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);

        const textBefore = parentNode.textBetween(0, $from.parentOffset, '\n', '\0').trim();

        // 0.1 # / ! + Space -> pageBlock (Look-behind counting)
        const isPageSpace =
          textBefore === '#' ||
          textBefore === '!' ||
          /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(textBefore);

        if (isPageSpace) {
          const explicitNum = extractPageNumber(textBefore) ?? undefined;
          const nextPage = getNextPageNumber(state.doc, from, explicitNum);
          const pageNum = String(nextPage).padStart(2, '0');
          const defaultLabel = `Trang ${pageNum}`;

          const pageNode = state.schema.nodes.pageBlock.create(
            { pageNumber: pageNum, label: defaultLabel },
            state.schema.text(`${defaultLabel} `)
          );

          const tr = state.tr.replaceWith(from, to, pageNode);
          const textPos = from + 1 + defaultLabel.length + 1;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          editor.view.dispatch(tr);

          this.options.onBlockTransformed?.('pageBlock', defaultLabel);
          return true;
        }

        // 0.2 - / " + Space -> panelBlock (Look-behind counting per page)
        const isPanelSpace =
          textBefore === '-' ||
          textBefore === '"' ||
          textBefore === '”' ||
          /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore);

        if (isPanelSpace) {
          const explicit = extractPanelNumber(textBefore) ?? undefined;
          const { pageNum, panelNum } = getNextPanelNumber(state.doc, from, explicit);
          const defaultText = `" Panel ${pageNum}.${panelNum}: `;

          const panelNode = state.schema.nodes.panelBlock.create(
            { panelNumber: `${pageNum}.${panelNum}`, cameraAngle: 'Toàn cảnh' },
            state.schema.text(defaultText)
          );

          const tr = state.tr.replaceWith(from, to, panelNode);
          const textPos = from + 1 + defaultText.length;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          editor.view.dispatch(tr);

          this.options.onBlockTransformed?.('panelBlock', `${pageNum}.${panelNum}`);
          return true;
        }

        return false;
      },

      // 1. PAGE TRIGGER (# / ! + Tab) & PANEL TRIGGER (- / " + Tab)
      Tab: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);

        const textBefore = parentNode.textBetween(0, $from.parentOffset, '\n', '\0').trim();
        const fullLineText = parentNode.textContent.trim();

        // 1.1 Kiểm tra Page Trigger (# / ! + Tab)
        const isPageTrigger =
          textBefore === '#' ||
          textBefore === '!' ||
          fullLineText === '#' ||
          fullLineText === '!' ||
          /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(textBefore) ||
          /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(fullLineText);

        if (isPageTrigger) {
          const explicitNum = extractPageNumber(fullLineText || textBefore) ?? undefined;
          const nextPage = getNextPageNumber(state.doc, from, explicitNum);
          const pageNum = String(nextPage).padStart(2, '0');
          const defaultLabel = `Trang ${pageNum}`;

          const pageNode = state.schema.nodes.pageBlock.create(
            { pageNumber: pageNum, label: defaultLabel },
            state.schema.text(defaultLabel)
          );

          const tr = state.tr.replaceWith(from, to, pageNode);
          const textPos = from + 1 + defaultLabel.length;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          editor.view.dispatch(tr);

          this.options.onBlockTransformed?.('pageBlock', defaultLabel);
          return true;
        }

        // 1.2 Kiểm tra Panel Trigger (- / " + Tab)
        const isPanelTrigger =
          textBefore === '-' ||
          textBefore === '"' ||
          textBefore === '”' ||
          fullLineText === '-' ||
          fullLineText === '"' ||
          fullLineText === '”' ||
          /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore) ||
          /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(fullLineText);

        if (isPanelTrigger) {
          const explicit = extractPanelNumber(fullLineText || textBefore) ?? undefined;
          const { pageNum, panelNum } = getNextPanelNumber(state.doc, from, explicit);
          const defaultText = `" Panel ${pageNum}.${panelNum}: `;

          const panelNode = state.schema.nodes.panelBlock.create(
            { panelNumber: `${pageNum}.${panelNum}`, cameraAngle: 'Toàn cảnh' },
            state.schema.text(defaultText)
          );

          const tr = state.tr.replaceWith(from, to, panelNode);
          const textPos = from + 1 + defaultText.length;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          editor.view.dispatch(tr);

          this.options.onBlockTransformed?.('panelBlock', `${pageNum}.${panelNum}`);
          return true;
        }

        return false;
      },

      // 2. LINE COMPLETION ON ENTER (Incremental O(1) Parsing & Strict Quote Matching)
      Enter: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);
        const lineText = parentNode.textContent.trim();

        // 2.1 Nếu đang ở một paragraph thông thường:
        if (parentNode.type.name === 'paragraph') {
          // Bắt buộc có CẢ @Character: VÀ cặp dấu ngoặc kép "..."
          const strictDialogueMatch = lineText.match(/^@([\w\p{L}_-]+)\s*:\s*["“]([^"”]*?)["”]$/u);
          if (strictDialogueMatch) {
            const character = strictDialogueMatch[1].trim();
            const dialogueText = strictDialogueMatch[2].trim();

            const dialogueNode = state.schema.nodes.dialogueBlock.create(
              { character },
              dialogueText ? state.schema.text(dialogueText) : undefined
            );
            // Sau khi tạo dialogueBlock, chèn một paragraph bình thường bên dưới cho phép viết tự do
            const emptyParagraph = state.schema.nodes.paragraph.create();

            const tr = state.tr.replaceWith(from, to, [dialogueNode, emptyParagraph]);
            const nextCursorPos = from + dialogueNode.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, nextCursorPos));
            editor.view.dispatch(tr);

            this.options.onBlockTransformed?.('dialogueBlock', `@${character}`);
            return true;
          }

          // SFX: SFX: ... hoặc * TIẾNG ĐỘNG *
          const sfxMatch = lineText.match(/^(?:SFX:|\*)\s*(.*)/i);
          if (sfxMatch) {
            const rawSfx = sfxMatch[1].replace(/\*$/, '').trim();
            const sfxText = rawSfx || 'TIẾNG ĐỘNG';

            const sfxNode = state.schema.nodes.sfxBlock.create(
              {},
              sfxText ? state.schema.text(sfxText) : undefined
            );
            const emptyParagraph = state.schema.nodes.paragraph.create();

            const tr = state.tr.replaceWith(from, to, [sfxNode, emptyParagraph]);
            const nextCursorPos = from + sfxNode.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, nextCursorPos));
            editor.view.dispatch(tr);

            this.options.onBlockTransformed?.('sfxBlock', sfxText);
            return true;
          }

          // Caption: Lời dẫn truyện: ... hoặc Caption: ...
          const captionMatch = lineText.match(/^(?:Lời dẫn truyện|Caption|Dẫn chuyện):\s*(.*)/i);
          if (captionMatch) {
            const captionText = captionMatch[1].trim();

            const captionNode = state.schema.nodes.captionBlock.create(
              {},
              captionText ? state.schema.text(captionText) : undefined
            );
            const emptyParagraph = state.schema.nodes.paragraph.create();

            const tr = state.tr.replaceWith(from, to, [captionNode, emptyParagraph]);
            const nextCursorPos = from + captionNode.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, nextCursorPos));
            editor.view.dispatch(tr);

            this.options.onBlockTransformed?.('captionBlock', captionText);
            return true;
          }

          // Nếu không khớp cú pháp nào (ví dụ: "@Minh walks away" hay gõ số tự do), để Tiptap xử lý splitBlock tiêu chuẩn
          return false;
        }

        // 2.2 KHI NHẤN ENTER TRÊN PANEL HOẶC PAGE (HOẶC DIALOGUE / SFX / CAPTION):
        // BẮT BUỘC chèn một paragraph bình thường rỗng trực tiếp bên dưới.
        // TUYỆT ĐỐI KHÔNG tự động chuyển thành dialogue / character.
        const isCustomBlock = [
          'pageBlock',
          'panelBlock',
          'dialogueBlock',
          'sfxBlock',
          'captionBlock',
        ].includes(parentNode.type.name);

        if (isCustomBlock) {
          const emptyParagraph = state.schema.nodes.paragraph.create();
          const tr = state.tr.insert(to, emptyParagraph);
          tr.setSelection(TextSelection.create(tr.doc, to + 1));
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },

      // 3. GRACEFUL BACKSPACE (Undo Formatting Without Content Loss)
      Backspace: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parentOffset !== 0 || !selection.empty) {
          return false;
        }

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);
        const currentContent = parentNode.textContent;

        // 3.1 pageBlock -> Không thể xóa tiêu đề trang đầu tiên, cho phép xóa Page 2, 3...
        if (parentNode.type.name === 'pageBlock') {
          let isFirstPage = true;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'pageBlock') {
              if (pos < from) {
                isFirstPage = false;
                return false;
              }
            }
          });

          if (isFirstPage) {
            return true; // Không thể xóa tiêu đề trang bằng backspace
          }

          const tr = state.tr.delete(from, to);
          const prevPos = Math.max(0, from - 1);
          tr.setSelection(TextSelection.create(tr.doc, Math.min(prevPos, tr.doc.content.size)));
          editor.view.dispatch(tr);
          return true;
        }

        // 3.2 panelBlock -> Cho phép xóa Panel bằng Backspace
        if (parentNode.type.name === 'panelBlock') {
          const tr = state.tr.delete(from, to);
          const prevPos = Math.max(0, from - 1);
          tr.setSelection(TextSelection.create(tr.doc, Math.min(prevPos, tr.doc.content.size)));
          editor.view.dispatch(tr);
          return true;
        }

        // 3.3 dialogueBlock -> paragraph với "@Character: \"...\""
        if (parentNode.type.name === 'dialogueBlock') {
          const character = parentNode.attrs.character || 'Character';
          const restoredText = currentContent
            ? `@${character}: "${currentContent}"`
            : `@${character}: ""`;
          const newParagraph = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(restoredText)
          );

          const tr = state.tr.replaceWith(from, to, newParagraph);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        // 3.4 sfxBlock -> paragraph với "* Tiếng động *"
        if (parentNode.type.name === 'sfxBlock') {
          const restoredText = `* ${currentContent || 'SFX'} *`;
          const newParagraph = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(restoredText)
          );

          const tr = state.tr.replaceWith(from, to, newParagraph);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        // 3.5 captionBlock -> paragraph với "Caption: ..."
        if (parentNode.type.name === 'captionBlock') {
          const restoredText = `Caption: ${currentContent}`;
          const newParagraph = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(restoredText)
          );

          const tr = state.tr.replaceWith(from, to, newParagraph);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});

import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { getNextPageNumber, getNextPanelNumber } from '../comicCounting';

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
      // 0. SPACE TRIGGER: # + Space -> Trang, - + Space -> Panel
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

        // 0.1 # + Space -> pageBlock (Look-behind counting)
        if (textBefore === '#' || /^#\s*(?:Page\s*\d*)?$/i.test(textBefore)) {
          const numMatch = textBefore.match(/\d+/);
          const explicitNum = numMatch ? parseInt(numMatch[0], 10) : undefined;
          const nextPage = getNextPageNumber(state.doc, from, explicitNum);
          const pageNum = String(nextPage).padStart(2, '0');
          const defaultLabel = `TRANG ${pageNum}`;

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

        // 0.2 - + Space -> panelBlock (Look-behind counting per page)
        if (textBefore === '-' || /^-\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore)) {
          const panelMatch = textBefore.match(/(\d+)(?:\.(\d+))?/);
          let explicit: { pageNum?: number; panelNum?: number } | undefined = undefined;
          if (panelMatch && panelMatch[1] && panelMatch[2]) {
            explicit = { pageNum: parseInt(panelMatch[1], 10), panelNum: parseInt(panelMatch[2], 10) };
          } else if (panelMatch && panelMatch[1]) {
            explicit = { panelNum: parseInt(panelMatch[1], 10) };
          }

          const { pageNum, panelNum } = getNextPanelNumber(state.doc, from, explicit);
          const defaultText = `Panel ${pageNum}.${panelNum}: `;

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

      // 1. PAGE TRIGGER (# + Tab) & PANEL TRIGGER (- + Tab)
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

        // 1.1 Kiểm tra Page Trigger (# + Tab)
        const isPageTrigger =
          textBefore === '#' ||
          fullLineText === '#' ||
          /^#\s*(?:Page\s*\d*)?$/i.test(textBefore) ||
          /^#\s*(?:Page\s*\d*)?$/i.test(fullLineText);

        if (isPageTrigger) {
          const numMatch = (fullLineText || textBefore).match(/\d+/);
          const explicitNum = numMatch ? parseInt(numMatch[0], 10) : undefined;
          const nextPage = getNextPageNumber(state.doc, from, explicitNum);
          const pageNum = String(nextPage).padStart(2, '0');
          const defaultLabel = `TRANG ${pageNum}`;

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

        // 1.2 Kiểm tra Panel Trigger (- + Tab)
        const isPanelTrigger =
          textBefore === '-' ||
          fullLineText === '-' ||
          /^-\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore) ||
          /^-\s*(?:Panel\s*[\d.]*)?$/i.test(fullLineText);

        if (isPanelTrigger) {
          const panelMatch = (fullLineText || textBefore).match(/(\d+)(?:\.(\d+))?/);
          let explicit: { pageNum?: number; panelNum?: number } | undefined = undefined;
          if (panelMatch && panelMatch[1] && panelMatch[2]) {
            explicit = { pageNum: parseInt(panelMatch[1], 10), panelNum: parseInt(panelMatch[2], 10) };
          } else if (panelMatch && panelMatch[1]) {
            explicit = { panelNum: parseInt(panelMatch[1], 10) };
          }

          const { pageNum, panelNum } = getNextPanelNumber(state.doc, from, explicit);
          const defaultText = `Panel ${pageNum}.${panelNum}: `;

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
            // Sau khi tạo dialogueBlock, chèn một paragraph bình thường bên dưới
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

          // Nếu không khớp cú pháp nào (ví dụ: "@Minh walks away" hay hành động), để Tiptap xử lý splitBlock tiêu chuẩn
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
        const textContent = parentNode.textContent;

        if (parentNode.type.name === 'pageBlock') {
          const fallback = textContent.startsWith('#')
            ? textContent
            : `# ${textContent}`.trim();

          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            fallback ? state.schema.text(fallback) : undefined
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        if (parentNode.type.name === 'panelBlock') {
          const fallback = textContent.startsWith('-')
            ? textContent
            : `- ${textContent}`.trim();

          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            fallback ? state.schema.text(fallback) : undefined
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        if (parentNode.type.name === 'dialogueBlock') {
          const character = parentNode.attrs.character || 'Nhân vật';
          const raw = `@${character}: "${textContent}"`;

          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(raw)
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        if (parentNode.type.name === 'sfxBlock') {
          const raw = `SFX: ${textContent}`;
          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(raw)
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        if (parentNode.type.name === 'captionBlock') {
          const raw = `Caption: ${textContent}`;
          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(raw)
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});

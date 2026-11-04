// src/roles/writer/components/script/flow/comic-editor/extensions/ComicKeymapExtension.ts
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export interface ComicKeymapOptions {
  onBlockTransformed?: (type: string, detail?: string) => void;
}

export const ComicKeymapExtension = Extension.create<ComicKeymapOptions>({
  name: 'comicKeymap',

  addOptions() {
    return {
      onBlockTransformed: undefined,
    };
  },

  addKeyboardShortcuts() {
    return {
      // 0. SPACE TRIGGER: # + Space -> Trang, - + Space -> Panel
      Space: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);

        const textBefore = parentNode.textBetween(0, $from.parentOffset, '\n', '\0').trim();

        // 0.1 # + Space -> pageBlock
        if (textBefore === '#' || /^#\s*(Page\s*\d*)?$/i.test(textBefore)) {
          const numMatch = textBefore.match(/\d+/);
          const pageNum = numMatch ? numMatch[0].padStart(2, '0') : '01';
          const defaultLabel = `TRANG ${pageNum}`;

          const pageNode = state.schema.nodes.pageBlock.create(
            { pageNumber: pageNum, label: defaultLabel },
            state.schema.text(`${defaultLabel} `)
          );

          const tr = state.tr.replaceWith(from, to, pageNode);
          const textPos = from + 1 + defaultLabel.length + 1;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          dispatch(tr);

          this.options.onBlockTransformed?.('pageBlock', defaultLabel);
          return true;
        }

        // 0.2 - + Space -> panelBlock
        if (textBefore === '-' || /^-\s*(Panel\s*[\d.]*)?$/i.test(textBefore)) {
          const panelMatch = textBefore.match(/[\d.]+/);
          const panelNum = panelMatch ? panelMatch[0] : '1.1';
          const defaultText = `Panel ${panelNum}: `;

          const panelNode = state.schema.nodes.panelBlock.create(
            { panelNumber: panelNum, cameraAngle: 'Toàn cảnh' },
            state.schema.text(defaultText)
          );

          const tr = state.tr.replaceWith(from, to, panelNode);
          const textPos = from + 1 + defaultText.length;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          dispatch(tr);

          this.options.onBlockTransformed?.('panelBlock', panelNum);
          return true;
        }

        return false;
      },

      // 1. PAGE TRIGGER (# + Tab) & PANEL TRIGGER (- + Tab)
      Tab: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);

        // Lấy đoạn văn bản từ đầu dòng tới vị trí con trỏ
        const textBefore = parentNode.textBetween(0, $from.parentOffset, '\n', '\0').trim();
        const fullLineText = parentNode.textContent.trim();

        // 1.1 Kiểm tra Page Trigger (# + Tab hoặc # Page 1 + Tab)
        const isPageTrigger =
          textBefore === '#' ||
          fullLineText === '#' ||
          /^#\s*(Page\s*\d*)?$/i.test(textBefore) ||
          /^#\s*(Page\s*\d*)?$/i.test(fullLineText);

        if (isPageTrigger) {
          // Trích xuất số trang nếu người dùng đã gõ (ví dụ # Page 2)
          const numMatch = (fullLineText || textBefore).match(/\d+/);
          const pageNum = numMatch ? numMatch[0].padStart(2, '0') : '01';
          const defaultLabel = `TRANG ${pageNum}`;

          // Thay thế node hiện tại bằng pageBlock
          const pageNode = state.schema.nodes.pageBlock.create(
            {
              pageNumber: pageNum,
              label: defaultLabel,
            },
            state.schema.text(defaultLabel)
          );

          const tr = state.tr.replaceWith(from, to, pageNode);
          // Đặt con trỏ vào bên trong nội dung có thể soạn thảo của pageBlock
          const textPos = from + 1 + defaultLabel.length;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          dispatch(tr);

          this.options.onBlockTransformed?.('pageBlock', defaultLabel);
          return true;
        }

        // 1.2 Kiểm tra Panel Trigger (- + Tab hoặc - Panel 1.1 + Tab)
        const isPanelTrigger =
          textBefore === '-' ||
          fullLineText === '-' ||
          /^-\s*(Panel\s*[\d.]*)?$/i.test(textBefore) ||
          /^-\s*(Panel\s*[\d.]*)?$/i.test(fullLineText);

        if (isPanelTrigger) {
          // Trích xuất số panel nếu có (ví dụ - Panel 1.2)
          const panelMatch = (fullLineText || textBefore).match(/[\d.]+/);
          const panelNum = panelMatch ? panelMatch[0] : '1.1';
          const defaultText = `Panel ${panelNum}: `;

          const panelNode = state.schema.nodes.panelBlock.create(
            {
              panelNumber: panelNum,
              cameraAngle: 'Toàn cảnh',
            },
            state.schema.text(defaultText)
          );

          const tr = state.tr.replaceWith(from, to, panelNode);
          const textPos = from + 1 + defaultText.length;
          tr.setSelection(TextSelection.create(tr.doc, textPos));
          dispatch(tr);

          this.options.onBlockTransformed?.('panelBlock', panelNum);
          return true;
        }

        return false;
      },

      // 2. LINE COMPLETION ON ENTER (Incremental O(1) Parsing)
      Enter: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);
        const lineText = parentNode.textContent.trim();

        // Chỉ thực hiện phân tích nếu đang ở một paragraph thông thường
        if (parentNode.type.name === 'paragraph') {
          // 2.1 Character Dialogue: @Character: "Spoken line"
          // Hỗ trợ cả ký tự tiếng Việt có dấu
          const dialogueMatch = lineText.match(
            /^@([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9\s]+):\s*["“]([^"”]*)["”]?$/
          );
          if (dialogueMatch) {
            const character = dialogueMatch[1].trim();
            const dialogueText = dialogueMatch[2].trim();

            const dialogueNode = state.schema.nodes.dialogueBlock.create(
              { character },
              dialogueText ? state.schema.text(dialogueText) : undefined
            );
            const emptyParagraph = state.schema.nodes.paragraph.create();

            const tr = state.tr.replaceWith(from, to, [dialogueNode, emptyParagraph]);
            const nextCursorPos = from + dialogueNode.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, nextCursorPos));
            dispatch(tr);

            this.options.onBlockTransformed?.('dialogueBlock', `@${character}`);
            return true;
          }

          // 2.2 SFX: SFX: ... hoặc * TIẾNG ĐỘNG *
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
            dispatch(tr);

            this.options.onBlockTransformed?.('sfxBlock', sfxText);
            return true;
          }

          // 2.3 Caption: Lời dẫn truyện: ... hoặc Caption: ...
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
            dispatch(tr);

            this.options.onBlockTransformed?.('captionBlock', captionText);
            return true;
          }
        }

        // 2.4 Thoát ra khỏi block đặc biệt (Page, Panel, Dialogue, SFX, Caption) sang dòng mới khi gõ Enter
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
          dispatch(tr);
          return true;
        }

        return false;
      },

      // 3. GRACEFUL BACKSPACE (Undo Formatting Without Content Loss)
      Backspace: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        // Chỉ kích hoạt khi con trỏ ở vị trí 0 của block và không có đoạn chọn nào
        if ($from.parentOffset !== 0 || !selection.empty) {
          return false;
        }

        const parentNode = $from.parent;
        const depth = $from.depth;
        const from = $from.before(depth);
        const to = $from.after(depth);
        const textContent = parentNode.textContent;

        // 3.1 Hoàn nguyên Page Block -> "#" hoặc "# [nội dung]"
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
          dispatch(tr);
          return true;
        }

        // 3.2 Hoàn nguyên Panel Block -> "-" hoặc "- [nội dung]"
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
          dispatch(tr);
          return true;
        }

        // 3.3 Hoàn nguyên Dialogue Block -> '@Character: "..."'
        if (parentNode.type.name === 'dialogueBlock') {
          const character = parentNode.attrs.character || 'Nhân vật';
          const raw = `@${character}: "${textContent}"`;

          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(raw)
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          dispatch(tr);
          return true;
        }

        // 3.4 Hoàn nguyên SFX Block -> "SFX: ..."
        if (parentNode.type.name === 'sfxBlock') {
          const raw = `SFX: ${textContent}`;
          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(raw)
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          dispatch(tr);
          return true;
        }

        // 3.5 Hoàn nguyên Caption Block -> "Caption: ..."
        if (parentNode.type.name === 'captionBlock') {
          const raw = `Caption: ${textContent}`;
          const paragraphNode = state.schema.nodes.paragraph.create(
            {},
            state.schema.text(raw)
          );

          const tr = state.tr.replaceWith(from, to, paragraphNode);
          tr.setSelection(TextSelection.create(tr.doc, from + 1));
          dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});

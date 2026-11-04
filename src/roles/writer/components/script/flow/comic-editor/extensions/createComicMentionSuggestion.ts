// src/roles/writer/components/script/flow/comic-editor/extensions/createComicMentionSuggestion.ts
import { ReactRenderer } from '@tiptap/react';
import { computePosition, offset, flip, shift } from '@floating-ui/react';
import {
  MentionListPopover,
  MentionListPopoverRef,
  BibleMentionItem,
} from './MentionListPopover';

export const DEFAULT_MOCK_BIBLE_ITEMS: BibleMentionItem[] = [
  {
    id: 'char_minh',
    name: 'Minh',
    subtitle: 'Nam chính',
    category: 'Character',
  },
  {
    id: 'char_stranger',
    name: 'Người lạ mặt',
    subtitle: 'Bí ẩn',
    category: 'Character',
  },
  {
    id: 'char_lan',
    name: 'Lan',
    subtitle: 'Bạn cũ',
    category: 'Character',
  },
  {
    id: 'loc_shibuya',
    name: 'Ngã tư Shibuya',
    subtitle: 'Khu thương mại đông đúc',
    category: 'Location',
  },
  {
    id: 'loc_hospital',
    name: 'Bệnh viện Tokyo',
    subtitle: 'Bệnh viện trung tâm',
    category: 'Location',
  },
];

export function createComicMentionSuggestion(
  getItems: () => BibleMentionItem[] = () => DEFAULT_MOCK_BIBLE_ITEMS
) {
  return {
    items: ({ query }: { query: string }): BibleMentionItem[] => {
      const q = (query || '').toLowerCase().trim();
      const all = getItems();
      if (!q) return all.slice(0, 8);

      return all
        .filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q))
        )
        .slice(0, 8);
    },

    render: () => {
      let component: ReactRenderer<MentionListPopoverRef> | null = null;
      let popupContainer: HTMLDivElement | null = null;

      const updatePosition = async (clientRect?: DOMRect | null) => {
        if (!popupContainer || !clientRect) return;

        // Tạo virtual reference element cho Floating UI từ clientRect của cursor
        const virtualEl = {
          getBoundingClientRect: () => clientRect,
        };

        const { x, y } = await computePosition(virtualEl, popupContainer, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        });

        popupContainer.style.left = `${x}px`;
        popupContainer.style.top = `${y}px`;
      };

      return {
        onStart: (props: any) => {
          popupContainer = document.createElement('div');
          popupContainer.className = 'fixed z-[9999] pointer-events-auto';
          document.body.appendChild(popupContainer);

          component = new ReactRenderer(MentionListPopover, {
            props: {
              items: props.items,
              command: props.command,
              editor: props.editor,
            },
            editor: props.editor,
          });

          popupContainer.appendChild(component.element);

          const rect = props.clientRect?.();
          if (rect) {
            void updatePosition(rect);
          }
        },

        onUpdate: (props: any) => {
          component?.updateProps({
            items: props.items,
            command: props.command,
            editor: props.editor,
          });

          const rect = props.clientRect?.();
          if (rect) {
            void updatePosition(rect);
          }
        },

        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popupContainer?.remove();
            popupContainer = null;
            component?.destroy();
            component = null;
            return true;
          }

          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          popupContainer?.remove();
          popupContainer = null;
          component?.destroy();
          component = null;
        },
      };
    },
  };
}

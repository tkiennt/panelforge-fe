// src/roles/writer/components/script/flow/grammar/scriptGrammar.ts
/**
 * SCR-25: Bảng luật gõ kịch bản Graphic Novel dạng hàm thuần (Pure Grammar Rules)
 * Đặc tả SSOT: panelforge-hub/docs/note/plans/01_SCRIPT_PLAN.md - Mục H.1
 *
 * Nguyên tắc thiết kế:
 * - Dữ liệu bảng chuyển trạng thái (Table-driven) là nguồn sự thật duy nhất (SSOT).
 * - Không rải rác các lệnh if-else trong keymap của TipTap/ProseMirror.
 * - Các hàm xử lý hoàn toàn là hàm thuần (pure functions, không side-effects, 100% testable).
 */

/**
 * Enum ScriptLineKind theo đặc tả SCR-04
 */
export enum ScriptLineKind {
  Action = 1,
  Dialogue = 2,
  Thought = 3,
  Narration = 4,
  Sfx = 5,
}

/**
 * Vị trí con trỏ đang đứng trong mô hình kịch bản Graphic Novel (H.1)
 */
export type ScriptFocusLocation =
  | 'page'
  | 'panel'
  | 'action'
  | 'speaker'
  | 'dialogue'
  | 'thought'
  | 'narration'
  | 'sfx';

/**
 * Loại hành vi chuyển đổi
 */
export type GrammarActionType =
  | 'new_block' // Tạo một khối mới phía sau (vd: tạo Panel mới, Action mới, dòng Dialogue mới)
  | 'move_slot' // Chuyển con trỏ sang ô khác trong cùng dòng (vd: speaker -> dialogue text)
  | 'morph_block' // Biến đổi loại của khối hiện tại (vd: Action -> Dialogue, Narration -> Sfx)
  | 'noop'; // Không thực hiện chuyển đổi

export interface GrammarTransition {
  action: GrammarActionType;
  target: ScriptFocusLocation;
  hint: string;
}

/**
 * Bảng dữ liệu chuyển trạng thái khi nhấn phím ENTER (Bảng H.1)
 * Gồm 2 trường hợp: khi dòng có chữ (nonEmpty) và khi dòng trống (empty)
 */
export const H1_ENTER_TABLE: Readonly<
  Record<
    ScriptFocusLocation,
    {
      nonEmpty: GrammarTransition;
      empty: GrammarTransition | null;
    }
  >
> = {
  page: {
    nonEmpty: {
      action: 'new_block',
      target: 'panel',
      hint: 'Tạo Panel mới (số kế tiếp)',
    },
    empty: null,
  },
  panel: {
    nonEmpty: {
      action: 'new_block',
      target: 'action',
      hint: 'Tạo dòng Action mô tả hình ảnh',
    },
    empty: {
      action: 'new_block',
      target: 'action',
      hint: 'Tạo dòng Action mô tả hình ảnh',
    },
  },
  action: {
    nonEmpty: {
      action: 'new_block',
      target: 'action',
      hint: 'Tạo dòng Action mới',
    },
    empty: {
      action: 'new_block',
      target: 'panel',
      hint: 'Tạo Panel mới (số kế tiếp)',
    },
  },
  speaker: {
    nonEmpty: {
      action: 'move_slot',
      target: 'dialogue',
      hint: 'Chuyển sang ô thoại cùng dòng',
    },
    empty: {
      action: 'morph_block',
      target: 'action',
      hint: 'Đổi về Action',
    },
  },
  dialogue: {
    nonEmpty: {
      action: 'new_block',
      target: 'speaker',
      hint: 'Tạo dòng thoại mới, ô người nói gợi ý luân phiên',
    },
    empty: {
      action: 'morph_block',
      target: 'action',
      hint: 'Đổi về Action',
    },
  },
  thought: {
    nonEmpty: {
      action: 'new_block',
      target: 'speaker',
      hint: 'Tạo dòng thoại mới, ô người nói gợi ý luân phiên',
    },
    empty: {
      action: 'morph_block',
      target: 'action',
      hint: 'Đổi về Action',
    },
  },
  narration: {
    nonEmpty: {
      action: 'new_block',
      target: 'narration',
      hint: 'Tạo dòng dẫn truyện mới',
    },
    empty: {
      action: 'morph_block',
      target: 'action',
      hint: 'Đổi về Action',
    },
  },
  sfx: {
    nonEmpty: {
      action: 'new_block',
      target: 'sfx',
      hint: 'Tạo dòng SFX mới',
    },
    empty: {
      action: 'morph_block',
      target: 'action',
      hint: 'Đổi về Action',
    },
  },
};

/**
 * Bảng dữ liệu chuyển trạng thái khi nhấn phím TAB và SHIFT + TAB (Bảng H.1)
 */
export const H1_TAB_TABLE: Readonly<
  Record<
    ScriptFocusLocation,
    {
      forward: GrammarTransition | null;
      backward: GrammarTransition | null;
    }
  >
> = {
  page: {
    forward: null,
    backward: null,
  },
  panel: {
    forward: null,
    backward: null,
  },
  action: {
    forward: {
      action: 'morph_block',
      target: 'speaker',
      hint: 'Chuyển thành ô người nói (Dialogue)',
    },
    backward: null,
  },
  speaker: {
    forward: {
      action: 'move_slot',
      target: 'dialogue',
      hint: 'Chuyển sang ô thoại cùng dòng',
    },
    backward: {
      action: 'morph_block',
      target: 'action',
      hint: 'Đổi về Action',
    },
  },
  dialogue: {
    forward: {
      action: 'morph_block',
      target: 'narration',
      hint: 'Chuyển thành Narration (Dẫn truyện)',
    },
    backward: {
      action: 'move_slot',
      target: 'speaker',
      hint: 'Lùi về ô người nói',
    },
  },
  thought: {
    forward: {
      action: 'morph_block',
      target: 'narration',
      hint: 'Chuyển thành Narration (Dẫn truyện)',
    },
    backward: {
      action: 'move_slot',
      target: 'speaker',
      hint: 'Lùi về ô người nói',
    },
  },
  narration: {
    forward: {
      action: 'morph_block',
      target: 'sfx',
      hint: 'Chuyển thành SFX (Hiệu ứng âm thanh)',
    },
    backward: {
      action: 'morph_block',
      target: 'dialogue',
      hint: 'Chuyển thành Dialogue (Lời thoại)',
    },
  },
  sfx: {
    forward: {
      action: 'morph_block',
      target: 'action',
      hint: 'Chuyển thành Action (Hành động)',
    },
    backward: {
      action: 'morph_block',
      target: 'narration',
      hint: 'Chuyển thành Narration (Dẫn truyện)',
    },
  },
};

/**
 * Cấu trúc các slot (ô nhập liệu con) bên trong từng loại phần tử kịch bản
 */
export type SlotName = 'heading' | 'direction' | 'speaker' | 'text';

export interface ScriptSlotDefinition {
  kind: ScriptFocusLocation;
  slots: SlotName[];
  defaultFocusSlot: SlotName;
  lineKind?: ScriptLineKind;
}

export const SCRIPT_SLOT_DEFINITIONS: Readonly<Record<ScriptFocusLocation, ScriptSlotDefinition>> = {
  page: {
    kind: 'page',
    slots: ['heading'],
    defaultFocusSlot: 'heading',
  },
  panel: {
    kind: 'panel',
    slots: ['heading', 'direction'],
    defaultFocusSlot: 'direction',
  },
  action: {
    kind: 'action',
    slots: ['text'],
    defaultFocusSlot: 'text',
    lineKind: ScriptLineKind.Action,
  },
  speaker: {
    kind: 'speaker',
    slots: ['speaker', 'text'],
    defaultFocusSlot: 'speaker',
    lineKind: ScriptLineKind.Dialogue,
  },
  dialogue: {
    kind: 'dialogue',
    slots: ['speaker', 'text'],
    defaultFocusSlot: 'text',
    lineKind: ScriptLineKind.Dialogue,
  },
  thought: {
    kind: 'thought',
    slots: ['speaker', 'text'],
    defaultFocusSlot: 'text',
    lineKind: ScriptLineKind.Thought,
  },
  narration: {
    kind: 'narration',
    slots: ['text'],
    defaultFocusSlot: 'text',
    lineKind: ScriptLineKind.Narration,
  },
  sfx: {
    kind: 'sfx',
    slots: ['text'],
    defaultFocusSlot: 'text',
    lineKind: ScriptLineKind.Sfx,
  },
};

/**
 * Hàm thuần xác định chuyển trạng thái khi nhấn phím Enter (SCR-25)
 *
 * @param location Vị trí con trỏ hiện tại
 * @param isEmpty Dòng/ô hiện tại có đang trống hay không
 * @returns Transition hành động kế tiếp hoặc null nếu không xử lý
 */
export function nextKindOnEnter(
  location: ScriptFocusLocation,
  isEmpty: boolean,
): GrammarTransition | null {
  const rule = H1_ENTER_TABLE[location];
  if (!rule) return null;
  return isEmpty ? rule.empty : rule.nonEmpty;
}

/**
 * Hàm thuần xác định chuyển trạng thái khi nhấn phím Tab hoặc Shift+Tab (SCR-25)
 *
 * @param location Vị trí con trỏ hiện tại
 * @param dir Hướng chuyển: 'forward' (Tab) hoặc 'backward' (Shift+Tab)
 * @returns Transition hành động kế tiếp hoặc null nếu không có luật chuyển
 */
export function nextKindOnTab(
  location: ScriptFocusLocation,
  dir: 'forward' | 'backward',
): GrammarTransition | null {
  const rule = H1_TAB_TABLE[location];
  if (!rule) return null;
  return dir === 'forward' ? rule.forward : rule.backward;
}

/**
 * Lấy định nghĩa slot (các ô nhập liệu con) của một loại phần tử (SCR-25)
 *
 * @param kind Loại phần tử kịch bản
 * @returns Định nghĩa slot tương ứng
 */
export function slotOf(kind: ScriptFocusLocation | ScriptLineKind): ScriptSlotDefinition {
  if (typeof kind === 'number') {
    switch (kind) {
      case ScriptLineKind.Action:
        return SCRIPT_SLOT_DEFINITIONS.action;
      case ScriptLineKind.Dialogue:
        return SCRIPT_SLOT_DEFINITIONS.dialogue;
      case ScriptLineKind.Thought:
        return SCRIPT_SLOT_DEFINITIONS.thought;
      case ScriptLineKind.Narration:
        return SCRIPT_SLOT_DEFINITIONS.narration;
      case ScriptLineKind.Sfx:
        return SCRIPT_SLOT_DEFINITIONS.sfx;
      default:
        return SCRIPT_SLOT_DEFINITIONS.action;
    }
  }
  return SCRIPT_SLOT_DEFINITIONS[kind] || SCRIPT_SLOT_DEFINITIONS.action;
}

/**
 * Danh mục phím tắt cố định theo đặc tả H.1
 */
export const H1_SHORTCUTS = {
  NEW_PANEL: 'Ctrl+Enter',
  NEW_PAGE: 'Ctrl+Shift+Enter',
  KIND_ACTION: 'Ctrl+1',
  KIND_DIALOGUE: 'Ctrl+2',
  KIND_THOUGHT: 'Ctrl+3',
  KIND_NARRATION: 'Ctrl+4',
  KIND_SFX: 'Ctrl+5',
  SLASH_MENU: '/',
  MOVE_LINE_UP: 'Alt+ArrowUp',
  MOVE_LINE_DOWN: 'Alt+ArrowDown',
  BIBLE_MENTION: '@',
} as const;

/**
 * Ánh xạ phím tắt Ctrl+1..5 sang loại dòng ScriptLineKind
 */
export function getKindFromNumberShortcut(keyNum: number): ScriptLineKind | null {
  switch (keyNum) {
    case 1:
      return ScriptLineKind.Action;
    case 2:
      return ScriptLineKind.Dialogue;
    case 3:
      return ScriptLineKind.Thought;
    case 4:
      return ScriptLineKind.Narration;
    case 5:
      return ScriptLineKind.Sfx;
    default:
      return null;
  }
}

// src/roles/writer/components/script/flow/writesolo/sampleScript.ts
import { BibleEntryDto } from '@/services/bible.service';

/**
 * Kịch bản mẫu chuẩn WriteSolo Screenplay & Graphic Novel
 * Thể hiện chính xác 4 thành phần cốt lõi: Scene Heading, Action, Character, Dialogue, Parenthetical
 */
export const INITIAL_WRITESOLO_DOC = {
  type: 'doc',
  content: [
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'scene_heading',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: "INT. NANCY'S LIVING ROOM - NIGHT",
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'action',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: "Nancy is alone in her spacious living room, bundled under multiple blankets. A HOWLING STORM rages outside.",
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'action',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: "Nancy takes a sip from a mug and looks towards the window. It's pouring buckets.",
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'action',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: "Suddenly, the door FLIES OPEN as FRED enters, completely soaked. Nancy gasps.",
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'character',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: 'FRED',
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'dialogue',
        pageNumber: 1,
        panelNumber: 1,
        speakerName: 'FRED',
      },
      content: [
        {
          type: 'text',
          text: "I'm home.",
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'character',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: 'NANCY',
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'parenthetical',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: '(lying poorly)',
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'dialogue',
        pageNumber: 1,
        panelNumber: 1,
        speakerName: 'NANCY',
      },
      content: [
        {
          type: 'text',
          text: 'I just remembered! I have to make 50 crêpes for my family.',
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'transition',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: 'CUT TO:',
        },
      ],
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'page_heading',
        pageNumber: 1,
        panelNumber: 1,
      },
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'panel_heading',
        pageNumber: 1,
        panelNumber: 1,
        shotType: '[Toàn cảnh]',
      },
    },
    {
      type: 'writeSoloBlock',
      attrs: {
        blockType: 'action',
        pageNumber: 1,
        panelNumber: 1,
      },
      content: [
        {
          type: 'text',
          text: 'Akira đứng nhìn qua cửa sổ tầng 4 của khu phố Neo-Shinjuku trong mưa.',
        },
      ],
    },
  ],
};

/**
 * Series Bible mẫu chứa Nancy, Fred, Akira, Neo-Shinjuku
 */
export const SAMPLE_BIBLE_ENTRIES: BibleEntryDto[] = [
  {
    id: 'char-nancy',
    name: 'Nancy',
    code: 'CHR_NANCY',
    category: 'Character',
    subtitle: 'Nữ chính trong kịch bản',
    description: 'Thường ấm áp nhưng vụng về khi nói dối.',
    effectiveRevision: {
      stageName: 'Canon V1',
      reviewStatus: 'CanonLocked',
      summary: 'Trang phục mùa đông',
    } as any,
  },
  {
    id: 'char-fred',
    name: 'Fred',
    code: 'CHR_FRED',
    category: 'Character',
    subtitle: 'Người bạn đồng hành',
    description: 'Nhiệt tình, đôi mắt cún con.',
    effectiveRevision: {
      stageName: 'Canon V1',
      reviewStatus: 'CanonLocked',
      summary: 'Áo khoác ướt sũng',
    } as any,
  },
  {
    id: 'char-akira',
    name: 'Akira',
    code: 'CHR_AKIRA',
    category: 'Character',
    subtitle: 'Chiến binh kháng chiến Neo-Shinjuku',
    description: 'Nhân vật chính, thành thạo công nghệ và kiếm thuật.',
    effectiveRevision: {
      stageName: 'GĐ 1: Khởi nguồn • Ch. 1–14',
      reviewStatus: 'CanonLocked',
      summary: 'Phiên bản áo khoác xanh cổ cao',
    } as any,
  },
  {
    id: 'loc-neo-shinjuku',
    name: 'Neo-Shinjuku',
    code: 'LOC_NEO_SHINJUKU',
    category: 'Location',
    subtitle: 'Đô thị cyberpunk tầng thấp',
    description: 'Thành phố ngập trong ánh đèn neon và mưa axít.',
    effectiveRevision: {
      stageName: 'Canon Toàn cảnh',
      reviewStatus: 'CanonLocked',
      summary: 'Khu vực quận 4',
    } as any,
  },
] as unknown as BibleEntryDto[];

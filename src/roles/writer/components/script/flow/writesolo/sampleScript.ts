// src/roles/writer/components/script/flow/writesolo/sampleScript.ts
import { BibleEntryDto } from '@/services/bible.service';
import { translate } from '@/lib/i18n';

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
          text: 'Nancy is alone in her spacious living room, bundled under multiple blankets. A HOWLING STORM rages outside.',
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
          text: 'Suddenly, the door FLIES OPEN as FRED enters, completely soaked. Nancy gasps.',
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
        shotType: translate('writer.writeSolo.wideShot'),
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
          text: translate('writer.writeSolo.sample.akiraAction'),
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
    subtitle: translate('writer.writeSolo.sample.nancySubtitle'),
    description: translate('writer.writeSolo.sample.nancyDesc'),
    effectiveRevision: {
      stageName: 'Canon V1',
      reviewStatus: 'CanonLocked',
      summary: translate('writer.writeSolo.sample.nancySummary'),
    } as any,
  },
  {
    id: 'char-fred',
    name: 'Fred',
    code: 'CHR_FRED',
    category: 'Character',
    subtitle: translate('writer.writeSolo.sample.fredSubtitle'),
    description: translate('writer.writeSolo.sample.fredDesc'),
    effectiveRevision: {
      stageName: 'Canon V1',
      reviewStatus: 'CanonLocked',
      summary: translate('writer.writeSolo.sample.fredSummary'),
    } as any,
  },
  {
    id: 'char-akira',
    name: 'Akira',
    code: 'CHR_AKIRA',
    category: 'Character',
    subtitle: translate('writer.writeSolo.sample.akiraSubtitle'),
    description: translate('writer.writeSolo.sample.akiraDesc'),
    effectiveRevision: {
      stageName: translate('writer.writeSolo.sample.akiraStage'),
      reviewStatus: 'CanonLocked',
      summary: translate('writer.writeSolo.sample.akiraSummary'),
    } as any,
  },
  {
    id: 'loc-neo-shinjuku',
    name: 'Neo-Shinjuku',
    code: 'LOC_NEO_SHINJUKU',
    category: 'Location',
    subtitle: translate('writer.writeSolo.sample.shinjukuSubtitle'),
    description: translate('writer.writeSolo.sample.shinjukuDesc'),
    effectiveRevision: {
      stageName: translate('writer.writeSolo.sample.shinjukuStage'),
      reviewStatus: 'CanonLocked',
      summary: translate('writer.writeSolo.sample.shinjukuSummary'),
    } as any,
  },
] as unknown as BibleEntryDto[];

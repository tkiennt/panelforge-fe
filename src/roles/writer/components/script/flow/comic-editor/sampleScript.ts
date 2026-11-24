// src/roles/writer/components/script/flow/comic-editor/sampleScript.ts
import { translate } from '@/lib/i18n';

export const INITIAL_COMIC_SCRIPT_DOC = {
  type: 'doc',
  content: [
    {
      type: 'pageBlock',
      attrs: { pageNumber: '01', label: translate('writer.comicEditor.sample.page1Label') },
      content: [{ type: 'text', text: translate('writer.comicEditor.sample.page1Text') }],
    },
    {
      type: 'panelBlock',
      attrs: {
        panelNumber: '1.1',
        cameraAngle: translate('writer.comicEditor.sample.panel1Angle'),
      },
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.panel1Text'),
        },
      ],
    },
    {
      type: 'captionBlock',
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.caption1Text'),
        },
      ],
    },
    {
      type: 'dialogueBlock',
      attrs: { character: 'Minh' },
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.dialogue1Text'),
        },
      ],
    },
    {
      type: 'sfxBlock',
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.sfx1Text'),
        },
      ],
    },
    {
      type: 'dialogueBlock',
      attrs: { character: 'Lan' },
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.dialogue2Text'),
        },
      ],
    },
    {
      type: 'panelBlock',
      attrs: {
        panelNumber: '1.2',
        cameraAngle: translate('writer.comicEditor.sample.panel2Angle'),
      },
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.panel2Text'),
        },
      ],
    },
    {
      type: 'dialogueBlock',
      attrs: { character: translate('writer.comicEditor.sample.strangerName') },
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.dialogue3Text'),
        },
      ],
    },
    {
      type: 'sfxBlock',
      content: [
        {
          type: 'text',
          text: translate('writer.comicEditor.sample.sfx2Text'),
        },
      ],
    },
    {
      type: 'paragraph',
      content: [],
    },
  ],
};

// src/roles/writer/machines/chapterScriptMachine.ts
import { setup, assign } from 'xstate';

export interface ChapterScriptContext {
  chapterId: string;
  isScriptFrozen: boolean;
  scriptReopenStatus: 'None' | 'Requested' | 'Approved' | 'Rejected';
  scriptReopenReason?: string | null;
  isBibleGatePassed: boolean;
  unlockedBibleCount: number;
  lastError?: string | null;
}

export type ChapterScriptEvent =
  | {
      type: 'SYNC_STATUS';
      isScriptFrozen: boolean;
      scriptReopenStatus: 'None' | 'Requested' | 'Approved' | 'Rejected';
      scriptReopenReason?: string | null;
    }
  | { type: 'BIBLE_GATE_CHECKED'; isPassed: boolean; pendingCount: number }
  | { type: 'SUBMIT_FOR_APPROVAL' }
  | { type: 'PRODUCER_FREEZE' }
  | { type: 'REQUEST_REOPEN'; reason: string }
  | { type: 'PRODUCER_APPROVE_REOPEN' }
  | { type: 'PRODUCER_REJECT_REOPEN' };

export const chapterScriptMachine = setup({
  types: {
    context: {} as ChapterScriptContext,
    events: {} as ChapterScriptEvent,
  },
  guards: {
    canFreeze: ({ context }) => context.isBibleGatePassed,
    isFrozenInContext: ({ context }) => context.isScriptFrozen,
  },
  actions: {
    recordError: assign({
      lastError: () => 'Rào chắn Series Bible chưa đạt: còn nhân vật/bối cảnh chưa CanonLocked.',
    }),
    clearError: assign({
      lastError: () => null,
    }),
  },
}).createMachine({
  id: 'chapterScriptWorkflow',
  initial: 'evaluating',
  context: {
    chapterId: '',
    isScriptFrozen: false,
    scriptReopenStatus: 'None',
    scriptReopenReason: null,
    isBibleGatePassed: true,
    unlockedBibleCount: 0,
    lastError: null,
  },
  states: {
    evaluating: {
      always: [
        {
          guard: ({ context }) =>
            context.isScriptFrozen && context.scriptReopenStatus === 'Requested',
          target: 'reopenRequested',
        },
        {
          guard: ({ context }) => context.isScriptFrozen,
          target: 'frozen',
        },
        {
          guard: ({ context }) =>
            !context.isScriptFrozen && context.scriptReopenStatus === 'Approved',
          target: 'unfrozenRevision',
        },
        { target: 'drafting' },
      ],
    },
    drafting: {
      on: {
        SYNC_STATUS: {
          actions: assign({
            isScriptFrozen: ({ event }) => event.isScriptFrozen,
            scriptReopenStatus: ({ event }) => event.scriptReopenStatus,
            scriptReopenReason: ({ event }) => event.scriptReopenReason,
          }),
          target: 'evaluating',
        },
        BIBLE_GATE_CHECKED: {
          actions: assign({
            isBibleGatePassed: ({ event }) => event.isPassed,
            unlockedBibleCount: ({ event }) => event.pendingCount,
          }),
        },
        SUBMIT_FOR_APPROVAL: {
          target: 'submittingApproval',
        },
        PRODUCER_FREEZE: [
          {
            guard: 'canFreeze',
            target: 'frozen',
          },
          {
            actions: 'recordError',
          },
        ],
      },
    },
    submittingApproval: {
      on: {
        PRODUCER_FREEZE: [
          {
            guard: 'canFreeze',
            target: 'frozen',
          },
          {
            actions: 'recordError',
            target: 'drafting',
          },
        ],
        SYNC_STATUS: {
          actions: assign({
            isScriptFrozen: ({ event }) => event.isScriptFrozen,
            scriptReopenStatus: ({ event }) => event.scriptReopenStatus,
          }),
          target: 'evaluating',
        },
      },
    },
    frozen: {
      on: {
        REQUEST_REOPEN: {
          target: 'reopenRequested',
        },
        SYNC_STATUS: {
          actions: assign({
            isScriptFrozen: ({ event }) => event.isScriptFrozen,
            scriptReopenStatus: ({ event }) => event.scriptReopenStatus,
          }),
          target: 'evaluating',
        },
      },
    },
    reopenRequested: {
      on: {
        PRODUCER_APPROVE_REOPEN: {
          target: 'unfrozenRevision',
        },
        PRODUCER_REJECT_REOPEN: {
          target: 'frozen',
        },
        SYNC_STATUS: {
          actions: assign({
            isScriptFrozen: ({ event }) => event.isScriptFrozen,
            scriptReopenStatus: ({ event }) => event.scriptReopenStatus,
          }),
          target: 'evaluating',
        },
      },
    },
    unfrozenRevision: {
      on: {
        BIBLE_GATE_CHECKED: {
          actions: assign({
            isBibleGatePassed: ({ event }) => event.isPassed,
            unlockedBibleCount: ({ event }) => event.pendingCount,
          }),
        },
        PRODUCER_FREEZE: [
          {
            guard: 'canFreeze',
            target: 'frozen',
          },
          {
            actions: 'recordError',
          },
        ],
        SYNC_STATUS: {
          actions: assign({
            isScriptFrozen: ({ event }) => event.isScriptFrozen,
            scriptReopenStatus: ({ event }) => event.scriptReopenStatus,
          }),
          target: 'evaluating',
        },
      },
    },
  },
});

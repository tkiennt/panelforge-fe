// src/roles/writer/components/script/flow/plugins/consistencyLinterPlugin.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ConsistencyFindingDto } from '@/types/pipeline';

export const consistencyLinterPluginKey = new PluginKey('consistencyLinter');

export function createConsistencyLinterPlugin(getFindings: () => ConsistencyFindingDto[]) {
  return new Plugin({
    key: consistencyLinterPluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, oldSet, oldState, newState) {
        const findings = getFindings();
        if (!findings || findings.length === 0) {
          return DecorationSet.empty;
        }

        const decorations: Decoration[] = [];
        const findingMap = new Map<string, ConsistencyFindingDto>();

        for (const f of findings) {
          if (f.scriptLineId) {
            findingMap.set(f.scriptLineId, f);
          }
        }

        // Duyệt qua tất cả các node trong tài liệu để tìm ScriptLineId khớp
        newState.doc.descendants((node, pos) => {
          if (node.type.name === 'scriptLineBlock') {
            const scriptLineId = node.attrs.scriptLineId;
            if (scriptLineId && findingMap.has(scriptLineId)) {
              const finding = findingMap.get(scriptLineId)!;
              const isBlocking = finding.severity === 'Blocking';

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: isBlocking
                    ? 'border-l-4 border-red-500 bg-red-50/40 rounded-r-md transition-all duration-200 animate-pulse'
                    : 'border-l-4 border-amber-500 bg-amber-50/40 rounded-r-md transition-all duration-200',
                  'data-finding-msg': finding.message || finding.ruleCode,
                  title: `[Cảnh báo Nhất quán] ${finding.message || finding.ruleCode}`,
                }),
              );
            }
          }
        });

        return DecorationSet.create(newState.doc, decorations);
      },
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

export const ConsistencyLinterExtension = Extension.create({
  name: 'consistencyLinter',

  addOptions() {
    return {
      getFindings: () => [] as ConsistencyFindingDto[],
    };
  },

  addProseMirrorPlugins() {
    return [createConsistencyLinterPlugin(this.options.getFindings)];
  },
});

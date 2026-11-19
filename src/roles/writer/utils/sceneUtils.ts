/**
 * Utility functions for Scene Notes & Panel Ranges.
 * In Writer Studio, Scenes act as organizational notes and do not block logic or pipeline flow.
 */

export interface ParsedScenePanelRange {
  fromPanel?: number;
  toPanel?: number;
  cleanSummary: string;
}

export function parseScenePanelRange(summary?: string | null): ParsedScenePanelRange {
  if (!summary) return { cleanSummary: '' };

  // 1. Format: [Panels: 1 - 4] Note text
  const bracketMatch = summary.match(/^\[Panels?:\s*(\d+)\s*[-–—đếnto\s]+(\d+)\]\s*(.*)$/i);
  if (bracketMatch) {
    return {
      fromPanel: parseInt(bracketMatch[1], 10),
      toPanel: parseInt(bracketMatch[2], 10),
      cleanSummary: bracketMatch[3].trim(),
    };
  }

  // 2. Format: [Panel: 3] Note text (single panel)
  const singleBracketMatch = summary.match(/^\[Panels?:\s*(\d+)\]\s*(.*)$/i);
  if (singleBracketMatch) {
    const p = parseInt(singleBracketMatch[1], 10);
    return {
      fromPanel: p,
      toPanel: p,
      cleanSummary: singleBracketMatch[2].trim(),
    };
  }

  // 3. Format: Từ Panel 1 đến Panel 4: Note text
  const textMatch = summary.match(/^Từ\s+Panel\s*(\d+)\s*(?:đến|-)\s*(?:Panel\s*)?(\d+)(?:\s*:\s*|\s+)?(.*)$/i);
  if (textMatch) {
    return {
      fromPanel: parseInt(textMatch[1], 10),
      toPanel: parseInt(textMatch[2], 10),
      cleanSummary: textMatch[3].trim(),
    };
  }

  // 4. Format: Panel 1 - 4: Note text
  const shortMatch = summary.match(/^Panel\s*(\d+)\s*[-–—]\s*(\d+)(?:\s*:\s*|\s+)?(.*)$/i);
  if (shortMatch) {
    return {
      fromPanel: parseInt(shortMatch[1], 10),
      toPanel: parseInt(shortMatch[2], 10),
      cleanSummary: shortMatch[3].trim(),
    };
  }

  return { cleanSummary: summary };
}

export function formatSceneSummaryWithPanels(
  fromPanel: number | string,
  toPanel: number | string,
  note?: string | null,
): string {
  const from = Math.max(1, parseInt(String(fromPanel), 10) || 1);
  const to = Math.max(from, parseInt(String(toPanel), 10) || from);
  const trimmedNote = (note || '').trim();
  const rangeTag = from === to ? `[Panel: ${from}]` : `[Panels: ${from} - ${to}]`;
  return trimmedNote ? `${rangeTag} ${trimmedNote}` : rangeTag;
}

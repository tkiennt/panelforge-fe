// src/roles/writer/components/script/flow/comic-editor/versioning/scriptDiffEngine.ts
import { DiffLine, ScriptDiffSummary } from './types';

/**
 * Phân tích category và chi tiết của một dòng kịch bản Comic
 */
export function analyzeScriptLineCategory(lineText: string): {
  category: 'camera' | 'dialogue' | 'panel' | 'page' | 'sfx' | 'general';
  detail?: string;
} {
  const trimmed = lineText.trim();

  // 1. Trang: # Page 1 hoặc TRANG 01
  if (/^(?:#\s*Page|\bTRANG\b)/i.test(trimmed)) {
    return { category: 'page', detail: trimmed };
  }

  // 2. Panel: - Panel 1.1: Extreme Wide hoặc Panel 1:
  const panelMatch = trimmed.match(/^(?:-\s*)?Panel\s+[\d.]+(?:\s*:\s*(.*))?$/i);
  if (panelMatch) {
    const shot = panelMatch[1]?.trim();
    return {
      category: shot ? 'camera' : 'panel',
      detail: shot ? `Góc máy: ${shot}` : undefined,
    };
  }

  // 3. SFX: * BÙM * hoặc SFX: ...
  if (/^\*.*\*$/.test(trimmed) || /^SFX\s*:/i.test(trimmed)) {
    return { category: 'sfx', detail: trimmed };
  }

  // 4. Lời thoại: TÊN_NV: Lời thoại hoặc @Tên: ...
  const dialogueMatch = trimmed.match(/^[@]?[A-ZÀ-Ỹa-z0-9_\s]+(?:\/[A-Za-z]+|\s*\([^)]*\))?\s*:\s*(.*)$/);
  if (dialogueMatch) {
    return {
      category: 'dialogue',
      detail: dialogueMatch[1]?.trim() || undefined,
    };
  }

  return { category: 'general' };
}

/**
 * Longest Common Subsequence (LCS) matrix để so sánh mảng các dòng
 */
function computeLcsTable(oldLines: string[], newLines: string[]): number[][] {
  const n = oldLines.length;
  const m = newLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/**
 * Tính toán Script Diff đầy đủ giữa 2 văn bản kịch bản
 */
export function computeScriptDiff(oldRawText: string, newRawText: string): ScriptDiffSummary {
  const oldLines = (oldRawText || '').split(/\r?\n/);
  const newLines = (newRawText || '').split(/\r?\n/);

  const dp = computeLcsTable(oldLines, newLines);

  let i = oldLines.length;
  let j = newLines.length;

  const rawDiff: DiffLine[] = [];

  // Truy vết ngược từ góc dưới bảng LCS
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      const cat = analyzeScriptLineCategory(oldLines[i - 1]);
      rawDiff.push({
        type: 'unchanged',
        text: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
        changeCategory: cat.category,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      const cat = analyzeScriptLineCategory(newLines[j - 1]);
      rawDiff.push({
        type: 'added',
        text: newLines[j - 1],
        newLineNumber: j,
        changeCategory: cat.category,
        changeDetail: cat.detail,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      const cat = analyzeScriptLineCategory(oldLines[i - 1]);
      rawDiff.push({
        type: 'removed',
        text: oldLines[i - 1],
        oldLineNumber: i,
        changeCategory: cat.category,
        changeDetail: cat.detail,
      });
      i--;
    }
  }

  // Đảo ngược lại đúng thứ tự từ trên xuống dưới
  const unifiedLines = rawDiff.reverse();

  // Nhận diện khối thay thế (Modified): Ghép cặp các dòng removed và added có cùng category (camera/dialogue)
  const finalUnified: DiffLine[] = [];
  let k = 0;
  while (k < unifiedLines.length) {
    if (unifiedLines[k].type === 'removed' || unifiedLines[k].type === 'added') {
      const removedGroup: DiffLine[] = [];
      const addedGroup: DiffLine[] = [];

      while (
        k < unifiedLines.length &&
        (unifiedLines[k].type === 'removed' || unifiedLines[k].type === 'added')
      ) {
        if (unifiedLines[k].type === 'removed') {
          removedGroup.push(unifiedLines[k]);
        } else {
          addedGroup.push(unifiedLines[k]);
        }
        k++;
      }

      const pairedRemoved = new Set<number>();
      const pairedAdded = new Set<number>();

      // Ghép đôi ưu tiên theo cùng category
      for (let rIdx = 0; rIdx < removedGroup.length; rIdx++) {
        const r = removedGroup[rIdx];
        for (let aIdx = 0; aIdx < addedGroup.length; aIdx++) {
          if (pairedAdded.has(aIdx)) continue;
          const a = addedGroup[aIdx];
          const isBothCamera =
            (r.changeCategory === 'camera' || r.changeCategory === 'panel') &&
            (a.changeCategory === 'camera' || a.changeCategory === 'panel');
          const isBothDialogue = r.changeCategory === 'dialogue' && a.changeCategory === 'dialogue';

          if (isBothCamera || isBothDialogue) {
            pairedRemoved.add(rIdx);
            pairedAdded.add(aIdx);
            finalUnified.push({
              type: 'modified',
              text: a.text,
              oldLineNumber: r.oldLineNumber,
              newLineNumber: a.newLineNumber,
              changeCategory: isBothCamera ? 'camera' : 'dialogue',
              changeDetail: `Sửa từ: "${r.text}" → "${a.text}"`,
            });
            break;
          }
        }
      }

      // Đẩy các dòng removed chưa được ghép
      for (let rIdx = 0; rIdx < removedGroup.length; rIdx++) {
        if (!pairedRemoved.has(rIdx)) {
          finalUnified.push(removedGroup[rIdx]);
        }
      }

      // Đẩy các dòng added chưa được ghép
      for (let aIdx = 0; aIdx < addedGroup.length; aIdx++) {
        if (!pairedAdded.has(aIdx)) {
          finalUnified.push(addedGroup[aIdx]);
        }
      }
    } else {
      finalUnified.push(unifiedLines[k]);
      k++;
    }
  }

  // Xây dựng side-by-side alignment
  const leftSide: (DiffLine | null)[] = [];
  const rightSide: (DiffLine | null)[] = [];

  for (const line of finalUnified) {
    if (line.type === 'unchanged') {
      leftSide.push(line);
      rightSide.push(line);
    } else if (line.type === 'removed') {
      leftSide.push(line);
      rightSide.push(null);
    } else if (line.type === 'added') {
      leftSide.push(null);
      rightSide.push(line);
    } else if (line.type === 'modified') {
      leftSide.push({
        ...line,
        type: 'removed',
        text: line.changeDetail?.match(/^Sửa từ: "([^"]+)"/)?.[1] || line.text,
      });
      rightSide.push(line);
    }
  }

  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  for (const line of finalUnified) {
    if (line.type === 'added') addedCount++;
    else if (line.type === 'removed') removedCount++;
    else if (line.type === 'modified') modifiedCount++;
    else if (line.type === 'unchanged') unchangedCount++;
  }

  return {
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
    lines: finalUnified,
    sideBySide: {
      left: leftSide,
      right: rightSide,
    },
  };
}

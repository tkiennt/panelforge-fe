// src/roles/writer/components/script/flow/comic-editor/comicCounting.ts

/**
 * Trích xuất số trang từ chuỗi văn bản (hỗ trợ "# Page 1", "! Trang 01", "# Trang 1", "Trang 1", "TRANG 01", "# 1", "! 1", v.v.)
 */
export function extractPageNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.trim();
  // 1. Khớp từ khóa Trang / Page kèm số
  const pageWordMatch = clean.match(/(?:Trang|Page)\s*[:.-]?\s*(\d+)/i);
  if (pageWordMatch) {
    const num = parseInt(pageWordMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  // 2. Khớp tiền tố # hoặc ! hoặc icon kèm số
  const prefixMatch = clean.match(/^(?:#|!|📄)\s*(?:Trang|Page)?\s*[:.-]?\s*(\d+)/i);
  if (prefixMatch) {
    const num = parseInt(prefixMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  // 3. Khớp số nguyên độc lập đầu tiên
  const standaloneMatch = clean.match(/\b(\d+)\b/);
  if (standaloneMatch) {
    const num = parseInt(standaloneMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

/**
 * Trích xuất số panel từ chuỗi văn bản (hỗ trợ "Panel 1.2", "- Panel 1.2", '" Panel 1.2', "Khung 1.2", "1.2", "- 1.2", '" 1.2', "Panel 2", v.v.)
 */
export function extractPanelNumber(text: string): { pageNum?: number; panelNum?: number } | null {
  if (!text) return null;
  const clean = text.trim();
  // 1. Khớp dạng X.Y (ví dụ: 1.2, Panel 1.2, " Panel 1.2, - Panel 1.2)
  const dotMatch = clean.match(/(?:Panel|Khung|#panel)?\s*(\d+)\.(\d+)/i);
  if (dotMatch) {
    const p1 = parseInt(dotMatch[1], 10);
    const p2 = parseInt(dotMatch[2], 10);
    if (!isNaN(p1) && !isNaN(p2)) {
      return { pageNum: p1, panelNum: p2 };
    }
  }
  // 2. Khớp dạng số đơn sau từ khóa Panel hoặc Khung (ví dụ: Panel 2, " Panel 2)
  const singleMatch = clean.match(/(?:Panel|Khung|#panel)\s*[:.-]?\s*(\d+)/i);
  if (singleMatch) {
    const p = parseInt(singleMatch[1], 10);
    if (!isNaN(p) && p > 0) {
      return { panelNum: p };
    }
  }
  return null;
}

/**
 * Quét ngược tài liệu từ vị trí hiện tại để tìm số trang gần nhất.
 * Nếu chưa có trang nào -> trả về 1.
 * Nếu đã có trang N -> trả về N + 1.
 * Nếu người dùng chỉ định số trang cụ thể (ví dụ: # 4 hoặc ! Trang 4) -> trả về 4.
 */
export function getNextPageNumber(
  doc: any,
  currentPos?: number,
  explicitNumber?: number
): number {
  if (typeof explicitNumber === 'number' && !isNaN(explicitNumber) && explicitNumber > 0) {
    return explicitNumber;
  }

  let lastPageNumber = 0;

  if (doc && typeof doc.descendants === 'function') {
    doc.descendants((node: any, pos: number) => {
      // Chỉ kiểm tra các node nằm trước vị trí hiện tại
      if (typeof currentPos === 'number' && pos >= currentPos) {
        return false;
      }

      const isPage =
        node.type.name === 'pageBlock' ||
        (node.type.name === 'scriptLineBlock' && node.attrs?.blockType === 'page_heading');

      if (isPage) {
        if (node.attrs?.pageNumber) {
          const parsed = parseInt(String(node.attrs.pageNumber), 10);
          if (!isNaN(parsed) && parsed > 0) {
            lastPageNumber = Math.max(lastPageNumber, parsed);
            return false;
          }
        }

        const text = node.textContent || '';
        const parsed = extractPageNumber(text);
        if (parsed !== null) {
          lastPageNumber = Math.max(lastPageNumber, parsed);
          return false;
        }

        lastPageNumber = Math.max(lastPageNumber + 1, 1);
        return false;
      }

      return true;
    });
  }

  return lastPageNumber > 0 ? lastPageNumber + 1 : 1;
}

/**
 * Tìm trang bao quanh hoặc đứng trước gần nhất (N),
 * đếm số lượng panel đã có trong trang đó (M),
 * trả về { pageNum: N, panelNum: M + 1 }.
 * Khi qua Trang 2, panelNum tự động reset về 1 (Panel 2.1).
 */
export function getNextPanelNumber(
  doc: any,
  currentPos?: number,
  explicit?: { pageNum?: number; panelNum?: number }
): { pageNum: number; panelNum: number } {
  if (explicit?.pageNum && explicit?.panelNum) {
    return { pageNum: explicit.pageNum, panelNum: explicit.panelNum };
  }

  let currentPageNum = 1;
  let panelCountInCurrentPage = 0;

  if (doc && typeof doc.descendants === 'function') {
    doc.descendants((node: any, pos: number) => {
      if (typeof currentPos === 'number' && pos >= currentPos) {
        return false;
      }

      const isPage =
        node.type.name === 'pageBlock' ||
        (node.type.name === 'scriptLineBlock' && node.attrs?.blockType === 'page_heading');

      if (isPage) {
        let pNum = 1;
        if (node.attrs?.pageNumber) {
          const parsed = parseInt(String(node.attrs.pageNumber), 10);
          if (!isNaN(parsed) && parsed > 0) pNum = parsed;
        } else {
          const text = node.textContent || '';
          const parsed = extractPageNumber(text);
          if (parsed !== null) {
            pNum = parsed;
          } else {
            pNum = currentPageNum + 1;
          }
        }

        currentPageNum = pNum;
        // Bắt đầu trang mới -> reset biến đếm panel trong trang
        panelCountInCurrentPage = 0;
        return false;
      }

      const isPanel =
        node.type.name === 'panelBlock' ||
        (node.type.name === 'scriptLineBlock' && node.attrs?.blockType === 'panel_heading');

      if (isPanel) {
        panelCountInCurrentPage++;

        // Đồng bộ số thứ tự nếu node đã có panelNumber cụ thể
        if (node.attrs?.panelNumber) {
          const parts = String(node.attrs.panelNumber).split('.');
          if (parts.length === 2) {
            const p = parseInt(parts[1], 10);
            if (!isNaN(p)) {
              panelCountInCurrentPage = Math.max(panelCountInCurrentPage, p);
            }
          }
        } else {
          const text = node.textContent || '';
          const parsed = extractPanelNumber(text);
          if (parsed?.panelNum) {
            panelCountInCurrentPage = Math.max(panelCountInCurrentPage, parsed.panelNum);
          }
        }

        return false;
      }

      return true;
    });
  }

  if (explicit?.panelNum) {
    return {
      pageNum: explicit.pageNum || currentPageNum,
      panelNum: explicit.panelNum,
    };
  }

  return {
    pageNum: currentPageNum,
    panelNum: panelCountInCurrentPage + 1,
  };
}

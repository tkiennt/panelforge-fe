// src/roles/writer/components/script/flow/comic-editor/comicCounting.test.ts
import { describe, it, expect } from 'vitest';
import {
  getNextPageNumber,
  getNextPanelNumber,
  extractPageNumber,
  extractPanelNumber,
} from './comicCounting';

describe('comicCounting - Look-behind Page & Panel Calculation', () => {
  it('trả về Page 1 nếu tài liệu chưa có trang nào', () => {
    const mockDoc = {
      descendants: (cb: any) => {},
    };
    expect(getNextPageNumber(mockDoc)).toBe(1);
  });

  it('tuân thủ số trang người dùng chỉ định rõ (explicit)', () => {
    const mockDoc = {
      descendants: (cb: any) => {},
    };
    expect(getNextPageNumber(mockDoc, 10, 5)).toBe(5);
  });

  it('trích xuất chính xác số trang từ nhiều định dạng khác nhau', () => {
    expect(extractPageNumber('! Trang 1')).toBe(1);
    expect(extractPageNumber('! Trang 05')).toBe(5);
    expect(extractPageNumber('# Page 2')).toBe(2);
    expect(extractPageNumber('# Trang 3')).toBe(3);
    expect(extractPageNumber('Trang 4')).toBe(4);
    expect(extractPageNumber('TRANG 10')).toBe(10);
    expect(extractPageNumber('! 7')).toBe(7);
  });

  it('trích xuất chính xác số panel từ nhiều định dạng khác nhau', () => {
    expect(extractPanelNumber('Panel 1.1')).toEqual({ pageNum: 1, panelNum: 1 });
    expect(extractPanelNumber('- Panel 1.2: Toàn cảnh')).toEqual({ pageNum: 1, panelNum: 2 });
    expect(extractPanelNumber('" Panel 1.3: Cận cảnh')).toEqual({ pageNum: 1, panelNum: 3 });
    expect(extractPanelNumber('" 2.1')).toEqual({ pageNum: 2, panelNum: 1 });
    expect(extractPanelNumber('Panel 4')).toEqual({ panelNum: 4 });
  });

  it('tính toán số trang tuần tự Page 1 -> Page 2 -> Page 3', () => {
    const nodes = [
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '01' }, textContent: 'Trang 01' },
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '02' }, textContent: 'Trang 02' },
    ];

    const mockDoc = {
      descendants: (cb: any) => {
        nodes.forEach((n, idx) => cb(n, idx * 10));
      },
    };

    expect(getNextPageNumber(mockDoc, 100)).toBe(3);
  });

  it('tính toán số khung hình Panel 1.1 -> Panel 1.2 -> Panel 1.3 và reset về Panel 2.1 khi qua Trang 2', () => {
    const nodes = [
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '1' }, textContent: 'Trang 01' },
      { type: { name: 'panelBlock' }, attrs: { panelNumber: '1.1' }, textContent: '" Panel 1.1' },
      { type: { name: 'panelBlock' }, attrs: { panelNumber: '1.2' }, textContent: '" Panel 1.2' },
    ];

    const mockDocPage1 = {
      descendants: (cb: any) => {
        nodes.forEach((n, idx) => cb(n, idx * 10));
      },
    };

    // Tiếp theo trong Trang 1 phải là Panel 1.3
    expect(getNextPanelNumber(mockDocPage1, 100)).toEqual({ pageNum: 1, panelNum: 3 });

    // Khi đã có Trang 2 trong tài liệu
    const nodesWithPage2 = [
      ...nodes,
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '2' }, textContent: 'Trang 02' },
    ];

    const mockDocPage2 = {
      descendants: (cb: any) => {
        nodesWithPage2.forEach((n, idx) => cb(n, idx * 10));
      },
    };

    // Ngay sau Trang 2, panel phải reset về Panel 2.1
    expect(getNextPanelNumber(mockDocPage2, 200)).toEqual({ pageNum: 2, panelNum: 1 });

    // Khi con trỏ đang nằm NGAY TẠI tiêu đề Trang 3 (pos = 30), panel tiếp theo phải là Panel 3.1 (không bị lùi về Trang 2)
    const nodesWithPage3 = [
      ...nodesWithPage2,
      {
        type: { name: 'scriptLineBlock' },
        attrs: { blockType: 'page_heading', pageNumber: '3' },
        textContent: 'Trang 03',
      },
    ];
    const mockDocPage3 = {
      descendants: (cb: any) => {
        nodesWithPage3.forEach((n, idx) => cb(n, idx * 10)); // Trang 3 nằm tại pos = 40
      },
    };
    expect(getNextPanelNumber(mockDocPage3, 40)).toEqual({ pageNum: 3, panelNum: 1 });
  });
});

// src/roles/writer/components/script/flow/comic-editor/comicCounting.test.ts
import { describe, it, expect } from 'vitest';
import { getNextPageNumber, getNextPanelNumber } from './comicCounting';

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

  it('tính toán số trang tuần tự Page 1 -> Page 2 -> Page 3', () => {
    const nodes = [
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '01' }, textContent: 'TRANG 01' },
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '02' }, textContent: 'TRANG 02' },
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
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '1' }, textContent: 'TRANG 01' },
      { type: { name: 'panelBlock' }, attrs: { panelNumber: '1.1' }, textContent: 'Panel 1.1' },
      { type: { name: 'panelBlock' }, attrs: { panelNumber: '1.2' }, textContent: 'Panel 1.2' },
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
      { type: { name: 'pageBlock' }, attrs: { pageNumber: '2' }, textContent: 'TRANG 02' },
    ];

    const mockDocPage2 = {
      descendants: (cb: any) => {
        nodesWithPage2.forEach((n, idx) => cb(n, idx * 10));
      },
    };

    // Ngay sau Trang 2, panel phải reset về Panel 2.1
    expect(getNextPanelNumber(mockDocPage2, 200)).toEqual({ pageNum: 2, panelNum: 1 });
  });
});

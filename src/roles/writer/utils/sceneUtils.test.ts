import { describe, it, expect } from 'vitest';
import { parseScenePanelRange, formatSceneSummaryWithPanels } from './sceneUtils';

describe('sceneUtils', () => {
  describe('formatSceneSummaryWithPanels', () => {
    it('formats range tag with note', () => {
      const result = formatSceneSummaryWithPanels(1, 4, 'Bối cảnh quán cà phê');
      expect(result).toBe('[Panels: 1 - 4] Bối cảnh quán cà phê');
    });

    it('formats single panel tag without note', () => {
      const result = formatSceneSummaryWithPanels(3, 3, '');
      expect(result).toBe('[Panel: 3]');
    });

    it('handles toPanel smaller than fromPanel by clamping to fromPanel', () => {
      const result = formatSceneSummaryWithPanels(5, 2, 'Lưu ý');
      expect(result).toBe('[Panel: 5] Lưu ý');
    });
  });

  describe('parseScenePanelRange', () => {
    it('parses bracket format [Panels: 1 - 4] note', () => {
      const parsed = parseScenePanelRange('[Panels: 1 - 4] Neo Tokyo ban đêm');
      expect(parsed.fromPanel).toBe(1);
      expect(parsed.toPanel).toBe(4);
      expect(parsed.cleanSummary).toBe('Neo Tokyo ban đêm');
    });

    it('parses single panel [Panel: 2] note', () => {
      const parsed = parseScenePanelRange('[Panel: 2] Cận cảnh khuôn mặt');
      expect(parsed.fromPanel).toBe(2);
      expect(parsed.toPanel).toBe(2);
      expect(parsed.cleanSummary).toBe('Cận cảnh khuôn mặt');
    });

    it('parses natural Vietnamese text "Từ Panel 2 đến Panel 5: Mô tả"', () => {
      const parsed = parseScenePanelRange('Từ Panel 2 đến Panel 5: Mô tả');
      expect(parsed.fromPanel).toBe(2);
      expect(parsed.toPanel).toBe(5);
      expect(parsed.cleanSummary).toBe('Mô tả');
    });

    it('parses short format "Panel 3 - 6: Ghi chú"', () => {
      const parsed = parseScenePanelRange('Panel 3 - 6: Ghi chú');
      expect(parsed.fromPanel).toBe(3);
      expect(parsed.toPanel).toBe(6);
      expect(parsed.cleanSummary).toBe('Ghi chú');
    });

    it('returns original summary when no range pattern matches', () => {
      const parsed = parseScenePanelRange('Một phân cảnh hành động kịch tính');
      expect(parsed.fromPanel).toBeUndefined();
      expect(parsed.toPanel).toBeUndefined();
      expect(parsed.cleanSummary).toBe('Một phân cảnh hành động kịch tính');
    });
  });
});

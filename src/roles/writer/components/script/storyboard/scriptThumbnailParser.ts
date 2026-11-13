// src/roles/writer/components/script/storyboard/scriptThumbnailParser.ts
import {
  StoryboardPage,
  StoryboardPanel,
  StoryboardDialogue,
  CameraAngle,
} from './scriptThumbnail.types';
import { SceneDetailDto } from '@/services/scriptLine.service';

/**
 * Sinh UUID v4
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Mẫu kịch bản chuẩn cấu trúc:
 * Trang 1
 * #panel 1.1
 * @nhanvat: loi thoại
 * #panel 1.2
 */
export const SAMPLE_SCRIPT_TEXT = `Trang 1
#panel 1.1
[Góc máy: Toàn cảnh (Wide Shot)]
Bầu trời Tokyo lúc hoàng hôn, ánh mặt trời đỏ rực phản chiếu trên những tòa cao ốc.
@Ren: Cuối cùng cũng tìm thấy dấu vết của tổ chức...
@Yuki: Cậu có chắc là ở khu vực này không Ren?

#panel 1.2
[Góc máy: Cận cảnh (Close-Up)]
Ren siết chặt chuôi kiếm sau lưng, ánh mắt kiên định.
@Ren: Không thể nhầm được. Mùi năng lượng này chỉ có ở hắn!

#panel 1.3
[Góc máy: Góc cao (High Angle / Bird-Eye)]
Từ trên mái nhà, bóng đen bí ẩn đang âm thầm quan sát hai người họ.
@Kuro: Lại có thêm những con thiêu thân tự đâm đầu vào chỗ chết...

Trang 2
#panel 2.1
[Góc máy: Ngang vai (Over-the-Shoulder)]
Yuki rút bùa chú phòng vệ, không khí bỗng trở nên căng thẳng nghẹt thở.
@Yuki: Cẩn thận! Có sát khí phía sau!

#panel 2.2
[Góc máy: Đặc tả (Extreme Close-Up)]
Lưỡi kiếm lóe sáng trong màn đêm!`;

/**
 * Phân tích cú pháp văn bản kịch bản sang cấu trúc StoryboardPage & StoryboardPanel
 */
export function parseScriptToStoryboard(rawText: string): StoryboardPage[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const pages: StoryboardPage[] = [];

  let currentPage: StoryboardPage | null = null;
  let currentPanel: StoryboardPanel | null = null;
  let panelOrderCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 1. Nhận diện Trang: "! Trang 1", "# Page 1", "Trang 1", "Page 1", "PAGE 2"
    const pageMatch = trimmed.match(
      /^(?:[!#📄]?\s*(?:Trang|Page)\s*(\d+)|(?:Trang|Page)\s+(\d+))/iu,
    );
    if (pageMatch) {
      const pageNum = parseInt(pageMatch[1] || pageMatch[2], 10);
      currentPage = {
        id: generateId(),
        pageNumber: pageNum,
        panels: [],
      };
      pages.push(currentPage);
      currentPanel = null;
      panelOrderCounter = 1;
      continue;
    }

    // 2. Nhận diện Panel: '" Panel 1.1', '- Panel 1.1', '#panel 1.1', 'Panel 1.1'
    const panelMatch = trimmed.match(
      /^(?:(?:[-"”]\s*)?(?:Panel|Khung)\s*([0-9]+(?:\.[0-9]+)?)|[-"”]\s*([0-9]+(?:\.[0-9]+)?)|#panel\s*([0-9]+(?:\.[0-9]+)?))/i,
    );
    if (panelMatch) {
      if (!currentPage) {
        // Tự động khởi tạo Trang 1 nếu chưa có dòng Trang
        currentPage = {
          id: generateId(),
          pageNumber: 1,
          panels: [],
        };
        pages.push(currentPage);
        panelOrderCounter = 1;
      }

      const panelKey = panelMatch[1] || panelMatch[2] || panelMatch[3];
      const panelNum =
        parseInt(panelKey.includes('.') ? panelKey.split('.')[1] : panelKey, 10) ||
        panelOrderCounter;

      currentPanel = {
        id: generateId(),
        panelKey,
        panelNumber: panelNum,
        readingOrder: panelOrderCounter++,
        dialogues: [],
      };
      currentPage.panels.push(currentPanel);
      continue;
    }

    // Nếu có nội dung trước khi xuất hiện #panel, tạo panel mặc định
    if (!currentPanel) {
      if (!currentPage) {
        currentPage = {
          id: generateId(),
          pageNumber: 1,
          panels: [],
        };
        pages.push(currentPage);
        panelOrderCounter = 1;
      }
      currentPanel = {
        id: generateId(),
        panelKey: `${currentPage.pageNumber}.${currentPage.panels.length + 1}`,
        panelNumber: currentPage.panels.length + 1,
        readingOrder: panelOrderCounter++,
        dialogues: [],
      };
      currentPage.panels.push(currentPanel);
    }

    // 3. Nhận diện góc máy: "[Góc máy: Cận cảnh]" hoặc "[Camera: Wide Shot]"
    const cameraMatch = trimmed.match(/^\[(?:Góc máy|Camera):\s*([^\]]+)\]/i);
    if (cameraMatch) {
      currentPanel.cameraAngle = cameraMatch[1].trim() as CameraAngle;
      continue;
    }

    // 4. Nhận diện lời thoại: "@nhanvat: loi thoại" hoặc "@Ren: Cẩn thận!"
    const dialogueMatch = trimmed.match(/^@([^:]+):\s*(.*)$/);
    if (dialogueMatch) {
      const speaker = dialogueMatch[1].trim();
      const text = dialogueMatch[2].trim();
      currentPanel.dialogues.push({
        id: generateId(),
        speaker,
        text,
      });
      continue;
    }

    // 5. Còn lại là chỉ dẫn sân khấu / hành động
    if (currentPanel.stageDirection) {
      currentPanel.stageDirection += `\n${trimmed}`;
    } else {
      currentPanel.stageDirection = trimmed;
    }
  }

  return pages;
}

/**
 * Chuyển đổi ngược từ danh sách StoryboardPage sang định dạng kịch bản văn bản
 */
export function serializeStoryboardToScript(pages: StoryboardPage[]): string {
  if (!pages || pages.length === 0) return '';

  const chunks: string[] = [];

  pages.forEach((page) => {
    chunks.push(`Trang ${page.pageNumber}`);

    page.panels.forEach((panel) => {
      chunks.push(`\n#panel ${panel.panelKey}`);

      if (panel.cameraAngle) {
        chunks.push(`[Góc máy: ${panel.cameraAngle}]`);
      }

      if (panel.stageDirection && panel.stageDirection.trim()) {
        chunks.push(panel.stageDirection.trim());
      }

      panel.dialogues.forEach((dlg) => {
        chunks.push(`@${dlg.speaker}: ${dlg.text}`);
      });
    });

    chunks.push('\n');
  });

  return chunks.join('\n').trim();
}

/**
 * Chuyển đổi từ danh sách SceneDetailDto hiện có trong hệ thống sang cấu trúc StoryboardPage
 */
export function scenesToStoryboardPages(
  scenes: SceneDetailDto[],
  getSpeakerName?: (id?: string | null) => string | null,
): StoryboardPage[] {
  if (!scenes || scenes.length === 0) {
    return parseScriptToStoryboard(SAMPLE_SCRIPT_TEXT);
  }

  const pages: StoryboardPage[] = [];
  let pageNumber = 1;
  let currentPage: StoryboardPage = {
    id: generateId(),
    pageNumber,
    panels: [],
  };
  pages.push(currentPage);

  let panelCounter = 1;

  scenes.forEach((scene) => {
    const lines = scene.scriptLines || [];
    if (lines.length === 0) return;

    // Nhóm 2-3 dòng kịch bản thành 1 panel hoặc theo panelId nếu có
    const panelGroups = new Map<string, typeof lines>();

    lines.forEach((line, idx) => {
      // Nhóm theo panelId nếu có, hoặc gom cụm 2 dòng thành 1 khung tranh
      const groupKey = line.panelId || `auto_group_${Math.floor(idx / 2) + 1}`;
      if (!panelGroups.has(groupKey)) {
        panelGroups.set(groupKey, []);
      }
      panelGroups.get(groupKey)!.push(line);
    });

    panelGroups.forEach((groupLines) => {
      // Nếu trang hiện tại đã có 4 panel, chuyển sang trang mới
      if (currentPage.panels.length >= 4) {
        pageNumber++;
        currentPage = {
          id: generateId(),
          pageNumber,
          panels: [],
        };
        pages.push(currentPage);
        panelCounter = 1;
      }

      const panelKey = `${pageNumber}.${panelCounter}`;
      const dialogues: StoryboardDialogue[] = [];
      let stageDirection: string | undefined = undefined;

      groupLines.forEach((l) => {
        if (l.stageDirection && !l.dialogueText) {
          stageDirection = stageDirection
            ? `${stageDirection}\n${l.stageDirection}`
            : l.stageDirection;
        } else if (l.dialogueText) {
          const speaker =
            (getSpeakerName ? getSpeakerName(l.speakerCharacterId) : null) || 'Nhân vật';
          dialogues.push({
            id: l.id,
            speaker,
            text: l.dialogueText,
            speakerCharacterId: l.speakerCharacterId,
            narrationMode: l.narrationMode,
          });
        }
      });

      currentPage.panels.push({
        id: generateId(),
        panelKey,
        panelNumber: panelCounter,
        readingOrder: panelCounter,
        stageDirection,
        dialogues,
        sourceScriptLineIds: groupLines.map((l) => l.id),
      });

      panelCounter++;
    });
  });

  return pages.length > 0 ? pages : parseScriptToStoryboard(SAMPLE_SCRIPT_TEXT);
}

// src/roles/writer/components/script/flow/converter/regexScriptParser.ts
import { ConvertScriptRequest, ConvertScriptResponse, SeriesBibleContext } from './types';

const CAMERA_ANGLES = [
  'Toàn cảnh',
  'Trung cảnh',
  'Cận cảnh',
  'Góc thấp',
  'Góc cao',
  'Cận cảnh biểu cảm',
  'Đặc tả',
  'Góc qua vai',
];

interface ParsedBeat {
  type: 'dialogue' | 'sfx' | 'caption' | 'action';
  speaker?: string;
  text: string;
}

/**
 * Phân tích tên nhân vật dựa trên văn bản và danh sách Series Bible
 */
function resolveSpeaker(
  candidateText: string,
  bible?: SeriesBibleContext
): string | null {
  const characters = bible?.characters || [];
  // 1. Khớp chính xác với danh sách Series Bible
  for (const c of characters) {
    if (new RegExp(`\\b${c.name}\\b`, 'i').test(candidateText)) {
      return c.name;
    }
  }

  // 2. Tìm danh từ riêng viết hoa tiếng Việt (ví dụ: Minh, Lan, Hoàng, Thám tử Ken)
  const nameMatch = candidateText.match(/\b([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)\b/);
  if (nameMatch) {
    const ignoredWords = ['Người', 'Anh', 'Cô', 'Bọn', 'Hắn', 'Gã', 'Tôi', 'Cậu', 'Bà', 'Ông', 'Chúng'];
    if (!ignoredWords.includes(nameMatch[1])) {
      return nameMatch[1];
    }
  }

  return null;
}

/**
 * Trích xuất các nhịp hành động (Beats) từ đoạn văn bản thô
 */
function extractBeatsFromParagraph(
  paragraph: string,
  bible?: SeriesBibleContext
): ParsedBeat[] {
  const trimmed = paragraph.trim();
  if (!trimmed) return [];

  const beats: ParsedBeat[] = [];

  // 1. Kiểm tra nếu dòng bắt đầu bằng cú pháp kịch bản có sẵn
  if (/^@([\w\p{L}_-]+)\s*:\s*["“]([^"”]+)["”]$/u.test(trimmed)) {
    const match = trimmed.match(/^@([\w\p{L}_-]+)\s*:\s*["“]([^"”]+)["”]$/u);
    if (match) {
      beats.push({ type: 'dialogue', speaker: match[1], text: match[2] });
      return beats;
    }
  }

  if (/^(?:SFX:|\*)\s*(.*)/i.test(trimmed)) {
    const match = trimmed.match(/^(?:SFX:|\*)\s*(.*)/i);
    beats.push({ type: 'sfx', text: match ? match[1].replace(/\*$/, '').trim().toUpperCase() : 'TIẾNG ĐỘNG' });
    return beats;
  }

  if (/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện):\s*(.*)/i.test(trimmed)) {
    const match = trimmed.match(/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện):\s*(.*)/i);
    beats.push({ type: 'caption', text: match ? match[1].trim() : trimmed });
    return beats;
  }

  // 2. Tách câu và phát hiện lời thoại lồng trong văn xuôi (e.g., Minh nói: "Hãy cẩn thận!" rồi quay lưng bỏ đi.)
  // Regex tìm kiếm các đoạn trong ngoặc kép
  const quoteRegex = /["“]([^"”]+)["”]/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = quoteRegex.exec(trimmed)) !== null) {
    const beforeText = trimmed.slice(lastIndex, match.index).trim();
    const dialogueContent = match[1].trim();

    if (beforeText) {
      // Phân tích xem đoạn trước có chứa tên người nói không (e.g., "Minh thì thầm:")
      const speakerCandidate = resolveSpeaker(beforeText, bible);
      // Kiểm tra SFX trong ngoặc đơn (e.g., (Rầm!))
      const sfxInParens = beforeText.match(/\(([^)]+!|tiếng[^)]+)\)/i);
      if (sfxInParens) {
        beats.push({ type: 'sfx', text: sfxInParens[1].toUpperCase() });
      }

      const cleanedAction = beforeText
        .replace(/[:,-]\s*$/, '')
        .replace(/\(([^)]+!|tiếng[^)]+)\)/i, '')
        .trim();

      if (cleanedAction) {
        beats.push({ type: 'action', text: cleanedAction });
      }

      if (speakerCandidate) {
        beats.push({ type: 'dialogue', speaker: speakerCandidate, text: dialogueContent });
      } else {
        // Tìm người nói ở danh sách bible hoặc gán ẩn danh
        const bibleSpeaker = bible?.characters?.[0]?.name || 'Nhân vật';
        beats.push({ type: 'dialogue', speaker: bibleSpeaker, text: dialogueContent });
      }
    } else {
      // Không có đoạn text trước, thoại đứng đầu câu
      const bibleSpeaker = bible?.characters?.[0]?.name || 'Nhân vật';
      beats.push({ type: 'dialogue', speaker: bibleSpeaker, text: dialogueContent });
    }

    lastIndex = match.index + match[0].length;
  }

  // Phần còn lại sau dấu ngoặc kép cuối cùng
  const remainingText = trimmed.slice(lastIndex).trim();
  if (remainingText) {
    // 1. Kiểm tra SFX trong ngoặc đơn dạng (BÙM!), (Tiếng nổ...), (RẦM!)
    const sfxInParens = remainingText.match(/\(([^)]+!|tiếng[^)]+)\)/i);
    if (sfxInParens) {
      const sfxClean = sfxInParens[1].replace(/^\(/, '').replace(/\)$/, '').trim().toUpperCase();
      beats.push({ type: 'sfx', text: sfxClean });
    }

    // 2. Kiểm tra từ cảm thán âm thanh đứng riêng
    const sfxStandalone = remainingText.match(/([A-ZÀ-Ỹ]{2,}!|\b[a-zA-ZÀ-Ỹ]+!{2,})/);
    if (sfxStandalone && remainingText.length < 30 && !sfxInParens) {
      beats.push({ type: 'sfx', text: sfxStandalone[1].toUpperCase() });
    } else {
      const cleanedAction = remainingText
        .replace(/\(([^)]+!|tiếng[^)]+)\)/i, '')
        .trim();
      if (cleanedAction) {
        beats.push({ type: 'action', text: cleanedAction });
      }
    }
  }

  return beats.length > 0 ? beats : [{ type: 'action', text: trimmed }];
}

/**
 * Heuristic Converter: Chuyển đổi văn bản thô / prompt thành định dạng kịch bản truyện tranh
 */
export function convertRawTextHeuristically(
  request: ConvertScriptRequest
): ConvertScriptResponse {
  const {
    inputContent,
    seriesBibleContext,
    startingPageNumber = 1,
    targetPanelsPerPage = 4,
  } = request;

  const rawParagraphs = inputContent
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    return {
      scriptText: `! Trang ${String(startingPageNumber).padStart(2, '0')}\n" Panel ${startingPageNumber}.1: [Toàn cảnh]\nKhông có nội dung chuyển đổi.`,
      pagesCount: 1,
      panelsCount: 1,
      source: 'heuristic',
    };
  }

  // Thu thập tất cả các beats từ toàn bộ văn bản
  const allBeats: ParsedBeat[] = [];
  for (const para of rawParagraphs) {
    const extracted = extractBeatsFromParagraph(para, seriesBibleContext);
    allBeats.push(...extracted);
  }

  // Nhóm các beats thành từng Panel (mỗi panel gồm 1-3 beats liên quan)
  interface GeneratedPanel {
    shot: string;
    description: string;
    beats: ParsedBeat[];
  }

  const generatedPanels: GeneratedPanel[] = [];
  let currentPanelBeats: ParsedBeat[] = [];
  let shotIndex = 0;

  for (let i = 0; i < allBeats.length; i++) {
    const beat = allBeats[i];
    currentPanelBeats.push(beat);

    // Quyết định ngắt Panel: Khi có 1 câu thoại kèm hành động, hoặc có SFX, hoặc đã đủ 2 beats
    const isLastBeat = i === allBeats.length - 1;
    const hasDialogue = currentPanelBeats.some((b) => b.type === 'dialogue');
    const hasSfx = currentPanelBeats.some((b) => b.type === 'sfx');

    if (
      isLastBeat ||
      hasSfx ||
      (hasDialogue && currentPanelBeats.length >= 2) ||
      currentPanelBeats.length >= 3
    ) {
      const shot = CAMERA_ANGLES[shotIndex % CAMERA_ANGLES.length];
      shotIndex++;

      // Trích xuất mô tả hành động từ action beats
      const actionTexts = currentPanelBeats
        .filter((b) => b.type === 'action')
        .map((b) => b.text);
      const description = actionTexts.join(' ') || 'Quan sát khung cảnh.';

      generatedPanels.push({
        shot,
        description,
        beats: [...currentPanelBeats],
      });
      currentPanelBeats = [];
    }
  }

  // Nếu số panel quá ít, đảm bảo tối thiểu 2 panel cho trải nghiệm trực quan
  if (generatedPanels.length === 1 && allBeats.length > 1) {
    const first = generatedPanels[0];
    const half = Math.ceil(first.beats.length / 2);
    const p1Beats = first.beats.slice(0, half);
    const p2Beats = first.beats.slice(half);

    generatedPanels.length = 0;
    generatedPanels.push(
      {
        shot: 'Toàn cảnh',
        description: p1Beats.map((b) => b.text).join(' '),
        beats: p1Beats,
      },
      {
        shot: 'Cận cảnh',
        description: p2Beats.map((b) => b.text).join(' '),
        beats: p2Beats,
      }
    );
  }

  // Xuất thành định dạng văn bản Comic Script chuẩn
  const lines: string[] = [];
  let currentPage = startingPageNumber;
  let panelInCurrentPage = 0;
  let totalPanels = 0;

  for (let pIdx = 0; pIdx < generatedPanels.length; pIdx++) {
    const panel = generatedPanels[pIdx];

    // Bắt đầu trang mới
    if (panelInCurrentPage === 0) {
      const pageStr = String(currentPage).padStart(2, '0');
      lines.push(`! Trang ${pageStr}`);
    }

    panelInCurrentPage++;
    totalPanels++;
    const panelNum = `${currentPage}.${panelInCurrentPage}`;
    lines.push(`" Panel ${panelNum}: [${panel.shot}]`);

    // Ghi mô tả hành động
    if (panel.description) {
      lines.push(panel.description);
    }

    // Ghi các câu thoại, SFX, Caption
    for (const beat of panel.beats) {
      if (beat.type === 'dialogue') {
        const charName = beat.speaker || seriesBibleContext?.characters?.[0]?.name || 'Nhân vật';
        lines.push(`@${charName}: "${beat.text}"`);
      } else if (beat.type === 'sfx') {
        lines.push(`SFX: ${beat.text}`);
      } else if (beat.type === 'caption') {
        lines.push(`Caption: ${beat.text}`);
      }
    }

    lines.push(''); // Dòng trống ngăn cách các panel

    // Kiểm tra hết trang
    if (panelInCurrentPage >= targetPanelsPerPage && pIdx < generatedPanels.length - 1) {
      currentPage++;
      panelInCurrentPage = 0;
    }
  }

  const finalScriptText = lines.join('\n').trim();
  const pagesCount = Math.max(currentPage - startingPageNumber + 1, 1);

  return {
    scriptText: finalScriptText,
    pagesCount,
    panelsCount: totalPanels,
    source: 'heuristic',
  };
}


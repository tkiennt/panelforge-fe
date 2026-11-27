// src/roles/writer/components/script/flow/converter/regexScriptParser.ts
import { ConvertScriptRequest, ConvertScriptResponse, SeriesBibleContext } from './types';

export const CAMERA_ANGLES = [
  'Toàn cảnh',
  'Trung cảnh',
  'Cận cảnh',
  'Góc thấp',
  'Góc cao',
  'Cận cảnh biểu cảm',
  'Đặc tả',
  'Góc qua vai',
  'Góc nhìn POV',
];

export interface ParsedBeat {
  type: 'dialogue' | 'sfx' | 'caption' | 'action';
  speaker?: string;
  parens?: string;
  text: string;
}

/**
 * Danh sách từ khóa Dẫn chuyện / Bối cảnh / Kỹ thuật và đại từ không bao giờ là tên nhân vật
 */
export const NON_SPEAKER_NAMES = new Set([
  // Tiếng Việt - Dẫn chuyện & Bối cảnh
  'lời dẫn',
  'lời dẫn truyện',
  'dẫn chuyện',
  'dẫn',
  'người dẫn',
  'người dẫn chuyện',
  'người kể',
  'người kể chuyện',
  'lời người kể',
  'thuyết minh',
  'hộp dẫn',
  'hộp thoại',
  'hộp chữ',
  'bảng chữ',
  'bối cảnh',
  'thời gian',
  'địa điểm',
  'khung',
  'khung tranh',
  'trang',
  'ô',
  'cảnh',
  'phân cảnh',
  'âm thanh',
  'tiếng',
  'tiếng động',
  'ghi chú',
  'tiêu đề',
  'ngày',
  // Tiếng Việt - Đại từ nhân xưng
  'người',
  'anh',
  'cô',
  'bọn',
  'hắn',
  'gã',
  'y',
  'thị',
  'tôi',
  'cậu',
  'bà',
  'ông',
  'chúng',
  'ai đó',
  'mọi người',
  // Tiếng Anh - Narration & Technical cues
  'narrator',
  'narration',
  'narrative',
  'voiceover',
  'voice over',
  'voice-over',
  'vo',
  'v.o.',
  'os',
  'o.s.',
  'caption',
  'captions',
  'box',
  'text box',
  'textbox',
  'caption box',
  'title',
  'title card',
  'location',
  'time',
  'setting',
  'date',
  'panel',
  'page',
  'shot',
  'angle',
  'camera',
  'camera angle',
  'establishing shot',
  'scene',
  'sound',
  'sfx',
  'fx',
  'int',
  'ext',
  'int.',
  'ext.',
  'int/ext',
  'cut to',
  'fade in',
  'fade out',
  // Tiếng Anh - Pronouns & Articles
  'the',
  'he',
  'she',
  'they',
  'it',
  'we',
  'you',
  'someone',
  'anyone',
  'everyone',
  'nobody',
  'there',
]);

const SPEECH_VERB_REGEX =
  /(?:nói|hét(?:\s+lên)?|bảo|thì thầm|gọi|kêu(?:\s+lên)?|hỏi|đáp|trả lời|nghĩ|tự nhủ|ngẫm nghĩ|lẩm bẩm|quát(?:\s+lên)?|thốt(?:\s+lên)?|says?|said|shouts?|shouted|whispers?|whispered|asks?|asked|replies|replied|yells?|yelled|screams?|screamed|calls?|called|mutters?|muttered|thinks?|thought|cries|cried|exclaims?|exclaimed)/iu;

const THOUGHT_VERB_REGEX =
  /(?:nghĩ|suy nghĩ|tự nhủ|ngẫm nghĩ|thought|thinks?|thinking|wondered|wonders?)/iu;

/**
 * Phân tích tên nhân vật dựa trên văn bản và danh sách Series Bible
 */
export function resolveSpeaker(candidateText: string, bible?: SeriesBibleContext): { name: string; isThought?: boolean } | null {
  const characters = bible?.characters || [];
  const trimmedCandidate = candidateText.trim();
  const lower = trimmedCandidate.toLowerCase();

  // Kiểm tra nếu là từ khóa dẫn chuyện
  for (const nonSpeaker of NON_SPEAKER_NAMES) {
    if (lower === nonSpeaker || lower.startsWith(`${nonSpeaker}:`) || lower.startsWith(`${nonSpeaker} `)) {
      return null;
    }
  }

  // 1. Khớp chính xác với danh sách Series Bible
  for (const c of characters) {
    if (new RegExp(`\\b${c.name}\\b`, 'i').test(trimmedCandidate)) {
      const isThought = THOUGHT_VERB_REGEX.test(trimmedCandidate);
      return { name: c.name, isThought };
    }
  }

  // 2. Tách tên nhân vật đứng trước động từ nói (vd: "Minh nói", "Lan hét lên", "John shouted", "Arthur said", "Minh nghĩ")
  const beforeVerbMatch = trimmedCandidate.match(/^([A-ZÀ-Ỹ][\w\p{L}'-]+(?:\s+[A-ZÀ-Ỹ][\w\p{L}'-]+)*)\s+(?:nói|hét|bảo|thì thầm|gọi|hỏi|đáp|trả lời|nghĩ|tự nhủ|quát|said|says|shouted|shouts|whispered|whispers|asked|asks|replied|thought|yelled)\b/iu);
  if (beforeVerbMatch) {
    const candidateName = beforeVerbMatch[1].trim();
    if (!NON_SPEAKER_NAMES.has(candidateName.toLowerCase())) {
      const isThought = THOUGHT_VERB_REGEX.test(trimmedCandidate);
      return { name: candidateName, isThought };
    }
  }

  // 3. Tách tên nhân vật đứng sau động từ nói (vd: "said John", "whispered Lan", "nói Minh")
  const afterVerbMatch = trimmedCandidate.match(/\b(?:said|says|shouted|whispered|asked|replied|nói|bảo|thì thầm|hỏi|đáp)\s+([A-ZÀ-Ỹ][\w\p{L}'-]+(?:\s+[A-ZÀ-Ỹ][\w\p{L}'-]+)*)/iu);
  if (afterVerbMatch) {
    const candidateName = afterVerbMatch[1].trim();
    if (!NON_SPEAKER_NAMES.has(candidateName.toLowerCase())) {
      return { name: candidateName, isThought: false };
    }
  }

  // 4. Tìm danh từ riêng viết hoa tiếng Anh / tiếng Việt (vd: Minh, Lan, Hoàng, Ken, Arthur, Lancelot)
  const nameMatch = trimmedCandidate.match(/\b([A-ZÀ-Ỹ][\w\p{L}'-]+(?:\s+[A-ZÀ-Ỹ][\w\p{L}'-]+)*)\b/u);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    if (!NON_SPEAKER_NAMES.has(candidate.toLowerCase())) {
      const isThought = THOUGHT_VERB_REGEX.test(trimmedCandidate);
      return { name: candidate, isThought };
    }
  }

  return null;
}

/**
 * Trích xuất các nhịp hành động (Beats) từ đoạn văn bản thô (Tiếng Anh & Tiếng Việt)
 */
export function extractBeatsFromParagraph(paragraph: string, bible?: SeriesBibleContext): ParsedBeat[] {
  const trimmed = paragraph.trim();
  if (!trimmed) return [];

  const beats: ParsedBeat[] = [];

  // 1. Kiểm tra nếu là thẻ Dẫn chuyện / Caption / Voiceover / Bối cảnh / Slugline
  const captionPattern =
    /^(?:\[\s*)?(?:Lời dẫn truyện|Lời dẫn|Caption|Captions|Dẫn chuyện|Người dẫn chuyện|Người dẫn|Người kể chuyện|Người kể|Lời người kể|Thuyết minh|Hộp dẫn|Hộp chữ|Bảng chữ|Narrator|Narration|Narrative|Voiceover|Voice-over|Voice\s*over|V\.?O\.?|Caption\s*box|Text\s*box)(?:\s*\([^)]*\))?\s*[:\]-]\s*(.*)/iu;
  const captionMatch = trimmed.match(captionPattern);
  if (captionMatch) {
    const body = captionMatch[1].replace(/[\])]$/, '').trim();
    beats.push({ type: 'caption', text: body || trimmed });
    return beats;
  }

  // 2. Thẻ Bối cảnh / Thời gian / Slugline (Location, Time, Setting, INT., EXT.)
  const settingMatch = trimmed.match(
    /^(?:Location|Setting|Time|Date|Địa điểm|Bối cảnh|Thời gian|Ngày)\s*:\s*(.*)/iu,
  );
  if (settingMatch && settingMatch[1]) {
    beats.push({ type: 'caption', text: settingMatch[0].trim() });
    return beats;
  }

  if (/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+/i.test(trimmed)) {
    beats.push({ type: 'action', text: trimmed });
    return beats;
  }

  // 3. Cú pháp kịch bản có sẵn: @Tên: "Thoại" hoặc @Tên (cảm xúc): "Thoại"
  const explicitScriptMatch = trimmed.match(/^@([^:"“”]+?)\s*:\s*["“]([^"”]+)["”]$/u);
  if (explicitScriptMatch) {
    const rawSpeaker = explicitScriptMatch[1].trim();
    const parensMatch = rawSpeaker.match(/\(([^()]*)\)/);
    const cleanSpeaker = rawSpeaker.replace(/\s*\([^)]*\)/, '').trim();
    beats.push({
      type: 'dialogue',
      speaker: cleanSpeaker,
      parens: parensMatch ? parensMatch[1].trim() : undefined,
      text: explicitScriptMatch[2].trim(),
    });
    return beats;
  }

  // 4. SFX chuẩn: SFX: ... hoặc * BOOM * hoặc [SFX: ...]
  if (/^(?:SFX|FX|Sound|Âm\s*thanh|Tiếng\s*động)\s*:\s*(.*)/iu.test(trimmed)) {
    const match = trimmed.match(/^(?:SFX|FX|Sound|Âm\s*thanh|Tiếng\s*động)\s*:\s*(.*)/iu);
    beats.push({
      type: 'sfx',
      text: match ? match[1].replace(/\*$/, '').trim().toUpperCase() : 'TIẾNG ĐỘNG',
    });
    return beats;
  }

  if (/^\*\s*(.*?)\s*\*$/.test(trimmed)) {
    const match = trimmed.match(/^\*\s*(.*?)\s*\*$/);
    if (match && match[1]) {
      beats.push({ type: 'sfx', text: match[1].trim().toUpperCase() });
      return beats;
    }
  }

  // 5. Tách câu và phát hiện lời thoại lồng trong văn xuôi (cả dấu ngoặc kép và gạch ngang đầu dòng)
  const quoteRegex = /["“]([^"”]+)["”]/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = quoteRegex.exec(trimmed)) !== null) {
    const beforeText = trimmed.slice(lastIndex, match.index).trim();
    const dialogueContent = match[1].trim();
    const afterMatch = trimmed.slice(match.index + match[0].length);

    if (beforeText) {
      // Phân tích xem đoạn trước có chứa tên người nói không (e.g., "Minh thì thầm:" hoặc "Arthur said:")
      const speakerCandidate = resolveSpeaker(beforeText, bible);
      // Kiểm tra SFX trong ngoặc đơn (e.g., (BÙM!), (CRASH!))
      const sfxInParens = beforeText.match(/\(([^)]+!|tiếng[^)]+)\)/iu);
      if (sfxInParens) {
        beats.push({ type: 'sfx', text: sfxInParens[1].toUpperCase() });
      }

      const cleanedAction = beforeText
        .replace(/[:,-]\s*$/, '')
        .replace(/\(([^)]+!|tiếng[^)]+)\)/iu, '')
        .trim();

      if (cleanedAction) {
        beats.push({ type: 'action', text: cleanedAction });
      }

      if (speakerCandidate) {
        beats.push({
          type: 'dialogue',
          speaker: speakerCandidate.name,
          parens: speakerCandidate.isThought ? 'nghĩ' : undefined,
          text: dialogueContent,
        });
      } else {
        // Kiểm tra xem người nói có nằm ngay sau câu thoại không (vd: "Thoại," - Minh nói.)
        const afterSpeaker = resolveSpeaker(afterMatch, bible);
        const speakerName = afterSpeaker?.name || bible?.characters?.[0]?.name || 'Nhân vật';
        beats.push({
          type: 'dialogue',
          speaker: speakerName,
          parens: afterSpeaker?.isThought ? 'nghĩ' : undefined,
          text: dialogueContent,
        });
      }
    } else {
      // Thoại đứng đầu câu: người nói nằm ngay sau câu thoại (e.g., "We must hurry!" John shouted.)
      const afterSpeaker = resolveSpeaker(afterMatch, bible);
      const speakerName = afterSpeaker?.name || bible?.characters?.[0]?.name || 'Nhân vật';
      beats.push({
        type: 'dialogue',
        speaker: speakerName,
        parens: afterSpeaker?.isThought ? 'nghĩ' : undefined,
        text: dialogueContent,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Phần còn lại sau dấu ngoặc kép cuối cùng
  const remainingText = trimmed.slice(lastIndex).trim();
  if (remainingText) {
    // 1. Kiểm tra SFX trong ngoặc đơn dạng (BÙM!), (BOOM!), (Tiếng nổ...)
    const sfxInParens = remainingText.match(/\(([^)]+!|tiếng[^)]+)\)/iu);
    if (sfxInParens) {
      const sfxClean = sfxInParens[1].replace(/^\(/, '').replace(/\)$/, '').trim().toUpperCase();
      beats.push({ type: 'sfx', text: sfxClean });
    }

    // 2. Kiểm tra từ cảm thán âm thanh đứng riêng
    const sfxStandalone = remainingText.match(/([A-ZÀ-Ỹ]{2,}!|\b[a-zA-ZÀ-Ỹ]+!{2,})/);
    if (sfxStandalone && remainingText.length < 30 && !sfxInParens) {
      beats.push({ type: 'sfx', text: sfxStandalone[1].toUpperCase() });
    } else {
      // Dọn dẹp câu thoại sau khi đã tách thoại
      const cleanedAction = remainingText
        .replace(/^[-,—–]\s*/, '')
        .replace(/\(([^)]+!|tiếng[^)]+)\)/iu, '')
        .replace(SPEECH_VERB_REGEX, '')
        .trim();
      if (cleanedAction && cleanedAction.length > 3) {
        beats.push({ type: 'action', text: cleanedAction });
      }
    }
  }

  return beats.length > 0 ? beats : [{ type: 'action', text: trimmed }];
}

/**
 * Heuristic Converter: Tự động phân tích văn bản thô / văn xuôi thành Kịch bản Manga/Comic chuẩn
 * Tự động nhận diện số khung hình dựa trên nhịp beats tự nhiên của văn bản.
 */
export function convertRawTextHeuristically(request: ConvertScriptRequest): ConvertScriptResponse {
  const {
    inputContent,
    seriesBibleContext,
    startingPageNumber = 1,
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

    // Quyết định ngắt Panel: Khi có SFX, hoặc có Caption bối cảnh, hoặc thoại kèm hành động, hoặc đạt 2-3 beats
    const isLastBeat = i === allBeats.length - 1;
    const hasDialogue = currentPanelBeats.some((b) => b.type === 'dialogue');
    const hasSfx = currentPanelBeats.some((b) => b.type === 'sfx');
    const hasCaption = currentPanelBeats.some((b) => b.type === 'caption');

    if (
      isLastBeat ||
      hasSfx ||
      hasCaption ||
      (hasDialogue && currentPanelBeats.length >= 2) ||
      currentPanelBeats.length >= 3
    ) {
      const shot = CAMERA_ANGLES[shotIndex % CAMERA_ANGLES.length];
      shotIndex++;

      // Trích xuất mô tả hành động từ action beats
      const actionTexts = currentPanelBeats.filter((b) => b.type === 'action').map((b) => b.text);
      const description = actionTexts.join(' ') || 'Quan sát khung cảnh.';

      generatedPanels.push({
        shot,
        description,
        beats: [...currentPanelBeats],
      });
      currentPanelBeats = [];
    }
  }

  // Đảm bảo tối thiểu 1 panel
  if (generatedPanels.length === 0 && allBeats.length > 0) {
    generatedPanels.push({
      shot: 'Toàn cảnh',
      description: 'Khung cảnh bắt đầu.',
      beats: [...allBeats],
    });
  }

  // Xuất thành định dạng văn bản Comic Script chuẩn (Manga Pacing: ~4 panel mỗi trang)
  const PANELS_PER_PAGE = 4;
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
        const parensTag = beat.parens ? ` (${beat.parens})` : '';
        lines.push(`@${charName}${parensTag}: "${beat.text}"`);
      } else if (beat.type === 'sfx') {
        lines.push(`SFX: ${beat.text}`);
      } else if (beat.type === 'caption') {
        lines.push(`Caption: ${beat.text}`);
      }
    }

    lines.push(''); // Dòng trống ngăn cách các panel

    // Tự động phân trang tự nhiên
    if (panelInCurrentPage >= PANELS_PER_PAGE && pIdx < generatedPanels.length - 1) {
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

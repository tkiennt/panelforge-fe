// src/roles/writer/components/script/flow/converter/aiScriptService.ts
import { ConvertScriptRequest, ConvertScriptResponse } from './types';
import { convertRawTextHeuristically } from './regexScriptParser';

const COMIC_SCRIPT_SYSTEM_PROMPT = `Bạn là một Chuyên gia Biên kịch Truyện tranh & Manga/Webtoon hàng đầu.
Nhiệm vụ của bạn là chuyển đổi văn bản thô (trích đoạn tiểu thuyết, bản thảo thô) hoặc phát triển ý tưởng/prompt thành KỊCH BẢN TRUYỆN TRANH CHUẨN HOÁ theo quy tắc cú pháp nghiêm ngặt sau:

### 1. QUY TẮC CÚ PHÁP BẮT BUỘC (STRICT SYNTAX):
- Mỗi Trang bắt đầu bằng dòng:
  ! Trang <Số_Trang_2_Chữ_Số> (Ví dụ: ! Trang 01, ! Trang 02)
- Mỗi Khung hình (Panel) bắt đầu bằng dòng:
  " Panel <SốTrang>.<SốThứTự>: [<Góc_Máy>] (Ví dụ: " Panel 1.1: [Toàn cảnh], " Panel 1.2: [Cận cảnh])
- Lời thoại nhân vật: BẮT BUỘC dùng tiền tố @ và đặt lời thoại trong cặp dấu ngoặc kép:
  @<Tên_Nhân_Vật>: "<Lời thoại>" (Ví dụ: @Minh: "Chúng ta phải rời khỏi đây ngay!")
- Hiệu ứng âm thanh (SFX):
  SFX: <TÊN_ÂM_THANH_VIẾT_HOA> (Ví dụ: SFX: TIẾNG NỔ LỚN, SFX: XOẸT!)
- Lời dẫn truyện:
  Caption: <Văn bản dẫn truyện> (Ví dụ: Caption: Màn đêm dần bao phủ ngã tư Shibuya...)
- Chỉ dẫn hành động & bối cảnh: Viết thành đoạn văn ngắn gọn, trực quan, mô tả 1 hành động tĩnh cụ thể.

### 2. TƯ DUY HÌNH ẢNH (VISUAL THINKING):
- Chia nhỏ văn xuôi thành các nhịp hình ảnh tĩnh (Mỗi Panel là một khoảnh khắc bấm máy rõ nét).
- Nhịp điệu khung hình: Panel đầu trang thường là [Toàn cảnh] thiết lập không gian, các panel sau luân phiên [Trung cảnh], [Cận cảnh], [Góc thấp], [Góc cao].
- Trung bình 4 - 5 panel trên mỗi trang truyện.

### 3. ĐỊNH DẠNG ĐẦU RA:
- CHỈ TRẢ VỀ VĂN BẢN KỊCH BẢN THUẦN TÚY.
- TUYỆT ĐỐI KHÔNG thêm lời chào, không bọc trong markdown code block (\`\`\`), không giải thích ngoài lề.`;

/**
 * Gọi Gemini REST API trực tiếp nếu có API key
 */
async function callGeminiApi(request: ConvertScriptRequest, apiKey: string): Promise<string> {
  const charactersList =
    request.seriesBibleContext?.characters?.map((c) => c.name).join(', ') || 'Chưa có';
  const locationsList = request.seriesBibleContext?.locations?.join(', ') || 'Chưa có';
  const startPage = request.startingPageNumber || 1;
  const panelsPerPage = request.targetPanelsPerPage || 4;

  const userPrompt = `
HÃY CHUYỂN ĐỔI / VIẾT KỊCH BẢN CHO NỘI DUNG SAU:
${request.inputContent}

THÔNG TIN BỐI CẢNH & NHÂN VẬT SERIES BIBLE:
- Danh sách nhân vật chính thức: ${charactersList}
- Địa danh bối cảnh: ${locationsList}
- Bắt đầu từ Trang số: ${startPage}
- Số panel mong muốn mỗi trang: ${panelsPerPage} panel

Hãy tạo kịch bản theo đúng cú pháp chuẩn (! Trang XX, " Panel X.Y: [Góc máy], @NhânVật: "...", SFX: ..., Caption: ...).
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: COMIC_SCRIPT_SYSTEM_PROMPT }],
        },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorBody}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Không nhận được phản hồi hợp lệ từ mô hình AI.');
  }

  // Loại bỏ các thẻ code block ```markdown nếu AI sinh thừa
  return text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

/**
 * Dịch vụ chuyển đổi chính: Tự động điều phối giữa Gemini AI và Heuristic Parser
 */
export async function convertToComicScript(
  request: ConvertScriptRequest,
): Promise<ConvertScriptResponse> {
  // 1. Kiểm tra API Key từ request hoặc localStorage
  let apiKey = request.apiKey;
  if (!apiKey && typeof window !== 'undefined') {
    apiKey =
      localStorage.getItem('panelforge_gemini_api_key') ||
      localStorage.getItem('gemini_api_key') ||
      undefined;
  }

  // 2. Nếu có API Key, thử gọi Gemini trước
  if (apiKey) {
    try {
      const generatedText = await callGeminiApi(request, apiKey);
      const pageMatches = generatedText.match(/^(?:[!#📄]?\s*(?:Trang|Page)\s*\d+)/gim) || [];
      const panelMatches = generatedText.match(/^(?:[-"”]\s*)?(?:Panel|Khung)\s*[\d.]+/gim) || [];

      return {
        scriptText: generatedText,
        pagesCount: Math.max(pageMatches.length, 1),
        panelsCount: Math.max(panelMatches.length, 1),
        source: 'gemini',
      };
    } catch (err: any) {
      console.warn(
        '[AI Convert] Gemini API gặp sự cố, tự động kích hoạt Heuristic Fallback:',
        err.message,
      );
      // Fallback ngay về bộ phân tích Heuristic nếu gọi API thất bại
    }
  }

  // 3. Fallback Heuristic Parser chạy offline tốc độ cao O(1)
  return convertRawTextHeuristically(request);
}

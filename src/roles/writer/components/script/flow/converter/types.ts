// src/roles/writer/components/script/flow/converter/types.ts

export interface SeriesBibleContext {
  characters?: { name: string; role?: string; avatarUrl?: string }[];
  locations?: string[];
}

export interface ConvertScriptRequest {
  mode: 'convert_raw_text' | 'generate_from_prompt';
  inputContent: string;
  seriesBibleContext?: SeriesBibleContext;
  startingPageNumber?: number; // Mặc định từ trang 1 hoặc trang kế tiếp
  targetPanelsPerPage?: number; // Số khung hình mỗi trang (mặc định 4 - 6)
  apiKey?: string; // Tùy chọn: API Key trực tiếp nếu người dùng muốn dùng Gemini
}

export interface ConvertScriptResponse {
  scriptText: string;
  pagesCount: number;
  panelsCount: number;
  source: 'gemini' | 'heuristic';
}


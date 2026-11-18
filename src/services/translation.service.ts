import axiosClient from '../api/axiosClient';

export interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslateResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Gọi POST /api/translations/translate để dịch văn bản giữa tiếng Anh và tiếng Việt bằng LibreTranslate.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  if (!text || !text.trim() || sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    return text;
  }

  const response = await axiosClient.post<TranslateResponse>('/translations/translate', {
    text,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  });

  return response.data?.translatedText ?? text;
}

export const translationService = {
  translateText,
};

export default translationService;

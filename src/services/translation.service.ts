import axiosClient from '../api/axiosClient';

export const SUPPORTED_AUTO_TRANSLATE_LANGUAGES = ['en', 'vi'] as const;

export function isAutoTranslateSupportedPair(
  sourceLang?: string | null,
  targetLang?: string | null,
): boolean {
  if (!sourceLang || !targetLang) return false;
  const src = sourceLang.trim().toLowerCase();
  const tgt = targetLang.trim().toLowerCase();
  const supported = new Set<string>(SUPPORTED_AUTO_TRANSLATE_LANGUAGES);
  return supported.has(src) && supported.has(tgt) && src !== tgt;
}

export interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslateResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isFallback?: boolean;
}

export interface TranslateResult {
  text: string;
  isFallback: boolean;
}

/**
 * Gọi POST /api/translations/translate để dịch văn bản giữa tiếng Anh và tiếng Việt bằng LibreTranslate.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResult> {
  if (!text || !text.trim() || sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    return { text, isFallback: false };
  }

  const response = await axiosClient.post<TranslateResponse>('/translations/translate', {
    text,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  });

  return {
    text: response.data?.translatedText ?? text,
    isFallback: Boolean(response.data?.isFallback),
  };
}

export const translationService = {
  translateText,
  SUPPORTED_AUTO_TRANSLATE_LANGUAGES,
  isAutoTranslateSupportedPair,
};

export default translationService;

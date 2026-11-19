import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import {
  SUPPORTED_AUTO_TRANSLATE_LANGUAGES,
  isAutoTranslateSupportedPair,
  translateText,
  translationService,
} from './translation.service';

vi.mock('../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('translationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi đúng endpoint POST /translations/translate và trả về { text, isFallback: false }', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: {
        translatedText: 'Hello world',
        sourceLanguage: 'vi',
        targetLanguage: 'en',
        isFallback: false,
      },
    });

    const result = await translateText('Xin chào thế giới', 'vi', 'en');

    expect(axiosClient.post).toHaveBeenCalledWith('/translations/translate', {
      text: 'Xin chào thế giới',
      sourceLanguage: 'vi',
      targetLanguage: 'en',
    });
    expect(result).toEqual({ text: 'Hello world', isFallback: false });
  });

  it('trả về isFallback: true khi dịch vụ LibreTranslate fallback về câu gốc', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: {
        translatedText: 'Xin chào thế giới',
        sourceLanguage: 'vi',
        targetLanguage: 'en',
        isFallback: true,
      },
    });

    const result = await translateText('Xin chào thế giới', 'vi', 'en');

    expect(result).toEqual({ text: 'Xin chào thế giới', isFallback: true });
  });

  it('trả về nguyên văn nếu text rỗng hoặc chỉ có khoảng trắng mà không gọi API', async () => {
    const r1 = await translateText('', 'vi', 'en');
    const r2 = await translateText('   ', 'vi', 'en');

    expect(r1).toEqual({ text: '', isFallback: false });
    expect(r2).toEqual({ text: '   ', isFallback: false });
    expect(axiosClient.post).not.toHaveBeenCalled();
  });

  it('trả về nguyên văn nếu sourceLang trùng targetLang mà không gọi API', async () => {
    const result = await translateText('Không đổi', 'VI', 'vi');

    expect(result).toEqual({ text: 'Không đổi', isFallback: false });
    expect(axiosClient.post).not.toHaveBeenCalled();
  });

  it('bắn lỗi ra ngoài khi axiosClient.post gặp lỗi mạng hoặc HTTP error', async () => {
    vi.mocked(axiosClient.post).mockRejectedValueOnce(new Error('Network error'));

    await expect(translationService.translateText('Test', 'en', 'vi')).rejects.toThrow(
      'Network error',
    );
  });

  it('kiểm tra đúng cặp ngôn ngữ được hỗ trợ dịch tự động (chỉ en ↔ vi)', () => {
    expect(SUPPORTED_AUTO_TRANSLATE_LANGUAGES).toEqual(['en', 'vi']);
    expect(isAutoTranslateSupportedPair('vi', 'en')).toBe(true);
    expect(isAutoTranslateSupportedPair('EN', 'VI')).toBe(true);
    expect(isAutoTranslateSupportedPair('vi', 'ja')).toBe(false);
    expect(isAutoTranslateSupportedPair('en', 'ja')).toBe(false);
    expect(isAutoTranslateSupportedPair('vi', 'vi')).toBe(false);
  });
});

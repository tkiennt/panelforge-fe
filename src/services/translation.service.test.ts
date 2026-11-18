import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { translateText, translationService } from './translation.service';

vi.mock('../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('translationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi đúng endpoint POST /translations/translate và trả về translatedText', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: {
        translatedText: 'Hello world',
        sourceLanguage: 'vi',
        targetLanguage: 'en',
      },
    });

    const result = await translateText('Xin chào thế giới', 'vi', 'en');

    expect(axiosClient.post).toHaveBeenCalledWith('/translations/translate', {
      text: 'Xin chào thế giới',
      sourceLanguage: 'vi',
      targetLanguage: 'en',
    });
    expect(result).toBe('Hello world');
  });

  it('trả về nguyên văn nếu text rỗng hoặc chỉ có khoảng trắng mà không gọi API', async () => {
    const r1 = await translateText('', 'vi', 'en');
    const r2 = await translateText('   ', 'vi', 'en');

    expect(r1).toBe('');
    expect(r2).toBe('   ');
    expect(axiosClient.post).not.toHaveBeenCalled();
  });

  it('trả về nguyên văn nếu sourceLang trùng targetLang mà không gọi API', async () => {
    const result = await translateText('Không đổi', 'VI', 'vi');

    expect(result).toBe('Không đổi');
    expect(axiosClient.post).not.toHaveBeenCalled();
  });

  it('bắn lỗi ra ngoài khi axiosClient.post gặp lỗi mạng hoặc HTTP error', async () => {
    vi.mocked(axiosClient.post).mockRejectedValueOnce(new Error('Network error'));

    await expect(translationService.translateText('Test', 'en', 'vi')).rejects.toThrow(
      'Network error',
    );
  });
});

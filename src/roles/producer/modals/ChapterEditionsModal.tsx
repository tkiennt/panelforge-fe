import React, { useState, useEffect, useCallback } from 'react';
import { X, Globe, CheckCircle2, Send, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterEditionService,
  type ChapterEditionDto,
  type EditionStatus,
} from '@/services/chapter-edition.service';
import type { ChapterDto } from '@/services/chapter.service';

export interface ChapterEditionsModalProps {
  isOpen: boolean;
  chapter: ChapterDto | null;
  onClose: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

const STATUS_CONFIG: Record<
  EditionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  Draft: {
    label: 'Bản nháp',
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
  },
  InReview: {
    label: 'Chờ Editor duyệt',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  EditorApproved: {
    label: 'Editor đã duyệt',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  Approved: {
    label: 'Producer đã duyệt',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  Published: {
    label: 'Đã phát hành',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export const ChapterEditionsModal: React.FC<ChapterEditionsModalProps> = ({
  isOpen,
  chapter,
  onClose,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [editions, setEditions] = useState<ChapterEditionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reopenModal, setReopenModal] = useState<{ lang: string; isOpen: boolean }>({
    lang: '',
    isOpen: false,
  });
  const [reopenReason, setReopenReason] = useState('');

  const loadEditions = useCallback(async () => {
    if (!chapter?.id) return;
    setLoading(true);
    try {
      const data = await chapterEditionService.getChapterEditions(chapter.id);
      setEditions(data);
    } catch (err: any) {
      onShowToast?.('Lỗi nạp ấn bản', err.message);
    } finally {
      setLoading(false);
    }
  }, [chapter?.id, onShowToast]);

  useEffect(() => {
    if (isOpen && chapter?.id) {
      loadEditions();
    }
  }, [isOpen, chapter?.id, loadEditions]);

  if (!isOpen || !chapter) return null;

  const handleApproveEdition = async (lang: string) => {
    setActionLoading(`approve-${lang}`);
    try {
      await chapterEditionService.approveEdition(chapter.id, lang);
      onShowToast?.(
        'Đã nghiệm thu ấn bản',
        `Ấn bản ${lang.toUpperCase()} đã chuyển sang trạng thái Approved (Chờ phát hành).`,
      );
      await loadEditions();
    } catch (err: any) {
      onShowToast?.('Lỗi duyệt ấn bản', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishEdition = async (lang: string) => {
    setActionLoading(`publish-${lang}`);
    try {
      await chapterEditionService.publishEdition(chapter.id, lang);
      onShowToast?.(
        'Đã phát hành ấn bản',
        `Ấn bản ${lang.toUpperCase()} đã phát hành cho độc giả thành công.`,
      );
      await loadEditions();
    } catch (err: any) {
      onShowToast?.('Lỗi phát hành ấn bản', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) {
      onShowToast?.('Yêu cầu lý do', 'Vui lòng nhập lý do mở lại ấn bản.');
      return;
    }
    const lang = reopenModal.lang;
    setActionLoading(`reopen-${lang}`);
    try {
      await chapterEditionService.reopenEdition(chapter.id, lang, { reason: reopenReason.trim() });
      onShowToast?.('Đã mở lại ấn bản', `Ấn bản ${lang.toUpperCase()} đã được chuyển về Draft.`);
      setReopenModal({ lang: '', isOpen: false });
      setReopenReason('');
      await loadEditions();
    } catch (err: any) {
      onShowToast?.('Lỗi mở lại ấn bản', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="chapter-editions-modal"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#FAF9F5] border border-stone-200/80 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col text-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-stone-900">
                Ấn Bản Đa Ngôn Ngữ — Chương {chapter.chapterNumber}
              </h2>
              <p className="text-xs text-stone-500 font-sans">
                {chapter.title || 'Không tiêu đề'} • Quản lý quy trình kiểm duyệt và phát hành ấn bản dịch (BR-34)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadEditions}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 transition-colors cursor-pointer"
              title="Làm mới danh sách ấn bản"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-600 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-stone-200 rounded-xl bg-white shadow-2xs">
          {loading && editions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
              <span>Đang tải danh sách ấn bản...</span>
            </div>
          ) : editions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              Chưa có ấn bản ngôn ngữ nào cho chương này.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-mono">
                  <th className="py-2.5 px-4 font-semibold">Ngôn ngữ</th>
                  <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                  <th className="py-2.5 px-3 font-semibold">Người dịch</th>
                  <th className="py-2.5 px-3 font-semibold">Người duyệt</th>
                  <th className="py-2.5 px-3 font-semibold">Phiên bản</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {editions.map((ed) => {
                  const cfg = STATUS_CONFIG[ed.status] || STATUS_CONFIG.Draft;
                  const langName = LANGUAGE_NAMES[ed.languageCode.toLowerCase()] || ed.languageCode;
                  const isApproveBusy = actionLoading === `approve-${ed.languageCode}`;
                  const isPublishBusy = actionLoading === `publish-${ed.languageCode}`;
                  const canApprove = ed.status === 'EditorApproved';
                  const canPublish = ed.status === 'Approved';
                  const canReopen =
                    ed.status === 'Approved' ||
                    ed.status === 'Published' ||
                    ed.status === 'EditorApproved';

                  return (
                    <tr
                      key={ed.languageCode}
                      data-testid={`edition-row-${ed.languageCode}`}
                      className="hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-xs">
                            {ed.languageCode}
                          </span>
                          <span className="text-stone-700 font-medium">{langName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {ed.translatorName || '—'}
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {ed.approvedByName || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        v{ed.version}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApprove && (
                            <button
                              type="button"
                              onClick={() => handleApproveEdition(ed.languageCode)}
                              disabled={Boolean(actionLoading)}
                              data-testid={`approve-edition-${ed.languageCode}`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Producer duyệt hoàn tất bản dịch"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isApproveBusy ? 'Đang duyệt...' : 'Nghiệm thu'}</span>
                            </button>
                          )}
                          {canPublish && (
                            <button
                              type="button"
                              onClick={() => handlePublishEdition(ed.languageCode)}
                              disabled={Boolean(actionLoading)}
                              data-testid={`publish-edition-${ed.languageCode}`}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Phát hành ấn bản dịch cho độc giả"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isPublishBusy ? 'Đang phát hành...' : 'Phát hành'}</span>
                            </button>
                          )}
                          {canReopen && (
                            <button
                              type="button"
                              onClick={() =>
                                setReopenModal({ lang: ed.languageCode, isOpen: true })
                              }
                              disabled={Boolean(actionLoading)}
                              data-testid={`reopen-edition-${ed.languageCode}`}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              title="Mở lại ấn bản về Draft để chỉnh sửa"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>Mở lại</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs text-stone-500 shrink-0">
          <p>
            * Chỉ các ấn bản ở trạng thái <strong>Đã phát hành</strong> mới hiển thị trên Reader công khai.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Reopen Reason Prompt Modal */}
      {reopenModal.isOpen && (
        <div
          data-testid="reopen-edition-modal"
          className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base text-stone-900">
                Mở lại ấn bản {reopenModal.lang.toUpperCase()}
              </h3>
            </div>
            <p className="text-xs text-stone-600">
              Ấn bản sẽ quay về trạng thái <strong>Bản nháp (Draft)</strong> để dịch giả chỉnh sửa lại. Vui lòng ghi rõ lý do mở lại:
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Ví dụ: Cần sửa lại lời thoại trang 3 và kiểm tra tràn khung..."
              className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-stone-900"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReopenModal({ lang: '', isOpen: false });
                  setReopenReason('');
                }}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                disabled={!reopenReason.trim()}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Xác nhận mở lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

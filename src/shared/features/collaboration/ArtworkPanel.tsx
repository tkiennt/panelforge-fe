import React, { useRef, useState } from 'react';
import { Eye, ImageIcon, Loader2, Upload } from 'lucide-react';
import type { AssetReferenceDto } from '@/types';
import { artworkService, computeFileSha256, resolveArtworkUrl } from '@/services/artwork.service';
import { errorMessage } from './collaborationRules';

/** Khớp giới hạn của Backend (25 MB, PNG/JPEG/WebP); Backend vẫn kiểm lại nội dung thật. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

interface ArtworkPanelProps {
  chapterId: string;
  pageId: string | null;
  stageId: string;
  artworks: AssetReferenceDto[];
  canUpload: boolean;
  onChanged: () => void;
  onToast?: (title: string, desc: string) => void;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Artwork của một Page ở một stage (CF2 bước 10). Client tính SHA-256 rồi gửi kèm; Backend tính lại và từ chối nếu lệch (BR-04).
 * Ảnh chỉ xem qua link ngắn hạn xin theo từng lần bấm "Xem" (BR-16), không có URL công khai.
 */
export const ArtworkPanel: React.FC<ArtworkPanelProps> = ({
  chapterId,
  pageId,
  stageId,
  artworks,
  canUpload,
  onChanged,
  onToast,
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'hashing' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const mine = artworks
    .filter((a) => a.pageId === pageId && a.pipelineStageId === stageId)
    .sort((a, b) => a.versionNumber - b.versionNumber);

  const handleFile = async (file: File | undefined) => {
    if (!file || !pageId) return;
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError('Chỉ nhận ảnh PNG, JPEG hoặc WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File vượt giới hạn 25 MB.');
      return;
    }

    try {
      setPhase('hashing');
      const sha256 = await computeFileSha256(file);
      setPhase('uploading');
      const result = await artworkService.uploadArtwork(chapterId, pageId, file, stageId, sha256);
      onToast?.(
        `Đã tải artwork v${result.versionNumber}`,
        result.reused
          ? 'Nội dung đã có trong Workspace nên không tốn thêm dung lượng.'
          : `${result.fileName} (${formatSize(result.sizeBytes)})`,
      );
      onChanged();
    } catch (err) {
      const msg = errorMessage(err, 'Không thể tải artwork lên.');
      setError(msg);
      onToast?.('Tải artwork thất bại', msg);
    } finally {
      setPhase('idle');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handlePreview = async (art: AssetReferenceDto) => {
    if (previews[art.id]) {
      setPreviews((p) => {
        const { [art.id]: _removed, ...rest } = p;
        return rest;
      });
      return;
    }
    setPreviewLoading(art.id);
    setError(null);
    try {
      const link = await artworkService.getArtworkAccessLink(chapterId, art.id);
      setPreviews((p) => ({ ...p, [art.id]: resolveArtworkUrl(link.url) }));
    } catch (err) {
      setError(errorMessage(err, 'Không thể xin link xem artwork.'));
    } finally {
      setPreviewLoading(null);
    }
  };

  const busy = phase !== 'idle';

  return (
    <div className='space-y-2' data-testid='artwork-panel'>
      <div className='flex items-center justify-between gap-2'>
        <span className='flex items-center gap-1.5 text-[11px] font-bold text-[#171717]'>
          <ImageIcon className='w-3.5 h-3.5 text-[#F97316]' />
          Artwork của trang ({mine.length} phiên bản)
        </span>

        {canUpload && (
          <>
            <input
              ref={fileInput}
              type='file'
              accept={ACCEPTED.join(',')}
              className='hidden'
              data-testid='artwork-file-input'
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <button
              type='button'
              disabled={busy || !pageId}
              onClick={() => fileInput.current?.click()}
              className='px-2.5 py-1 rounded-lg bg-[#171717] hover:bg-black text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer'
            >
              {busy ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Upload className='w-3 h-3 text-[#F97316]' />
              )}
              <span>
                {phase === 'hashing'
                  ? 'Đang tính SHA-256…'
                  : phase === 'uploading'
                    ? 'Đang tải lên…'
                    : 'Tải artwork lên'}
              </span>
            </button>
          </>
        )}
      </div>

      {!pageId && canUpload && (
        <p className='text-[11px] text-amber-700'>
          Chưa xác định được trang của việc này (việc cấp Panel cần có Panel đã bắt đầu).
        </p>
      )}

      {error && (
        <div
          role='alert'
          className='p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px]'
        >
          {error}
        </div>
      )}

      {mine.length === 0 ? (
        <p className='text-[11px] text-[#888888]'>Chưa có artwork nào ở công đoạn này.</p>
      ) : (
        <ul className='space-y-1.5'>
          {mine.map((art) => (
            <li
              key={art.id}
              className='p-2 rounded-lg bg-[#FAF8F5] border border-[#F0ECE1] text-[11px] space-y-1.5'
            >
              <div className='flex items-center justify-between gap-2'>
                <div className='min-w-0'>
                  <span className='font-mono font-bold'>v{art.versionNumber}</span>{' '}
                  <span className='truncate'>{art.fileName}</span>
                  <div className='text-[#737373] font-mono'>
                    {formatSize(art.sizeBytes)} · sha256 {art.sha256.slice(0, 10)}… ·{' '}
                    {new Date(art.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => void handlePreview(art)}
                  disabled={previewLoading === art.id}
                  className='px-2 py-1 rounded-lg border border-[#E7E7E7] bg-white hover:bg-zinc-50 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer shrink-0'
                >
                  {previewLoading === art.id ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <Eye className='w-3 h-3' />
                  )}
                  <span>{previews[art.id] ? 'Ẩn' : 'Xem'}</span>
                </button>
              </div>
              {previews[art.id] && (
                <img
                  src={previews[art.id]}
                  alt={`Artwork v${art.versionNumber} của ${art.fileName}`}
                  className='max-h-72 w-auto rounded border border-[#E7E7E7] bg-white'
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

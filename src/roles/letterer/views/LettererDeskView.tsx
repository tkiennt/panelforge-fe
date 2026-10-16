import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Type, FileImage } from 'lucide-react';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { pageService, PageDto } from '@/services/page.service';
import { LetteringWorkspace } from './LetteringWorkspace';

export default function LettererDeskView() {
  const { seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');
  const pageIdFromUrl = searchParams.get('pageId');

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(chapterIdFromUrl || null);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(pageIdFromUrl || null);

  useEffect(() => {
    if (!seriesId) return;
    chapterService
      .getChaptersBySeries(seriesId, 1, 50)
      .then((res) => {
        setChapters(res.items);
        if (res.items.length > 0 && !currentChapterId) {
          setCurrentChapterId(res.items[0].id);
        }
      })
      .catch(console.error);
  }, [seriesId, currentChapterId]);

  useEffect(() => {
    if (!currentChapterId) {
      setPages([]);
      setCurrentPageId(null);
      return;
    }
    pageService
      .getPagesByChapter(currentChapterId)
      .then((res) => {
        setPages(res);
        if (res.length > 0) {
          const matched = res.find((p) => p.id === pageIdFromUrl);
          setCurrentPageId(matched ? matched.id : res[0].id);
        } else {
          setCurrentPageId(null);
        }
      })
      .catch(console.error);
  }, [currentChapterId, pageIdFromUrl]);

  return (
    <div className='flex flex-col h-full bg-[#f5f5f5] text-[#0c0a09] font-sans overflow-hidden'>
      {/* Header with Chapter & Page Selectors */}
      <div className='flex flex-wrap items-center justify-between px-4 py-2 border-b border-[#e7e5e4] bg-[#fafafa]/90 backdrop-blur-md shrink-0 gap-2 shadow-soft-sm'>
        <div className='flex items-center gap-2.5'>
          <div className='w-8 h-8 rounded-full bg-[#292524] text-white flex items-center justify-center shadow-soft-sm'>
            <Type className='w-4 h-4' />
          </div>
          <h2
            className='text-xs font-semibold tracking-tight text-[#0c0a09]'
            title='Balloon Placement • Script Anchoring • Concurrency Control (BR-11, NFR-09)'
          >
            Letterer Desk
          </h2>
        </div>

        <div className='flex items-center gap-3 flex-wrap'>
          {/* Chapter Selector */}
          {chapters.length > 0 && (
            <div className='flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-[#e7e5e4] text-xs shadow-soft-sm'>
              <BookOpen className='w-3.5 h-3.5 text-blue-600' />
              <label htmlFor='letterer-chapter-select' className='text-[#777169] font-medium'>
                Chương:
              </label>
              <select
                id='letterer-chapter-select'
                value={currentChapterId || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCurrentChapterId(newId);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('chapterId', newId);
                    return p;
                  });
                }}
                className='bg-transparent text-xs font-medium text-[#0c0a09] outline-none cursor-pointer'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chương {c.chapterNumber}
                    {c.title ? `: ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Page Selector */}
          {pages.length > 0 && (
            <div className='flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-[#e7e5e4] text-xs shadow-soft-sm'>
              <FileImage className='w-3.5 h-3.5 text-emerald-600' />
              <label htmlFor='letterer-page-select' className='text-[#777169] font-medium'>
                Trang:
              </label>
              <select
                id='letterer-page-select'
                value={currentPageId || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCurrentPageId(newId);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('pageId', newId);
                    return p;
                  });
                }}
                className='bg-transparent text-xs font-medium text-[#0c0a09] outline-none cursor-pointer'
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    Trang {p.pageNumber} ({p.widthPx}x{p.heightPx})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Lettering Workspace */}
      <div className='flex-1 overflow-hidden'>
        <LetteringWorkspace
          pageId={currentPageId || undefined}
          chapterId={currentChapterId || undefined}
          seriesId={seriesId || undefined}
        />
      </div>
    </div>
  );
}

export { LettererDeskView as LettererWorkspace };

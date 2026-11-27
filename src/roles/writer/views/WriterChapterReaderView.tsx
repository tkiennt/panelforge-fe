import React from 'react';
import {
  ChapterReaderView,
  type ChapterReaderViewProps,
} from '@/shared/features/chapter-reader/ChapterReaderView';

export type WriterChapterReaderViewProps = Omit<ChapterReaderViewProps, 'readerRole'>;

export const WriterChapterReaderView: React.FC<WriterChapterReaderViewProps> = (props) => (
  <ChapterReaderView {...props} readerRole='writer' />
);

export default WriterChapterReaderView;

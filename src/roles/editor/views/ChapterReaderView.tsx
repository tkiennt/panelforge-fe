import React from 'react';
import {
  ChapterReaderView as SharedChapterReaderView,
  type ChapterReaderViewProps as SharedChapterReaderViewProps,
} from '@/shared/features/chapter-reader/ChapterReaderView';

export type ChapterReaderViewProps = Omit<SharedChapterReaderViewProps, 'readerRole'>;

export const ChapterReaderView: React.FC<ChapterReaderViewProps> = (props) => (
  <SharedChapterReaderView {...props} readerRole='editor' />
);

export default ChapterReaderView;

import React from 'react';
import {
  ChapterReaderView,
  type ChapterReaderViewProps,
} from '@/shared/features/chapter-reader/ChapterReaderView';

export type ProducerChapterReaderViewProps = Omit<ChapterReaderViewProps, 'readerRole'>;

export const ProducerChapterReaderView: React.FC<ProducerChapterReaderViewProps> = (props) => (
  <ChapterReaderView {...props} readerRole='producer' />
);

export default ProducerChapterReaderView;

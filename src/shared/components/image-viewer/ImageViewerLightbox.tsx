import React from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';

export interface ImageViewerSlide {
  src: string;
  title?: string;
  description?: string;
  alt?: string;
}

export interface ImageViewerLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  slides: ImageViewerSlide[];
  index?: number;
  onIndexChange?: (index: number) => void;
}

/**
 * Trình xem ảnh Lightbox toàn màn hình, hỗ trợ:
 * - Zoom mượt mà bằng cuộn chuột, pinch cảm ứng hoặc double click (plugin Zoom)
 * - Chế độ toàn màn hình Fullscreen
 * - Đóng bằng phím Escape hoặc click nền
 */
export const ImageViewerLightbox: React.FC<ImageViewerLightboxProps> = ({
  isOpen,
  onClose,
  slides,
  index = 0,
  onIndexChange,
}) => {
  if (!isOpen || slides.length === 0) return null;

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      index={index}
      on={{ view: ({ index: i }) => onIndexChange?.(i) }}
      slides={slides.map((s) => ({
        src: s.src,
        alt: s.alt || s.title,
        title: s.title,
        description: s.description,
      }))}
      plugins={[Zoom, Fullscreen]}
      controller={{ closeOnBackdropClick: true }}
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 1.5,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: true,
      }}
      styles={{
        container: { backgroundColor: 'rgba(10, 10, 12, 0.92)' },
      }}
    />
  );
};

import React from 'react';
import { ElementSnapshotDto } from '@/services/element.service';

interface Props {
  elements: ElementSnapshotDto[];
  visible: boolean;
  pageWidth: number;
  pageHeight: number;
}

/**
 * ReadingFlowOverlay:
 * Mô phỏng luồng đọc mắt (Vector Guide Line) nối từ Bóng 1 -> Bóng 2 -> Bóng 3
 * theo thứ tự đọc chuẩn (Right-to-Left cho Manga hoặc Top-to-Bottom cho Webtoon),
 * giúp Letterer thẩm định xem độc giả có bị rối mắt hay đọc ngược thứ tự hay không.
 */
export const ReadingFlowOverlay: React.FC<Props> = ({
  elements,
  visible,
  pageWidth,
  pageHeight,
}) => {
  if (!visible) return null;

  // Lọc các bóng thoại thực tế
  const balloonTypes = ['SPEECH_BALLOON', 'THOUGHT_BALLOON', 'NARRATION_BOX'];
  const balloons = elements
    .filter((e) => !e.isRemoved && balloonTypes.includes(e.elementType))
    .sort((a, b) => (a.readingOrder ?? a.y) - (b.readingOrder ?? b.y));

  if (balloons.length < 2) return null;

  // Chuyển tọa độ tâm của từng bóng thành SVG Points
  const points = balloons.map((b) => {
    const isPercent = b.x <= 100 && b.y <= 100 && b.width <= 100;
    const cx = isPercent ? (b.x + b.width / 2) * (pageWidth / 100) : b.x + b.width / 2;
    const cy = isPercent ? (b.y + b.height / 2) * (pageHeight / 100) : b.y + b.height / 2;
    return { x: cx, y: cy };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    // Vẽ đường cong nhẹ giữa các bóng
    const prev = points[idx - 1];
    const mx = (prev.x + pt.x) / 2;
    const my = (prev.y + pt.y) / 2;
    return `${acc} Q ${prev.x} ${my}, ${pt.x} ${pt.y}`;
  }, '');

  return (
    <svg
      data-testid='reading-flow-overlay'
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      className='absolute inset-0 w-full h-full pointer-events-none z-30 select-none'
    >
      <defs>
        <marker
          id='arrow-flow'
          viewBox='0 0 10 10'
          refX='5'
          refY='5'
          markerWidth='6'
          markerHeight='6'
          orient='auto-start-reverse'
        >
          <path d='M 0 0 L 10 5 L 0 10 z' fill='#8B5CF6' />
        </marker>
      </defs>

      {/* Đường nối luồng đọc mắt */}
      <path
        d={pathD}
        fill='none'
        stroke='#8B5CF6'
        strokeWidth='3'
        strokeDasharray='6 4'
        markerEnd='url(#arrow-flow)'
        className='opacity-80'
      />

      {/* Đánh số thứ tự bóng đọc */}
      {points.map((pt, idx) => (
        <g key={idx}>
          <circle cx={pt.x} cy={pt.y} r='14' fill='#8B5CF6' />
          <text
            x={pt.x}
            y={pt.y + 4}
            textAnchor='middle'
            fill='#FFFFFF'
            fontSize='12'
            fontWeight='bold'
            fontFamily='sans-serif'
          >
            {idx + 1}
          </text>
        </g>
      ))}
    </svg>
  );
};

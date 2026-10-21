/* Lucian UX/UI Prompt #088 · Empty folder that swallows paper · (c) 2026 Seokwoo Lee · MIT License */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React from 'react';
import { Plus } from 'lucide-react';
import '@/styles/modules/lucian/lucian-088.css';

export interface EmptyFolderStateProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyFolderState: React.FC<EmptyFolderStateProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`pf-empty-folder-box ${className}`} data-testid='empty-folder-state'>
      <div className='pf-empty-art' aria-hidden='true'>
        <svg viewBox='0 0 168 128' className='w-full h-full'>
          {/* Folder Back */}
          <path
            className='pf-empty-folder-back'
            d='M16 26a10 10 0 0 1 10-10h34a8 8 0 0 1 6 2.6l8 8.4h68a10 10 0 0 1 10 10v66a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10z'
          />

          {/* Paper Sheet A */}
          <g className='pf-empty-sheet-a'>
            <rect
              x='30'
              y='26'
              width='92'
              height='72'
              rx='6'
              fill='#F8F6F0'
              stroke='#D8D2C5'
              strokeWidth='1.5'
            />
            <path
              d='M42 42h48M42 52h62M42 62h36'
              stroke='#D8D2C5'
              strokeWidth='2.5'
              strokeLinecap='round'
            />
          </g>

          {/* Paper Sheet B */}
          <g className='pf-empty-sheet-b'>
            <rect
              x='46'
              y='32'
              width='92'
              height='68'
              rx='6'
              fill='#FFFFFF'
              stroke='#D8D2C5'
              strokeWidth='1.5'
            />
            <path
              d='M58 46h52M58 56h64M58 66h30'
              stroke='#EBE7DE'
              strokeWidth='2.5'
              strokeLinecap='round'
            />
          </g>

          {/* Folder Front */}
          <path
            className='pf-empty-folder-front'
            d='M10 50a10 10 0 0 1 10-10h128a10 10 0 0 1 10 10.8l-5 52a10 10 0 0 1-10 9.2H25a10 10 0 0 1-10-9.2z'
          />
          <path
            d='M22 47h124'
            stroke='#FFFFFF'
            strokeOpacity='0.4'
            strokeWidth='2'
            strokeLinecap='round'
          />
        </svg>
      </div>

      <h4 className='pf-empty-title'>{title}</h4>
      {subtitle && <p className='pf-empty-subtitle'>{subtitle}</p>}

      {actionText && onAction && (
        <button
          type='button'
          onClick={onAction}
          className='pf-empty-action-btn'
          data-testid='empty-folder-action-btn'
        >
          <Plus className='w-4 h-4' />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

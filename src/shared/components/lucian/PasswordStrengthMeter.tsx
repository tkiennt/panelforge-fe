/* Lucian UX/UI Prompt #036 · Password strength meter · MIT License (c) 2026 Seokwoooo */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React, { useState, useId } from 'react';
import '@/styles/modules/lucian/lucian-036.css';

export interface PasswordStrengthMeterProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  showRules?: boolean;
  error?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = '•••••••• (Tối thiểu 6 ký tự)',
  label = 'Mật khẩu',
  showRules = true,
  error,
  id: customId,
  name = 'password',
  autoComplete = 'new-password',
  required = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = customId || `pf-psw-${generatedId}`;
  const [showPassword, setShowPassword] = useState(false);

  // Quy chuẩn kiểm tra bảo mật mật khẩu (tương thích Backend API: >= 6 chars, 1 uppercase, 1 special char, 1 number)
  const rulesMet = {
    len: value.length >= 6,
    up: /[A-Z]/.test(value),
    num: /\d/.test(value),
    sym: /[^A-Za-z0-9]/.test(value),
  };

  const satisfiedCount = Object.values(rulesMet).filter(Boolean).length;
  const level = value.length === 0 ? 0 : Math.max(1, satisfiedCount);

  // Định nghĩa màu sắc & nhãn mức độ
  const STRENGTH_LEVELS = [
    { label: 'Chưa nhập', color: '#a8a29e' },
    { label: 'Rất yếu', color: '#ef4444' },
    { label: 'Trung bình', color: '#f97316' },
    { label: 'Khá tốt', color: '#eab308' },
    { label: 'Rất mạnh', color: '#10b981' },
  ];

  const currentLevel = STRENGTH_LEVELS[level];

  return (
    <div
      className={`pf-psw-meter ${className}`}
      style={{ '--lv': currentLevel.color } as React.CSSProperties}
    >
      {label && (
        <label
          htmlFor={inputId}
          className='block text-xs font-semibold text-[#0c0a09] mb-1'
        >
          {label}
        </label>
      )}

      {/* Input Box with Eye Toggle */}
      <div className={`pf-psw-box ${error ? 'has-error' : ''}`}>
        <input
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className='pf-psw-in'
          aria-describedby={`${inputId}-rules`}
          aria-invalid={!!error}
        />

        <button
          type='button'
          onClick={() => setShowPassword(!showPassword)}
          className='pf-psw-eye'
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={showPassword}
          tabIndex={-1}
        >
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.9'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' />
            <circle cx='12' cy='12' r='3' style={{ transform: showPassword ? 'scale(1)' : 'scale(0.8)' }} />
            {!showPassword && <line x1='3' y1='3' x2='21' y2='21' />}
          </svg>
        </button>
      </div>

      {/* 4-Segment Progress Bar */}
      <div className='pf-psw-bar' aria-hidden='true'>
        <i className={level >= 1 ? 'on' : ''} />
        <i className={level >= 2 ? 'on' : ''} />
        <i className={level >= 3 ? 'on' : ''} />
        <i className={level >= 4 ? 'on' : ''} />
      </div>

      {/* Strength indicator text */}
      <div className='pf-psw-label'>
        <span>Độ mạnh mật khẩu</span>
        <b aria-live='polite'>{value.length > 0 ? currentLevel.label : ''}</b>
      </div>

      {/* Checklist Rules */}
      {showRules && (
        <ul id={`${inputId}-rules`} className='pf-psw-rules'>
          <li className={`pf-psw-r ${rulesMet.len ? 'ok' : ''}`}>
            <i>
              <svg viewBox='0 0 20 20'>
                <path d='M5.5 10.5l3 3 6-6.5' />
              </svg>
            </i>
            <span>Tối thiểu 6 ký tự</span>
          </li>
          <li className={`pf-psw-r ${rulesMet.up ? 'ok' : ''}`}>
            <i>
              <svg viewBox='0 0 20 20'>
                <path d='M5.5 10.5l3 3 6-6.5' />
              </svg>
            </i>
            <span>1 chữ in hoa (A-Z)</span>
          </li>
          <li className={`pf-psw-r ${rulesMet.num ? 'ok' : ''}`}>
            <i>
              <svg viewBox='0 0 20 20'>
                <path d='M5.5 10.5l3 3 6-6.5' />
              </svg>
            </i>
            <span>Ít nhất 1 chữ số (0-9)</span>
          </li>
          <li className={`pf-psw-r ${rulesMet.sym ? 'ok' : ''}`}>
            <i>
              <svg viewBox='0 0 20 20'>
                <path d='M5.5 10.5l3 3 6-6.5' />
              </svg>
            </i>
            <span>1 ký tự đặc biệt (!@#$)</span>
          </li>
        </ul>
      )}

      {error && (
        <p className='text-xs text-red-500 mt-1 font-medium'>{error}</p>
      )}
    </div>
  );
};

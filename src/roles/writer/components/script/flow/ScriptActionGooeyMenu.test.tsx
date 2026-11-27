import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptActionGooeyMenu } from './ScriptActionGooeyMenu';

function renderMenu(onSave = vi.fn()) {
  render(
    <ScriptActionGooeyMenu
      label='Thao tác kịch bản'
      openLabel='Mở thao tác kịch bản'
      closeLabel='Đóng thao tác kịch bản'
      triggerTestId='trigger'
      actions={[
        { id: 'save', label: 'Lưu', icon: <span>S</span>, color: 'green', onSelect: onSave },
        { id: 'import', label: 'Nhập', icon: <span>I</span>, color: 'orange', onSelect: vi.fn() },
        { id: 'ai', label: 'AI', icon: <span>A</span>, color: 'violet', onSelect: vi.fn() },
      ]}
    />,
  );
}

describe('ScriptActionGooeyMenu', () => {
  it('mở và đóng bằng nút chính, Escape và bấm ra ngoài', () => {
    renderMenu();
    const trigger = screen.getByTestId('trigger');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('giữ màu riêng cho từng thao tác và gọi action sau animation đóng', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    renderMenu(onSave);

    fireEvent.click(screen.getByTestId('trigger'));
    const save = screen.getByRole('button', { name: 'Lưu' });
    const importButton = screen.getByRole('button', { name: 'Nhập' });
    const ai = screen.getByRole('button', { name: 'AI' });
    expect(save.style.getPropertyValue('--u460-action')).toBe('green');
    expect(importButton.style.getPropertyValue('--u460-action')).toBe('orange');
    expect(ai.style.getPropertyValue('--u460-action')).toBe('violet');

    fireEvent.click(save);
    expect(screen.getByTestId('trigger')).toHaveAttribute('aria-expanded', 'false');
    expect(save.style.getPropertyValue('--u460-tx')).toBe('0px');
    expect(save.style.getPropertyValue('--u460-ty')).toBe('0px');
    expect(onSave).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onSave).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

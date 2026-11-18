import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScriptHeader } from './ScriptHeader';

describe('ScriptHeader', () => {
  it('hiển thị 2 chế độ xem kịch bản (Giấy và Thẻ) kèm phím tắt', () => {
    const onSetMode = vi.fn();
    render(<ScriptHeader editorMode='flow' onSetEditorMode={onSetMode} />);

    const tabFlow = screen.getByTestId('tab-flow');
    const tabCards = screen.getByTestId('tab-cards');

    expect(tabFlow).toBeInTheDocument();
    expect(tabCards).toBeInTheDocument();

    expect(tabFlow).toHaveAttribute('aria-pressed', 'true');
    expect(tabCards).toHaveAttribute('aria-pressed', 'false');
  });

  it('gọi onSetEditorMode khi người dùng chuyển tab', () => {
    const onSetMode = vi.fn();
    render(<ScriptHeader editorMode='flow' onSetEditorMode={onSetMode} />);

    const tabCards = screen.getByTestId('tab-cards');
    fireEvent.click(tabCards);

    expect(onSetMode).toHaveBeenCalledTimes(1);
    expect(onSetMode).toHaveBeenCalledWith('cards');
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScriptCommentComposer } from './ScriptCommentCard';

describe('ScriptCommentComposer - IME-safe Enter submit', () => {
  it('does NOT trigger onSave when Enter is pressed during IME composition (isComposing: true)', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ScriptCommentComposer
        initialText='Đang soạn'
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByPlaceholderText('Nhập nhận xét...');

    // Simulate Enter keydown while IME is composing text (Vietnamese Telex/VNI)
    fireEvent.keyDown(input, {
      key: 'Enter',
      isComposing: true,
      nativeEvent: { isComposing: true },
    });

    expect(onSave).not.toHaveBeenCalled();

    // Now simulate normal Enter keydown after composition is complete
    fireEvent.keyDown(input, {
      key: 'Enter',
      isComposing: false,
      nativeEvent: { isComposing: false },
    });

    expect(onSave).toHaveBeenCalledWith('Đang soạn');
  });

  it('does NOT trigger onSave when Enter is pressed with keyCode 229 (VK_PROCESSKEY fallback)', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ScriptCommentComposer
        initialText='Đang soạn'
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByPlaceholderText('Nhập nhận xét...');

    // Simulate Enter keydown with keyCode 229
    fireEvent.keyDown(input, {
      key: 'Enter',
      keyCode: 229,
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});

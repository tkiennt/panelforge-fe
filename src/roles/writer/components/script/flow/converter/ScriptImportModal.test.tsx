import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScriptImportModal } from './ScriptImportModal';

describe('ScriptImportModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApplyScript: vi.fn(),
    initialStartingPageNumber: 1,
    characters: [{ id: 'char-1', name: 'Minh' }, { id: 'char-2', name: 'Lan' }],
    onShowToast: vi.fn(),
  };

  it('renders modal with title, tabs, controls when open', () => {
    render(<ScriptImportModal {...defaultProps} />);

    expect(screen.getByText('Nhập văn bản thô vào kịch bản')).toBeDefined();
    expect(screen.getByText('Dán văn bản')).toBeDefined();
    expect(screen.getByText('Tải tệp tin')).toBeDefined();
    expect(screen.getByText('Mẫu văn xuôi')).toBeDefined();
    expect(screen.getByText('Mẫu kịch bản')).toBeDefined();
    expect(screen.getByPlaceholderText(/Dán văn bản thô vào đây/i)).toBeDefined();
  });

  it('loads sample novel prose and live parses into pages, panels and dialogues', () => {
    render(<ScriptImportModal {...defaultProps} />);

    const sampleProseBtn = screen.getByText('Mẫu văn xuôi');
    fireEvent.click(sampleProseBtn);

    // Live preview status indicator
    expect(
      screen.getByText(/Sẵn sàng chèn \d+ trang · \d+ khung · \d+ câu thoại/i),
    ).toBeDefined();

    // Visual cards in preview
    expect(screen.getByText('TRANG 01')).toBeDefined();
    expect(screen.getByText('Minh')).toBeDefined();
    expect(screen.getByText('Lan')).toBeDefined();
    expect(screen.getByText('SFX: BÙM!')).toBeDefined();
  });

  it('loads sample comic script and displays in preview', () => {
    render(<ScriptImportModal {...defaultProps} />);

    const sampleScriptBtn = screen.getByText('Mẫu kịch bản');
    fireEvent.click(sampleScriptBtn);

    expect(screen.getByText('TRANG 01')).toBeDefined();
    expect(screen.getByText(/Khung 1.1/i)).toBeDefined();
    expect(screen.getByText('Toàn cảnh')).toBeDefined();
  });

  it('calls onApplyScript with insert mode when user clicks "↳ Chèn tại con trỏ"', () => {
    const onApplyScript = vi.fn();
    render(<ScriptImportModal {...defaultProps} onApplyScript={onApplyScript} />);

    const sampleProseBtn = screen.getByText('Mẫu văn xuôi');
    fireEvent.click(sampleProseBtn);

    const insertBtn = screen.getByText('↳ Chèn tại con trỏ');
    fireEvent.click(insertBtn);

    expect(onApplyScript).toHaveBeenCalledTimes(1);
    const [nodes, mode] = onApplyScript.mock.calls[0];
    expect(mode).toBe('insert');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('calls onApplyScript with append mode when user clicks "+ Chèn vào cuối"', () => {
    const onApplyScript = vi.fn();
    render(<ScriptImportModal {...defaultProps} onApplyScript={onApplyScript} />);

    const sampleProseBtn = screen.getByText('Mẫu văn xuôi');
    fireEvent.click(sampleProseBtn);

    const appendBtn = screen.getByText('+ Chèn vào cuối');
    fireEvent.click(appendBtn);

    expect(onApplyScript).toHaveBeenCalledTimes(1);
    const [nodes, mode] = onApplyScript.mock.calls[0];
    expect(mode).toBe('append');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('requires two-click confirmation for destructive "Ghi đè tất cả" (replace)', () => {
    const onApplyScript = vi.fn();
    render(<ScriptImportModal {...defaultProps} onApplyScript={onApplyScript} />);

    const sampleProseBtn = screen.getByText('Mẫu văn xuôi');
    fireEvent.click(sampleProseBtn);

    const replaceBtn = screen.getByText('Ghi đè tất cả');
    fireEvent.click(replaceBtn);

    // First click should request confirmation, not apply yet
    expect(onApplyScript).not.toHaveBeenCalled();
    expect(screen.getByText('Xác nhận ghi đè tất cả?')).toBeDefined();

    // Second click confirms
    fireEvent.click(screen.getByText('Xác nhận ghi đè tất cả?'));
    expect(onApplyScript).toHaveBeenCalledTimes(1);
    const [nodes, mode] = onApplyScript.mock.calls[0];
    expect(mode).toBe('replace');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('allows switching between visual card preview and raw script text preview', () => {
    render(<ScriptImportModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Mẫu kịch bản'));

    const textTabBtn = screen.getByTitle('Xem trước dạng mã kịch bản chuẩn');
    fireEvent.click(textTabBtn);

    const preElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'pre' && content.includes('! Trang 01');
    });
    expect(preElement).toBeDefined();
  });
});

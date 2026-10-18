import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextFormatToolbar } from './TextFormatToolbar';
import { resolveTextStyle } from '../lib/textStyle';

const base = resolveTextStyle({ elementType: 'SPEECH_BALLOON' });

describe('TextFormatToolbar', () => {
  it('bấm In đậm gửi kiểu mới có bold và bỏ nhãn kiểu có sẵn', async () => {
    const onChange = vi.fn();
    render(<TextFormatToolbar style={base} isCustom={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'In đậm' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ bold: true, preset: null, fontFamily: 'Mali' }),
    );
  });

  it('chọn kiểu có sẵn áp nguyên bộ kiểu', async () => {
    const onChange = vi.fn();
    render(<TextFormatToolbar style={base} isCustom={false} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Kiểu có sẵn'), 'SFX');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ preset: 'SFX', fontFamily: 'Bangers', strokeWidth: 4 }),
    );
  });

  it('gõ cỡ chữ quá nhỏ thì kẹp về mức tối thiểu', async () => {
    const onChange = vi.fn();
    render(<TextFormatToolbar style={base} isCustom onChange={onChange} />);
    const size = screen.getByLabelText('Cỡ chữ (px)');
    await userEvent.clear(size);
    await userEvent.type(size, '8{Enter}');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 14 }));
  });

  it('nút Mặc định chỉ bật khi đã có kiểu riêng, và gửi null', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TextFormatToolbar style={base} isCustom={false} onChange={onChange} />,
    );
    expect(screen.getByTitle('Về kiểu mặc định theo loại bóng')).toBeDisabled();
    rerender(<TextFormatToolbar style={base} isCustom onChange={onChange} />);
    await userEvent.click(screen.getByTitle('Về kiểu mặc định theo loại bóng'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('chế độ chỉ đọc khoá các nút', () => {
    render(<TextFormatToolbar style={base} isCustom disabled onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'In đậm' })).toBeDisabled();
    expect(screen.getByLabelText('Phông chữ')).toBeDisabled();
  });
});

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useScriptDrawers } from './useScriptDrawers';

describe('useScriptDrawers', () => {
  it('khởi tạo với trạng thái ban đầu mặc định', () => {
    const { result } = renderHook(() => useScriptDrawers());

    expect(result.current.activeLeftDrawer).toBeNull();
    // Trong môi trường test, activeRightDrawer mặc định là 'status'
    expect(result.current.activeRightDrawer).toBe('status');
  });

  it('cho phép cấu hình initial drawers', () => {
    const { result } = renderHook(() =>
      useScriptDrawers({ initialLeftDrawer: 'chapters', initialRightDrawer: 'comments' }),
    );

    expect(result.current.activeLeftDrawer).toBe('chapters');
    expect(result.current.activeRightDrawer).toBe('comments');
  });

  it('bật/tắt ngăn kéo bên trái (toggleLeftDrawer)', () => {
    const { result } = renderHook(() => useScriptDrawers());

    act(() => {
      result.current.toggleLeftDrawer('chapters');
    });
    expect(result.current.activeLeftDrawer).toBe('chapters');

    act(() => {
      result.current.toggleLeftDrawer('chapters');
    });
    expect(result.current.activeLeftDrawer).toBeNull();
  });

  it('bật/tắt ngăn kéo bên phải (toggleRightDrawer)', () => {
    const { result } = renderHook(() => useScriptDrawers({ initialRightDrawer: null }));

    act(() => {
      result.current.toggleRightDrawer('characters');
    });
    expect(result.current.activeRightDrawer).toBe('characters');

    act(() => {
      result.current.toggleRightDrawer('characters');
    });
    expect(result.current.activeRightDrawer).toBeNull();
  });

  it('đóng toàn bộ ngăn kéo (closeAllDrawers)', () => {
    const { result } = renderHook(() =>
      useScriptDrawers({ initialLeftDrawer: 'chapters', initialRightDrawer: 'characters' }),
    );

    expect(result.current.activeLeftDrawer).toBe('chapters');
    expect(result.current.activeRightDrawer).toBe('characters');

    act(() => {
      result.current.closeAllDrawers();
    });

    expect(result.current.activeLeftDrawer).toBeNull();
    expect(result.current.activeRightDrawer).toBeNull();
  });
});

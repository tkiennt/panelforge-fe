import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useScriptDrawers } from './useScriptDrawers';

describe('useScriptDrawers', () => {
  it('khởi tạo với trạng thái ban đầu mặc định', () => {
    const { result } = renderHook(() => useScriptDrawers());

    expect(result.current.activeLeftDrawer).toBeNull();
    expect(result.current.activeRightDrawer).toBeNull();
  });

  it('cho phép cấu hình initial drawers', () => {
    const { result } = renderHook(() =>
      useScriptDrawers({ initialLeftDrawer: 'scenes', initialRightDrawer: 'comments' }),
    );

    expect(result.current.activeLeftDrawer).toBe('scenes');
    expect(result.current.activeRightDrawer).toBe('comments');
  });

  it('bật/tắt ngăn kéo bên trái (toggleLeftDrawer)', () => {
    const { result } = renderHook(() => useScriptDrawers());

    act(() => {
      result.current.toggleLeftDrawer('scenes');
    });
    expect(result.current.activeLeftDrawer).toBe('scenes');

    act(() => {
      result.current.toggleLeftDrawer('scenes');
    });
    expect(result.current.activeLeftDrawer).toBeNull();
  });

  it('bật/tắt ngăn kéo bên phải (toggleRightDrawer)', () => {
    const { result } = renderHook(() => useScriptDrawers({ initialRightDrawer: null }));

    act(() => {
      result.current.toggleRightDrawer('bible');
    });
    expect(result.current.activeRightDrawer).toBe('bible');

    act(() => {
      result.current.toggleRightDrawer('bible');
    });
    expect(result.current.activeRightDrawer).toBeNull();
  });

  it('đóng toàn bộ ngăn kéo (closeAllDrawers)', () => {
    const { result } = renderHook(() =>
      useScriptDrawers({ initialLeftDrawer: 'scenes', initialRightDrawer: 'versions' }),
    );

    expect(result.current.activeLeftDrawer).toBe('scenes');
    expect(result.current.activeRightDrawer).toBe('versions');

    act(() => {
      result.current.closeAllDrawers();
    });

    expect(result.current.activeLeftDrawer).toBeNull();
    expect(result.current.activeRightDrawer).toBeNull();
  });
});

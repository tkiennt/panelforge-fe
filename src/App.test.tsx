import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Firebase module
vi.mock('./firebase', () => ({
  signInWithPopup: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    // Return null user initially
    callback(null);
    return () => {};
  }),
  auth: {},
  googleProvider: {},
}));

describe('App Integration Smoke Test', () => {
  it('khởi chạy ứng dụng thành công và render landing page / header chính', () => {
    render(<App />);

    // Kiểm tra thương hiệu PanelForge được hiển thị
    const brandElements = screen.getAllByText(/PANELFORGE/i);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
  });
});

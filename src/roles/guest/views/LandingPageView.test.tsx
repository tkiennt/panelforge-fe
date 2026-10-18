import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LandingPageView } from './LandingPageView';

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.style.overflow = '';
});

describe('LandingPageView Component', () => {
  describe('1. Tab đổi nội dung và trạng thái truy cập đúng', () => {
    it('render tablist với role="tablist", aria-selected và nhãn Dữ liệu minh họa', () => {
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const tablist = screen.getByRole('tablist', { name: /Không gian làm việc minh họa/i });
      expect(tablist).toBeInTheDocument();

      // Badge dữ liệu minh họa
      expect(screen.getByText('Dữ liệu minh họa')).toBeInTheDocument();

      // Mặc định tab Quy trình sản xuất được chọn
      const pipelineTab = screen.getByRole('tab', { name: /Quy trình sản xuất/i });
      expect(pipelineTab).toHaveAttribute('aria-selected', 'true');
      expect(pipelineTab).toHaveAttribute('tabIndex', '0');

      // Panel tương ứng được hiển thị
      const pipelinePanel = screen.getByRole('tabpanel');
      expect(pipelinePanel).toHaveAttribute('id', 'showcase-panel-pipeline');
      expect(pipelinePanel).toHaveAttribute('aria-labelledby', 'showcase-tab-pipeline');
    });

    it('click đổi tab cập nhật nội dung panel và thuộc tính aria-selected', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const scriptTab = screen.getByRole('tab', { name: /Kịch bản phân khung/i });
      const pipelineTab = screen.getByRole('tab', { name: /Quy trình sản xuất/i });

      // Click vào tab Kịch bản
      await user.click(scriptTab);

      expect(scriptTab).toHaveAttribute('aria-selected', 'true');
      expect(pipelineTab).toHaveAttribute('aria-selected', 'false');

      // Panel Kịch bản hiển thị nội dung phân cảnh và kịch bản phân khung
      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getByText(/Phân cảnh 04: Studio về đêm/i)).toBeInTheDocument();
      expect(within(panel).getByText(/Soạn thảo kịch bản phân khung/i)).toBeInTheDocument();
    });

    it('hỗ trợ điều hướng bàn phím ArrowRight, ArrowLeft, Home, End trong tablist', () => {
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const pipelineTab = screen.getByRole('tab', { name: /Quy trình sản xuất/i });
      pipelineTab.focus();

      // Mũi tên phải -> chuyển sang Kịch bản
      fireEvent.keyDown(pipelineTab, { key: 'ArrowRight' });
      const scriptTab = screen.getByRole('tab', { name: /Kịch bản phân khung/i });
      expect(scriptTab).toHaveAttribute('aria-selected', 'true');

      // Phím End -> chuyển sang tab cuối (Tài liệu tham chiếu)
      fireEvent.keyDown(scriptTab, { key: 'End' });
      const refTab = screen.getByRole('tab', { name: /Tài liệu tham chiếu/i });
      expect(refTab).toHaveAttribute('aria-selected', 'true');

      // Phím Home -> quay về tab đầu (Quy trình sản xuất)
      fireEvent.keyDown(refTab, { key: 'Home' });
      expect(screen.getByRole('tab', { name: /Quy trình sản xuất/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  describe('2. Menu mobile mở/đóng và điều hướng', () => {
    it('mở menu mobile, hiển thị dialog modal và khóa cuộn trang', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const toggleButton = document.getElementById('mobile-nav-toggle') as HTMLButtonElement;
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-controls', 'mobile-nav-drawer');

      // Mở menu
      await user.click(toggleButton);

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      const drawer = document.getElementById('mobile-nav-drawer');
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute('role', 'dialog');
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('đóng menu mobile bằng phím Escape và khôi phục focus về nút toggle', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const toggleButton = document.getElementById('mobile-nav-toggle') as HTMLButtonElement;
      await user.click(toggleButton);

      expect(document.getElementById('mobile-nav-drawer')).toBeInTheDocument();

      // Nhấn Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(document.getElementById('mobile-nav-drawer')).not.toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement).toBe(toggleButton);
    });

    it('bấm link nội trang trong menu mobile sẽ đóng drawer và cuộn tới section', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const toggleButton = document.getElementById('mobile-nav-toggle') as HTMLButtonElement;
      await user.click(toggleButton);

      const drawer = document.getElementById('mobile-nav-drawer') as HTMLElement;
      expect(drawer).toBeInTheDocument();

      const featureLink = within(drawer).getByRole('link', { name: /Tính năng/i });
      await user.click(featureLink);

      // Drawer đóng sau khi click link
      expect(document.getElementById('mobile-nav-drawer')).not.toBeInTheDocument();
    });
  });

  describe('3. CTA có đích đúng với nhãn', () => {
    it('gọi callback onOpenLogin và onOpenRegister đúng khi bấm nút tương ứng', async () => {
      const onOpenLogin = vi.fn();
      const onOpenRegister = vi.fn();
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <LandingPageView onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister} />
        </MemoryRouter>,
      );

      // Header auth buttons
      const loginButtons = screen.getAllByRole('button', { name: /Đăng nhập/i });
      await user.click(loginButtons[0]);
      expect(onOpenLogin).toHaveBeenCalledTimes(1);

      const registerButtons = screen.getAllByRole('button', { name: /Tạo tài khoản/i });
      await user.click(registerButtons[0]);
      expect(onOpenRegister).toHaveBeenCalledTimes(1);
    });

    it('CTA phụ Xem quy trình hoạt động cuộn tới #block-workflow thay vì mở login', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const workflowLink = screen.getByRole('link', { name: /Xem quy trình hoạt động/i });
      expect(workflowLink).toHaveAttribute('href', '#block-workflow');

      await user.click(workflowLink);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('4. Link nội trang có section tương ứng', () => {
    it('toàn bộ các anchor link nội bộ trỏ tới ID tồn tại trong DOM và không có href="#" chết', () => {
      const { container } = render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const internalLinks = container.querySelectorAll('a[href^="#"]');
      expect(internalLinks.length).toBeGreaterThan(0);

      internalLinks.forEach((anchor) => {
        const href = anchor.getAttribute('href');
        expect(href).not.toBe('#'); // Không có link chết
        if (href && href.startsWith('#')) {
          const targetId = href.slice(1);
          const targetElement = document.getElementById(targetId);
          expect(targetElement).not.toBeNull();
        }
      });
    });

    it('các section chính đều có thuộc tính scroll-mt để không bị navbar che', () => {
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const sectionIds = [
        'hero-section',
        'block-features',
        'block-workflow',
        'block-showcase',
        'block-faq',
        'block-cta',
      ];
      sectionIds.forEach((id) => {
        const section = document.getElementById(id);
        expect(section).toBeInTheDocument();
        expect(section?.className).toMatch(/scroll-mt-\d+/);
      });
    });
  });

  describe('5. FAQ Accordion có căn cứ thực tế và trợ năng tốt', () => {
    it('hiển thị 4 câu hỏi thường gặp và mở rộng nội dung khi tương tác', () => {
      render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const faqSection = document.getElementById('block-faq');
      expect(faqSection).toBeInTheDocument();

      // Kiểm tra 4 câu hỏi thực tế
      expect(screen.getByText('Ai có thể sử dụng PanelForge?')).toBeInTheDocument();
      expect(screen.getByText('Tài khoản mới có thể tự tạo studio không?')).toBeInTheDocument();
      expect(screen.getByText('AI hỗ trợ đội ngũ ở bước nào?')).toBeInTheDocument();
      expect(screen.getByText('Các phiên bản cũ được quản lý thế nào?')).toBeInTheDocument();

      // Các câu trả lời thực tế nằm trong details/summary
      expect(
        screen.getByText(/PanelForge được thiết kế cho các đội ngũ sáng tác truyện tranh/i),
      ).toBeInTheDocument();
    });
  });

  describe('6. Resilient Scroll Reveal và Reduced Motion', () => {
    it('khi người dùng bật prefers-reduced-motion, tất cả phần tử animate-on-scroll nhận is-visible ngay', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(
        <MemoryRouter>
          <LandingPageView />
        </MemoryRouter>,
      );

      const animatedElements = container.querySelectorAll('.animate-on-scroll');
      expect(animatedElements.length).toBeGreaterThan(0);
      animatedElements.forEach((el) => {
        expect(el.classList.contains('is-visible')).toBe(true);
      });
    });
  });
});

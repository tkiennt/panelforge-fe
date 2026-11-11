import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider, useTranslation, translate, LanguageSwitcher } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import { LandingPageView } from '@/roles/guest/views/LandingPageView';

// Mock IntersectionObserver for LandingPageView
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
  localStorage.clear();
});

describe('FE i18n VI <-> EN Language Switching Verification', () => {
  describe('1. API Error code to locale mapping (errors namespace)', () => {
    it('maps known backend error codes to English messages in EN mode', () => {
      expect(translate('errors.CONFLICT', undefined, 'en')).toBe(
        'Data conflict detected. Please refresh and try again.',
      );
      expect(translate('errors.NOT_FOUND', undefined, 'en')).toBe(
        'The requested resource was not found.',
      );
      expect(translate('errors.FORBIDDEN', undefined, 'en')).toBe(
        'You do not have permission to perform this action.',
      );
      expect(translate('errors.UNAUTHORIZED', undefined, 'en')).toBe(
        'Unauthorized or session has expired.',
      );
      expect(translate('errors.CHAPTER_READ_ONLY', undefined, 'en')).toBe(
        'This chapter is approved or published, content is read-only.',
      );
      expect(translate('errors.AI_QUOTA_EXCEEDED', undefined, 'en')).toBe(
        'AI usage quota exceeded.',
      );
    });

    it('maps known backend error codes to Vietnamese messages in VI mode', () => {
      expect(translate('errors.CONFLICT', undefined, 'vi')).toBe(
        'Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại.',
      );
      expect(translate('errors.NOT_FOUND', undefined, 'vi')).toBe(
        'Tài nguyên yêu cầu không tồn tại.',
      );
      expect(translate('errors.FORBIDDEN', undefined, 'vi')).toBe(
        'Bạn không có quyền thực hiện thao tác này.',
      );
    });

    it('translates api-error helper responses according to current locale', () => {
      const errorObj = {
        isAxiosError: true,
        response: {
          data: {
            code: 'FORBIDDEN',
            message: 'Default Vietnamese backend message',
          },
        },
      };

      // In default VI mode, candidateKey errors.FORBIDDEN gives Vietnamese
      const msgVi = getApiErrorMessage(errorObj);
      expect(msgVi).toBe('Bạn không có quyền thực hiện thao tác này.');
    });
  });

  describe('2. Landing page localization in EN mode', () => {
    it('renders English navigation, hero titles, badges, and CTAs when lang=en', () => {
      localStorage.setItem('panelforge_lang', 'en');

      render(
        <MemoryRouter>
          <I18nProvider>
            <LandingPageView />
          </I18nProvider>
        </MemoryRouter>,
      );

      // Header navigation buttons
      expect(screen.getAllByRole('button', { name: /Sign In/i })[0]).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Sign Up/i })[0]).toBeInTheDocument();

      // Hero headline & badges
      expect(screen.getByText(/FROM SCRIPT TO/i)).toBeInTheDocument();
      expect(screen.getByText(/EVERY PANEL\./i)).toBeInTheDocument();
      expect(screen.getByText(/Structured Scripts/i)).toBeInTheDocument();
      expect(screen.getByText(/Version Provenance/i)).toBeInTheDocument();

      // CTA Buttons
      expect(screen.getByRole('button', { name: /Create Free Account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Discover the production workflow/i })).toBeInTheDocument();

      // Feature pillars
      expect(screen.getByText(/Structured Content/i)).toBeInTheDocument();
      expect(screen.getByText(/Version History/i)).toBeInTheDocument();
      expect(screen.getByText(/Series Bible/i)).toBeInTheDocument();
    });

    it('verifies that no Vietnamese diacritics appear in the main hero and header in EN mode', () => {
      localStorage.setItem('panelforge_lang', 'en');

      const { container } = render(
        <MemoryRouter>
          <I18nProvider>
            <LandingPageView />
          </I18nProvider>
        </MemoryRouter>,
      );

      // Grab the header section
      const header = container.querySelector('header');
      expect(header).not.toBeNull();
      const headerText = header?.textContent || '';

      // Check that typical Vietnamese accented characters do NOT exist in header
      const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
      expect(vietnameseRegex.test(headerText)).toBe(false);
    });

    it('translates margin guideline, mobile menu toggle, and hero manuscript illustration attributes in EN mode', () => {
      localStorage.setItem('panelforge_lang', 'en');

      const { container } = render(
        <MemoryRouter>
          <I18nProvider>
            <LandingPageView />
          </I18nProvider>
        </MemoryRouter>,
      );

      // Margin guideline 01 / Start of a story
      expect(screen.getByText('01 / Start of a story')).toBeInTheDocument();
      expect(screen.queryByText('01 / Bắt đầu một câu chuyện')).not.toBeInTheDocument();

      // Mobile nav toggle aria-label in EN
      const navToggle = container.querySelector('#mobile-nav-toggle');
      expect(navToggle).toHaveAttribute('aria-label', 'Open navigation menu');

      // Hero manga manuscript card aria-label and image alt
      const heroCard = container.querySelector('#hero-manuscript-card');
      expect(heroCard).toHaveAttribute(
        'aria-label',
        'PanelForge manga manuscript: Monochrome and Color',
      );

      const mainImg = heroCard?.querySelector('img');
      expect(mainImg).toHaveAttribute(
        'alt',
        'PanelForge comic manuscript split diagonally between monochrome and full color. Dialogue: The story continues. Artist: v3',
      );
    });
  });

  describe('3. Language switcher component interactive toggle', () => {
    const TestConsumer = () => {
      const { lang, t } = useTranslation('landing');
      return (
        <div>
          <LanguageSwitcher />
          <p data-testid='current-lang'>{lang}</p>
          <p data-testid='translated-text'>{t('hero.ctaPrimary', 'Tạo tài khoản')}</p>
        </div>
      );
    };

    it('switches between VI and EN on button click and updates rendered text', () => {
      render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>,
      );

      // Initially VI
      expect(screen.getByTestId('current-lang')).toHaveTextContent('vi');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Tạo tài khoản');

      // Click EN button
      const enBtn = screen.getByTestId('lang-btn-en');
      fireEvent.click(enBtn);

      // Now EN
      expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Create Free Account');

      // Click VI button back
      const viBtn = screen.getByTestId('lang-btn-vi');
      fireEvent.click(viBtn);
      expect(screen.getByTestId('current-lang')).toHaveTextContent('vi');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Tạo tài khoản');
    });
  });

  describe('4. Review, Pipeline, and Bible namespaces translation completeness', () => {
    it('provides proper English translations for Review namespace', () => {
      expect(translate('review.sidebar.changeRequests', undefined, 'en')).toBe('Change Requests');
      expect(translate('review.sidebar.consistency', undefined, 'en')).toBe('Consistency');
      expect(translate('review.sidebar.visualReport', undefined, 'en')).toBe('Visual Report');
      expect(translate('review.diff.sideBySide', undefined, 'en')).toBe('Side-by-side');
      expect(translate('review.diff.slider', undefined, 'en')).toBe('Split Slider');
      expect(translate('review.diff.onionSkin', undefined, 'en')).toBe('Onion Skin');
      expect(translate('review.chapterReview.stepper.editor', undefined, 'en')).toBe('Editor Review');
      expect(translate('review.chapterReview.stepper.producer', undefined, 'en')).toBe('Producer Review');
      expect(translate('review.chapterReview.stepper.publisher', undefined, 'en')).toBe('Publisher Release');
    });

    it('provides proper English translations for Pipeline namespace', () => {
      expect(translate('pipeline.stages.script', undefined, 'en')).toBe('Script');
      expect(translate('pipeline.stages.pencil', undefined, 'en')).toBe('Pencil');
      expect(translate('pipeline.stages.color', undefined, 'en')).toBe('Color');
      expect(translate('pipeline.stages.lettering', undefined, 'en')).toBe('Lettering');
      expect(translate('pipeline.board.clearFilters', undefined, 'en')).toBe('Clear filters');
      expect(translate('pipeline.board.overdueOnly', undefined, 'en')).toBe('Overdue only');
      expect(translate('pipeline.modal.disabled', undefined, 'en')).toBe('Disabled');
      expect(translate('pipeline.modal.enableStage', undefined, 'en')).toBe('Enable this stage');
    });

    it('provides proper English translations for Bible namespace', () => {
      expect(translate('bible.categories.all', undefined, 'en')).toBe('All Entries');
      expect(translate('bible.categories.character', undefined, 'en')).toBe('Character');
      expect(translate('bible.categories.location', undefined, 'en')).toBe('Location & Setting');
      expect(translate('bible.canonLock.badge', undefined, 'en')).toBe('Canon Locked');
      expect(translate('bible.canonLock.lockAction', undefined, 'en')).toBe('🔒 Lock Canon');
      expect(translate('bible.fields.name', undefined, 'en')).toBe('Name');
      expect(translate('bible.fields.visualDescription', undefined, 'en')).toBe('Visual Description');
    });
  });
});

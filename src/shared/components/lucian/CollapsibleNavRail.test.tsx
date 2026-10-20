import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CollapsibleNavRail, NavRailItem } from './CollapsibleNavRail';
import { Home, Layers, Calendar, MessageSquare, Settings } from 'lucide-react';

describe('CollapsibleNavRail (#040)', () => {
  const mockItems: NavRailItem[] = [
    { id: 'home', label: 'Bàn Làm Việc', icon: Home },
    { id: 'projects', label: 'Dự Án Truyện', icon: Layers, badge: 3 },
    { id: 'calendar', label: 'Lịch Sản Xuất', icon: Calendar },
    { id: 'messages', label: 'Tin Nhắn & Góp Ý', icon: MessageSquare },
    { id: 'settings', label: 'Cài Đặt', icon: Settings },
  ];

  const mockUser = {
    name: 'Seokwoo Lee',
    role: 'Lead Artist',
  };

  it('renders all nav items, logo, and user profile', () => {
    render(<CollapsibleNavRail items={mockItems} user={mockUser} activeId='home' />);

    expect(screen.getByTestId('collapsible-nav-rail-root')).toBeInTheDocument();
    expect(screen.getByText('PF')).toBeInTheDocument();
    expect(screen.getByText('PanelForge')).toBeInTheDocument();
    expect(screen.getByText('Seokwoo Lee')).toBeInTheDocument();
    expect(screen.getByText('Lead Artist')).toBeInTheDocument();
    expect(screen.getByTestId('nav-rail-item-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-rail-badge-projects')).toHaveTextContent('3');
  });

  it('supports toggle collapse and expand', () => {
    render(<CollapsibleNavRail items={mockItems} />);

    const root = screen.getByTestId('collapsible-nav-rail-root');
    const toggleBtn = screen.getByTestId('nav-rail-toggle');

    expect(root).not.toHaveClass('is-wide');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleBtn);
    expect(root).toHaveClass('is-wide');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggleBtn);
    expect(root).not.toHaveClass('is-wide');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('triggers onSelect when an item is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <CollapsibleNavRail
        items={mockItems}
        activeId='home'
        onSelect={handleSelect}
      />
    );

    const projectBtn = screen.getByTestId('nav-rail-item-projects');
    fireEvent.click(projectBtn);

    expect(handleSelect).toHaveBeenCalledWith('projects');
  });

  it('handles keyboard navigation with arrow keys', () => {
    render(<CollapsibleNavRail items={mockItems} activeId='home' />);

    const homeBtn = screen.getByTestId('nav-rail-item-home');
    const projectBtn = screen.getByTestId('nav-rail-item-projects');
    const settingsBtn = screen.getByTestId('nav-rail-item-settings');

    homeBtn.focus();
    fireEvent.keyDown(homeBtn, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(projectBtn);

    fireEvent.keyDown(projectBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(homeBtn);

    // wrap around
    fireEvent.keyDown(homeBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(settingsBtn);
  });
});

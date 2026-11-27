import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Home } from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  CountChip,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  Input,
  Metric,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  SectionHeader,
  SidebarItem,
  SidebarSection,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
  Select,
  Toast,
  ToastStack,
} from './index';
import { ConfirmProvider, useConfirm } from '@/shared/context/ConfirmContext';
import { ToastProvider, useToast } from '@/shared/context/ToastContext';

afterEach(() => {
  vi.useRealTimers();
  document.getElementById('shared-overlay-root')?.remove();
});

describe('Modal', () => {
  it('supports Escape, backdrop dismissal, focus trap and focus restoration', () => {
    const onClose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal
            isOpen={open}
            title='Dialog'
            closeLabel='Close'
            onClose={() => {
              onClose();
              setOpen(false);
            }}
            backdropTestId='modal-backdrop'
          >
            <button>First</button>
            <button>Last</button>
          </Modal>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    screen.getByRole('button', { name: 'Last' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
    fireEvent.click(opener);
    fireEvent.mouseDown(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Drawer', () => {
  it('applies dialog semantics and honors the dismissible backdrop rule', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer
        isOpen
        title='Panel'
        closeLabel='Close'
        onClose={onClose}
        backdropTestId='drawer-backdrop'
      >
        Body
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Panel');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.mouseDown(screen.getByTestId('drawer-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
    rerender(
      <Drawer
        isOpen
        title='Panel'
        closeLabel='Close'
        onClose={onClose}
        dismissible={false}
        backdropTestId='drawer-backdrop'
      >
        Body
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByTestId('drawer-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('ConfirmDialog and ConfirmContext', () => {
  it('requires exact type-to-confirm text', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        variant='type-to-confirm'
        title='Delete'
        closeLabel='Close'
        cancelLabel='Cancel'
        confirmLabel='Confirm'
        confirmationText='Series A'
        confirmationInputLabel='Type name'
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const submit = screen.getByTestId('confirm-delete-submit-btn');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('confirm-delete-input'), { target: { value: 'series a' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('confirm-delete-input'), { target: { value: 'Series A' } });
    fireEvent.click(submit);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('resolves the context promise true and false exactly once', async () => {
    const results: boolean[] = [];
    function Consumer() {
      const confirm = useConfirm();
      return (
        <button onClick={async () => results.push(await confirm({ title: 'Proceed?' }))}>
          Ask
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Consumer />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await act(async () => fireEvent.click(screen.getByTestId('confirm-accept-btn')));
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await act(async () => fireEvent.keyDown(document, { key: 'Escape' }));
    expect(results).toEqual([true, false]);
  });
});

describe('Alert', () => {
  it('uses alert semantics and calls controlled dismissal', () => {
    const onDismiss = vi.fn();
    render(
      <Alert tone='warning' title='Warning' dismissLabel='Dismiss' onDismiss={onDismiss}>
        Check this
      </Alert>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Check this');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('preserves legacy logout and error test ids', () => {
    const { rerender } = render(
      <Toast
        toast={{
          id: 'logout',
          title: 'Signed out',
          description: 'Session ended',
          tone: 'neutral',
          type: 'logout',
        }}
        closeLabel='Close'
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('toast-item-logout')).toBeInTheDocument();
    expect(screen.getByTestId('toast-icon-logout')).toBeInTheDocument();

    rerender(
      <Toast
        toast={{
          id: 'error',
          title: 'Failed',
          description: 'Try again',
          tone: 'danger',
          type: 'error',
        }}
        closeLabel='Close'
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('toast-item-error')).toBeInTheDocument();
    expect(screen.getByTestId('toast-icon-error')).toBeInTheDocument();
  });

  it('auto-dismisses, keeps danger sticky, and renders newest first in a stack', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const info = {
      id: 'one',
      title: 'One',
      description: 'First',
      tone: 'info' as const,
      duration: 1000,
    };
    const danger = {
      id: 'two',
      title: 'Two',
      description: 'Second',
      tone: 'danger' as const,
      duration: 1000,
    };
    const { rerender } = render(<Toast toast={info} closeLabel='Close' onClose={onClose} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(onClose).toHaveBeenCalledWith('one');
    rerender(<Toast toast={danger} closeLabel='Close' onClose={onClose} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <ToastStack
        toasts={[info, danger]}
        closeLabel='Close'
        regionLabel='Notifications'
        onClose={onClose}
      />,
    );
    const titles = screen.getAllByText(/One|Two/);
    expect(titles[0]).toHaveTextContent('Two');
  });

  it('ToastContext limits the visible stack to three', () => {
    function Consumer() {
      const toast = useToast();
      return (
        <button onClick={() => ['1', '2', '3', '4'].forEach((value) => toast.info(value, value))}>
          Add
        </button>
      );
    }
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getAllByTestId('toast-item-info')).toHaveLength(3);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  it('derives active state from the route and exposes collapsed tooltips', () => {
    render(
      <SidebarSection label='Main' collapsed>
        <SidebarItem href='/home' currentPath='/home' icon={Home} label='Home' collapsed />
      </SidebarSection>,
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Home');
  });
});

describe('Surface primitives', () => {
  it('renders PageHeader with page and toolbar variants, heading levels, and data-testid passthrough', () => {
    const { rerender } = render(
      <PageHeader
        data-testid='page-header'
        icon={<span data-testid='ph-icon'>Icon</span>}
        eyebrow='Eyebrow text'
        title='Page Title'
        description='Page Description'
        actions={<button>Action</button>}
      />,
    );

    const header = screen.getByTestId('page-header');
    expect(header).toHaveClass('border-head-line');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page Title');
    expect(screen.getByText('Eyebrow text')).toHaveClass('text-sienna');
    expect(screen.getByText('Page Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    // ink rule span
    expect(header.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-accent');

    // Test heading level override and toolbar variant
    rerender(
      <PageHeader data-testid='page-header' variant='toolbar' as='h2' title='Toolbar Title' />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Toolbar Title');
    expect(screen.getByTestId('page-header')).toHaveClass('bg-white/95');
    expect(screen.getByTestId('page-header').querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('renders SectionHeader with count chip, heading level, and data-testid', () => {
    render(
      <SectionHeader
        data-testid='section-header'
        eyebrow='Overview'
        title='Section Title'
        count={5}
        actions={<button>Filter</button>}
      />,
    );
    expect(screen.getByTestId('section-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section Title');
    const chip = screen.getByText('5');
    expect(chip).toHaveClass('bg-kraft');
    expect(chip).toHaveClass('text-kraft-ink');
    expect(screen.getByText('Overview')).toHaveClass('text-sienna');
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('renders Card with featured border strip and semantic tone colors', () => {
    const { rerender } = render(
      <Card data-testid='card' featured tone='brand'>
        <CardBody data-testid='card-body'>Body Content</CardBody>
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('border-t-accent');
    expect(screen.getByTestId('card-body')).toHaveTextContent('Body Content');

    rerender(
      <Card data-testid='card' featured tone='ai'>
        <CardBody>AI Body</CardBody>
      </Card>,
    );
    expect(card).toHaveClass('border-t-violet-500');

    rerender(
      <Card data-testid='card' featured tone='warning'>
        <CardBody>Warning Body</CardBody>
      </Card>,
    );
    expect(card).toHaveClass('border-t-amber-500');
  });

  it('renders CardHeader with tone inheritance and tone-specific icon tile', () => {
    const { rerender } = render(
      <Card tone='success'>
        <CardHeader
          data-testid='card-header'
          icon={<span data-testid='icon'>Icon</span>}
          title='Success Card'
          subtitle='Card Subtitle'
          actions={<button>More</button>}
        />
      </Card>,
    );
    const cardHeader = screen.getByTestId('card-header');
    expect(cardHeader).toHaveClass('bg-head-wash');
    const iconTile = screen.getByTestId('icon').parentElement;
    expect(iconTile).toHaveClass('bg-emerald-100');
    expect(iconTile).toHaveClass('text-emerald-700');

    // AI tone changes band background to violet tint
    rerender(
      <Card tone='ai'>
        <CardHeader
          data-testid='card-header'
          icon={<span data-testid='icon'>Icon</span>}
          title='AI Card'
        />
      </Card>,
    );
    expect(cardHeader).toHaveClass('bg-violet-50/60');
    expect(screen.getByTestId('icon').parentElement).toHaveClass('bg-violet-100');
    expect(screen.getByTestId('icon').parentElement).toHaveClass('text-violet-700');
  });
});

describe('UIQ-10 shared primitives', () => {
  it('renders button variants, loading state, and an accessible icon button', () => {
    render(
      <>
        <Button variant='primary'>Save</Button>
        <Button loading>Saving</Button>
        <IconButton aria-label='Home' icon={<Home />} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('bg-[#EA580C]');
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders badge tones and resolves a domain status through the shared map', () => {
    render(
      <>
        <Badge tone='ai'>AI</Badge>
        <StatusBadge kind='assignment' status='Approved' data-testid='approved-status' />
      </>,
    );
    expect(screen.getByText('AI')).toHaveClass('bg-violet-50');
    expect(screen.getByTestId('approved-status')).toHaveClass('bg-emerald-50');
  });

  it('wires field labels, hints, errors, and native controls', () => {
    render(
      <>
        <Field label='Name' hint='Public name' error='Required' required>
          <Input />
        </Field>
        <Textarea aria-label='Notes' />
        <Select aria-label='Role'>
          <option>Writer</option>
        </Select>
      </>,
    );
    const input = screen.getByLabelText('Name*');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('hint');
    expect(input.getAttribute('aria-describedby')).toContain('error');
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('supports a labelled search clear action', () => {
    const onClear = vi.fn();
    render(
      <SearchInput
        aria-label='Search'
        value='draft'
        readOnly
        clearLabel='Clear search'
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('moves tab focus and selection with Arrow, Home, and End keys', () => {
    function Harness() {
      const [value, setValue] = useState('one');
      return (
        <Tabs
          aria-label='Sections'
          items={[
            { id: 'one', label: 'One' },
            { id: 'two', label: 'Two', count: 2 },
            { id: 'three', label: 'Three' },
          ]}
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Harness />);
    const first = screen.getByRole('tab', { name: 'One' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = screen.getByRole('tab', { name: 'Two2' });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(second, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Three' }), { key: 'Home' });
    expect(first).toHaveFocus();
  });

  it('renders empty, loading, metric, avatar, count, and progress states accessibly', () => {
    render(
      <>
        <EmptyState
          title='No chapters'
          description='Create the first chapter'
          action={<Button>Create</Button>}
        />
        <Skeleton data-testid='skeleton' width={120} height={16} />
        <Metric label='Pages' value={24} hint='Approved' />
        <Avatar name='Mai Anh' />
        <CountChip>7</CountChip>
        <ProgressBar value={0} max={0} label='Completion' data-testid='progress' />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'No chapters' })).toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '120px', height: '16px' });
    expect(screen.getByText('24')).toHaveClass('font-mono');
    expect(screen.getByLabelText('Mai Anh')).toHaveTextContent('MA');
    expect(screen.getByText('7')).toHaveClass('bg-kraft');
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('aria-valuemax', '0');
    expect(progress.firstElementChild).toHaveStyle({ width: '0%' });
  });
});

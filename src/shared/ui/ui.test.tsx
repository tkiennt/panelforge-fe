import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Home, Sparkles } from 'lucide-react';
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
  Select,
  SidebarItem,
  SidebarSection,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
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

describe('Button and IconButton', () => {
  it('renders variants, sizes, and active scale only on primary', () => {
    const { rerender } = render(
      <Button variant='primary' size='md'>
        Primary
      </Button>,
    );
    const primary = screen.getByRole('button', { name: 'Primary' });
    expect(primary).toHaveClass('bg-[#EA580C]');
    expect(primary).toHaveClass('active:scale-[0.98]');
    expect(primary).toHaveClass('min-h-[36px]');

    rerender(
      <Button variant='secondary' size='sm'>
        Secondary
      </Button>,
    );
    const secondary = screen.getByRole('button', { name: 'Secondary' });
    expect(secondary).toHaveClass('bg-white');
    expect(secondary).not.toHaveClass('active:scale-[0.98]');
    expect(secondary).toHaveClass('min-h-[32px]');

    rerender(<Button variant='ai'>AI</Button>);
    expect(screen.getByRole('button', { name: 'AI' })).toHaveClass('bg-violet-600');

    rerender(<Button variant='success'>Success</Button>);
    expect(screen.getByRole('button', { name: 'Success' })).toHaveClass('bg-emerald-600');

    rerender(<Button variant='warning'>Warning</Button>);
    expect(screen.getByRole('button', { name: 'Warning' })).toHaveClass('bg-amber-50');

    rerender(<Button variant='danger'>Danger</Button>);
    expect(screen.getByRole('button', { name: 'Danger' })).toHaveClass('text-rose-700');

    rerender(<Button variant='ghost'>Ghost</Button>);
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveClass('bg-transparent');
  });

  it('handles loading state with spinner and disables button', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick} leadingIcon={<Sparkles data-testid='leading-icon' />}>
        Loading
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Loading' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('leading-icon')).toBeNull();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders IconButton with required aria-label and size', () => {
    render(<IconButton aria-label='Settings' size='sm' icon={<span>⚙</span>} />);
    const iconBtn = screen.getByRole('button', { name: 'Settings' });
    expect(iconBtn).toHaveAttribute('aria-label', 'Settings');
    expect(iconBtn).toHaveClass('size-8');
  });
});

describe('Badge and StatusBadge', () => {
  it('renders tones and custom icons', () => {
    const { rerender } = render(
      <Badge tone='brand' icon={<span data-testid='badge-icon'>★</span>}>
        Brand
      </Badge>,
    );
    expect(screen.getByText('Brand')).toHaveClass('bg-orange-50');
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();

    rerender(<Badge tone='success'>Done</Badge>);
    expect(screen.getByText('Done')).toHaveClass('bg-emerald-50');
  });

  it('renders StatusBadge mapping domain enums to tones and i18n keys', () => {
    const { rerender } = render(<StatusBadge kind='assignment' status='Approved' />);
    expect(screen.getByText(/Approved|Đã duyệt/i)).toBeInTheDocument();

    rerender(<StatusBadge kind='changeRequest' status='Open' />);
    expect(screen.getByText(/Open|Cần sửa/i)).toHaveClass('bg-rose-50');

    rerender(<StatusBadge kind='consistencyFinding' status='Blocking' />);
    expect(screen.getByText(/Blocking|Lỗi chặn/i)).toHaveClass('bg-rose-50');
  });
});

describe('Field, Input, Textarea, Select, SearchInput', () => {
  it('wires field id, aria-describedby for hint and error, and aria-invalid', () => {
    const { rerender } = render(
      <Field label='Username' hint='Your unique handle'>
        <Input placeholder='Enter handle' />
      </Field>,
    );
    const input = screen.getByPlaceholderText('Enter handle');
    const hint = screen.getByText('Your unique handle');
    expect(input).toHaveAttribute('id');
    expect(input).toHaveAttribute('aria-describedby', hint.id);
    expect(input).not.toHaveAttribute('aria-invalid');

    rerender(
      <Field label='Username' error='Username is already taken'>
        <Input placeholder='Enter handle' />
      </Field>,
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Username is already taken');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('renders Textarea and Select with field context', () => {
    render(
      <Field label='Description'>
        <Textarea placeholder='Write bio' />
        <Select data-testid='role-select'>
          <option value='writer'>Writer</option>
        </Select>
      </Field>,
    );
    expect(screen.getByPlaceholderText('Write bio')).toHaveAttribute('id');
    expect(screen.getByTestId('role-select')).toHaveAttribute('id');
  });

  it('renders SearchInput with clear button and clear aria label', () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <SearchInput value='manga' onClear={onClear} clearAriaLabel='Clear filter' readOnly />,
    );
    const clearBtn = screen.getByRole('button', { name: 'Clear filter' });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();

    rerender(<SearchInput value='' onClear={onClear} />);
    expect(screen.queryByRole('button', { name: 'Clear filter' })).toBeNull();
  });
});

describe('Tabs', () => {
  it('renders tablist and tabs with roving tabindex and Arrow key navigation', () => {
    const onChange = vi.fn();
    const items = [
      { id: 'tab1', label: 'First' },
      { id: 'tab2', label: 'Second' },
      { id: 'tab3', label: 'Third' },
    ];
    render(<Tabs items={items} value='tab1' onChange={onChange} ariaLabel='Sections' />);

    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    const tab1 = screen.getByRole('tab', { name: 'First' });
    const tab2 = screen.getByRole('tab', { name: 'Second' });
    const tab3 = screen.getByRole('tab', { name: 'Third' });

    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab1).toHaveAttribute('tabIndex', '0');
    expect(tab1).toHaveClass('border-accent');
    expect(tab2).toHaveAttribute('aria-selected', 'false');
    expect(tab2).toHaveAttribute('tabIndex', '-1');

    tab1.focus();
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('tab2');

    fireEvent.keyDown(tab1, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('tab3');

    fireEvent.keyDown(tab3, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('tab1');
  });
});

describe('EmptyState and Skeleton', () => {
  it('renders EmptyState with dashed border, serif title, and action', () => {
    render(
      <EmptyState
        title='No Items Found'
        description='Create your first item to get started'
        action={<button>Create Item</button>}
      />,
    );
    expect(screen.getByTestId('empty-state')).toHaveClass('border-dashed');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('No Items Found');
    expect(screen.getByText('Create your first item to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
  });

  it('renders Skeleton with pulse animation and dimensions', () => {
    render(<Skeleton data-testid='skel' width={120} height={24} />);
    const skel = screen.getByTestId('skel');
    expect(skel).toHaveClass('animate-pulse');
    expect(skel).toHaveStyle({ width: '120px', height: '24px' });
  });
});

describe('ProgressBar, Metric, Avatar, CountChip', () => {
  it('guards against zero-division in ProgressBar (0/0 => 0%) and reflects progress', () => {
    const { rerender } = render(
      <ProgressBar data-testid='prog' value={0} max={0} label='Storage' />,
    );
    const prog = screen.getByTestId('prog');
    expect(prog).toHaveAttribute('role', 'progressbar');
    expect(prog).toHaveAttribute('aria-valuenow', '0');
    expect(prog.firstElementChild).toHaveStyle({ width: '0%' });

    rerender(<ProgressBar data-testid='prog' value={50} max={100} tone='success' />);
    expect(screen.getByTestId('prog')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByTestId('prog').firstElementChild).toHaveStyle({ width: '50%' });
    expect(screen.getByTestId('prog').firstElementChild).toHaveClass('bg-emerald-600');
  });

  it('renders Metric with font-mono value and hint', () => {
    render(<Metric label='Active Users' value='1,240' hint='Updated 5m ago' />);
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toHaveClass('font-mono');
    expect(screen.getByText('Updated 5m ago')).toBeInTheDocument();
  });

  it('renders Avatar with initials fallback and lazy image', () => {
    const { rerender } = render(<Avatar name='Monkey D. Luffy' size='md' />);
    expect(screen.getByText('ML')).toBeInTheDocument();

    rerender(<Avatar name='Zoro' src='https://example.com/zoro.jpg' size='sm' />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('src', 'https://example.com/zoro.jpg');
  });

  it('renders CountChip with kraft colors', () => {
    render(<CountChip count={42} data-testid='count-chip' />);
    const chip = screen.getByTestId('count-chip');
    expect(chip).toHaveClass('bg-kraft');
    expect(chip).toHaveClass('text-kraft-ink');
    expect(chip).toHaveTextContent('42');
  });
});

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/config/firebase';
import {
  ShieldCheck,
  Key,
  KeyRound,
  LogOut,
  Edit3,
  Camera,
  Check,
  X,
  Building2,
  Briefcase,
  RefreshCw,
  AlertCircle,
  Lock,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { TwoFactorSetupModal } from '@/shared/features/account/TwoFactorSetupModal';
import { ChangePasswordModal } from '@/shared/features/account/ChangePasswordModal';
import { authService } from '@/services/auth.service';
import { userService, UserProfileDto, UpdateUserProfileRequest } from '@/services/user.service';
import { workspaceService, WorkspaceDto } from '@/services/workspace.service';

export interface UserProfileProps {
  user?: User | null;
  onLogout: () => void;
  onOpenTwoFactor?: () => void;
  onShowToast?: (title: string, desc: string, type?: 'success' | 'error') => void;
}

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44403C]';

const AVATAR_PRESETS = [
  {
    id: 'p1',
    name: 'Shonen Mangaka',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=mangaka1',
  },
  { id: 'p2', name: 'Master Inker', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=inker' },
  { id: 'p3', name: 'Script Writer', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=writer' },
  {
    id: 'p4',
    name: 'Studio Producer',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=producer',
  },
];

const WORKSPACE_ROLE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PRODUCER: {
    label: 'Nhà sản xuất (Producer)',
    bg: 'bg-[#FFF2E6]',
    text: 'text-[#C2410C]',
    border: 'border-[#FDBA74]',
  },
  ARTIST: {
    label: 'Họa sĩ (Artist)',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  WRITER: {
    label: 'Biên kịch (Writer)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  LETTERER: {
    label: 'Chèn chữ (Letterer)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  EDITOR: {
    label: 'Biên tập viên (Editor)',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  READER: {
    label: 'Độc giả (Reader)',
    bg: 'bg-stone-50',
    text: 'text-stone-700',
    border: 'border-stone-200',
  },
};

export const UserProfileView: React.FC<UserProfileProps> = ({
  user: firebaseUser,
  onLogout,
  onOpenTwoFactor,
  onShowToast,
}) => {
  const navigate = useNavigate();

  // Profile data state
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editAvatar, setEditAvatar] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{
    username?: string;
    phone?: string;
    avatar?: string;
  }>({});

  // Modals state
  const [isTwoFactorOpen, setIsTwoFactorOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState<boolean>(false);
  const [activeJwtToken, setActiveJwtToken] = useState<string>('');

  // Toast / feedback message
  const [localFeedback, setLocalFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Entrance animation played state - ensures entrance animations only execute once on initial mount
  const [hasAnimatedMount, setHasAnimatedMount] = useState<boolean>(false);

  // Parallax refs for Manga Cover Spread background paper layers (zero re-renders on mousemove)
  const mangaSpreadRef = useRef<HTMLDivElement | null>(null);
  const paperBacking1Ref = useRef<HTMLDivElement | null>(null);
  const paperBacking2Ref = useRef<HTMLDivElement | null>(null);
  const halftoneBgRef = useRef<HTMLDivElement | null>(null);

  const showFeedback = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setLocalFeedback({ message, type });
      if (onShowToast) {
        onShowToast(type === 'success' ? 'Thành công' : 'Lỗi', message, type);
      }
      setTimeout(() => {
        setLocalFeedback(null);
      }, 4000);
    },
    [onShowToast],
  );

  // Nạp thông tin hồ sơ người dùng từ API hoặc localStorage fallback
  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);

    let loadedUser: UserProfileDto | null = null;
    try {
      const apiUser = await userService.getMyProfile();
      if (apiUser) {
        loadedUser = apiUser;
      }
    } catch {
      try {
        const storedStr = localStorage.getItem('user');
        const stored = storedStr ? JSON.parse(storedStr) : {};
        const email = firebaseUser?.email || stored.email || 'creator@panelforge.studio';
        const username =
          stored.fullName ||
          stored.username ||
          firebaseUser?.displayName ||
          email.split('@')[0] ||
          'Mangaka Creator';
        const avatar = stored.avatarUrl || stored.avatar || firebaseUser?.photoURL || null;

        loadedUser = {
          id: stored.id || 'usr-local-default',
          firebaseUid: firebaseUser?.uid || stored.firebaseUid || null,
          username,
          email,
          avatar,
          phoneNumber: stored.phoneNumber || null,
          isActive: true,
          role: stored.role || localStorage.getItem('userRole') || 'USER',
          createdAt: stored.createdAt || '2026-01-01T00:00:00Z',
        };
      } catch (e: any) {
        setProfileError(e?.message || 'Không thể tải thông tin hồ sơ.');
      }
    }

    if (loadedUser) {
      setProfile(loadedUser);
      setEditUsername(loadedUser.username);
      setEditPhone(loadedUser.phoneNumber || '');
      setEditAvatar(loadedUser.avatar || '');
    }
    setLoadingProfile(false);
  }, [firebaseUser]);

  // Nạp danh sách workspaces của người dùng
  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const list = await workspaceService.getMyWorkspaces();
      setWorkspaces(list || []);
    } catch (err) {
      console.warn('Không thể nạp danh sách workspace người dùng:', err);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadWorkspaces();
  }, [loadProfile, loadWorkspaces]);

  // Đánh dấu hoàn tất chuỗi animation xuất hiện sau 1000ms
  useEffect(() => {
    if (profile && !hasAnimatedMount) {
      const timer = setTimeout(() => {
        setHasAnimatedMount(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, hasAnimatedMount]);

  // Parallax chiều sâu theo con trỏ chuột cho khối Bìa truyện (chỉ di chuyển các lớp giấy phía sau, biên độ 6-10px)
  useEffect(() => {
    const container = mangaSpreadRef.current;
    if (!container) return;

    if (typeof window === 'undefined') return;
    const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPointerFine || isReduced) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        const clampedX = Math.max(-1, Math.min(1, x));
        const clampedY = Math.max(-1, Math.min(1, y));

        if (paperBacking1Ref.current) {
          paperBacking1Ref.current.style.transform = `translate3d(${-clampedX * 8}px, ${-clampedY * 6}px, 0) rotate(-1.5deg)`;
        }
        if (paperBacking2Ref.current) {
          paperBacking2Ref.current.style.transform = `translate3d(${clampedX * 6}px, ${clampedY * 4}px, 0) rotate(1.2deg)`;
        }
        if (halftoneBgRef.current) {
          halftoneBgRef.current.style.transform = `translate3d(${-clampedX * 3.5}px, ${-clampedY * 2.5}px, 0)`;
        }
      });
    };

    const handleMouseLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (paperBacking1Ref.current) {
        paperBacking1Ref.current.style.transform = 'translate3d(0, 0, 0) rotate(-1.5deg)';
      }
      if (paperBacking2Ref.current) {
        paperBacking2Ref.current.style.transform = 'translate3d(0, 0, 0) rotate(1.2deg)';
      }
      if (halftoneBgRef.current) {
        halftoneBgRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
    };

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Validation form chỉnh sửa
  const validateForm = (): boolean => {
    const errors: { username?: string; phone?: string; avatar?: string } = {};

    if (!editUsername.trim()) {
      errors.username = 'Tên hiển thị / bút danh là bắt buộc.';
    } else if (editUsername.length > 30) {
      errors.username = 'Tên không được vượt quá 30 ký tự.';
    }

    if (editPhone.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(editPhone.trim())) {
        errors.phone = 'Số điện thoại không đúng định dạng chuẩn.';
      }
    }

    if (editAvatar.trim()) {
      if (editAvatar.length > 2048) {
        errors.avatar = 'Đường dẫn ảnh avatar không được vượt quá 2048 ký tự.';
      } else if (
        !editAvatar.startsWith('http://') &&
        !editAvatar.startsWith('https://') &&
        !editAvatar.startsWith('data:image/')
      ) {
        errors.avatar = 'Link ảnh đại diện phải bắt đầu bằng https://, http:// hoặc data:image/';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !profile) return;

    setSaving(true);
    const payload: UpdateUserProfileRequest = {
      username: editUsername.trim(),
      phoneNumber: editPhone.trim() || null,
      avatar: editAvatar.trim() || null,
    };

    try {
      let updated: UserProfileDto | null = null;
      if (profile.id && profile.id !== 'usr-local-default') {
        updated = await userService.updateProfile(profile.id, payload);
      } else if (profile.firebaseUid) {
        updated = await userService.updateProfileByFirebaseUid(profile.firebaseUid, payload);
      } else {
        updated = {
          ...profile,
          username: payload.username,
          phoneNumber: payload.phoneNumber,
          avatar: payload.avatar,
        };
      }

      if (updated) {
        setProfile(updated);
        try {
          const storedStr = localStorage.getItem('user');
          const stored = storedStr ? JSON.parse(storedStr) : {};
          stored.fullName = updated.username;
          stored.username = updated.username;
          stored.avatarUrl = updated.avatar;
          stored.phoneNumber = updated.phoneNumber;
          localStorage.setItem('user', JSON.stringify(stored));
        } catch {
          // ignore
        }
      }

      setIsEditing(false);
      showFeedback('Hồ sơ tác giả đã được cập nhật thành công!', 'success');
    } catch (err: any) {
      showFeedback(err?.message || 'Không thể lưu thay đổi hồ sơ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditUsername(profile.username);
      setEditPhone(profile.phoneNumber || '');
      setEditAvatar(profile.avatar || '');
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const handleOpen2FA = async () => {
    let currentToken = localStorage.getItem('token') || '';
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await authService.externalLogin(idToken);
        if (res?.token) {
          currentToken = res.token;
        }
      } catch (err) {
        console.error('Lỗi đồng bộ token backend từ Firebase:', err);
      }
    }

    setActiveJwtToken(currentToken);
    if (onOpenTwoFactor) {
      onOpenTwoFactor();
    } else {
      setIsTwoFactorOpen(true);
    }
  };

  const is2faActive = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? Boolean(JSON.parse(savedUser).isTwoFactorEnabled) : false;
    } catch {
      return false;
    }
  }, []);

  const handleLogoutClick = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('activeWorkspace');
      onLogout();
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    }
  };

  const userInitials = useMemo(() => {
    if (!profile?.username) return 'PF';
    const parts = profile.username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return profile.username.slice(0, 2).toUpperCase();
  }, [profile]);

  const formattedJoinDate = useMemo(() => {
    if (!profile?.createdAt) return 'Gia nhập: Mới đây';
    try {
      return `Gia nhập: ${new Date(profile.createdAt).toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric',
      })}`;
    } catch {
      return 'Gia nhập: Mới đây';
    }
  }, [profile]);

  if (loadingProfile && !profile) {
    return (
      <div className='w-full min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-[#F3F0E9] text-[#44403C]'>
        <RefreshCw className='w-8 h-8 animate-spin text-[#F97316]' />
        <p className='text-sm font-medium'>Đang nạp hồ sơ tác giả PanelForge...</p>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen min-w-0 bg-[#F3F0E9] font-sans text-[#44403C] selection:bg-[#F97316]/20'>
      {/* Scoped CSS keyframes for Manga Cover entrance sequence & manuscript ink motions */}
      <style>{`
        @keyframes mangaCoverSpreadEnter {
          0% {
            opacity: 0.86;
            transform: translateY(12px) scale(0.995);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes mangaPortraitReveal {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes mangaInfoReveal {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hiệu ứng mực in manga hơi loang nhẹ và sần viền chữ (Manga Manuscript Ink Bleed) */
        .pf-ink-bleed-title {
          filter: url(#pf-manuscript-ink-bleed);
          color: #1c1917;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: subpixel-antialiased;
        }
        @supports not (filter: url(#pf-manuscript-ink-bleed)) {
          .pf-ink-bleed-title {
            filter: none;
          }
        }

        /* Quệt nét cọ cam từ trái sang phải bằng clip-path giữ nguyên tỷ lệ tự nhiên */
        @keyframes brushWipeReveal {
          0% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
          }
          20% {
            opacity: 0.95;
          }
          100% {
            clip-path: inset(0 0% 0 0);
            opacity: 0.82;
          }
        }

        @keyframes strokeDrawCheck {
          0% {
            stroke-dashoffset: 24;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        .pf-cover-enter {
          animation: mangaCoverSpreadEnter 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .pf-portrait-enter {
          animation: mangaPortraitReveal 480ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
        }

        .pf-info-enter {
          animation: mangaInfoReveal 480ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;
        }

        .pf-brush-wipe {
          clip-path: inset(0 100% 0 0);
          animation: brushWipeReveal 620ms cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards;
          will-change: clip-path, opacity;
        }

        /* Micro-interactions: Card Hover Lift (max 2-3px) */
        .pf-editorial-card {
          transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease-out;
        }
        @media (hover: hover) and (pointer: fine) {
          .pf-editorial-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px -4px rgba(68, 64, 60, 0.08);
          }
        }

        /* Respect prefers-reduced-motion: zero shifts, instant full display */
        @media (prefers-reduced-motion: reduce) {
          .pf-cover-enter,
          .pf-portrait-enter,
          .pf-info-enter,
          .pf-brush-wipe {
            animation: none !important;
            transform: none !important;
            opacity: 0.82 !important;
            clip-path: none !important;
          }
          .pf-editorial-card {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* SVG Filter cho hiệu ứng mực in loang sần mép (Manga Manuscript Ink Bleed) */}
      <svg
        width='0'
        height='0'
        className='absolute pointer-events-none -z-50 overflow-hidden'
        aria-hidden='true'
        focusable='false'
      >
        <defs>
          <filter
            id='pf-manuscript-ink-bleed'
            x='-10%'
            y='-10%'
            width='120%'
            height='120%'
            filterUnits='objectBoundingBox'
          >
            {/* Nhiễu hạt vi mô mô phỏng xơ sợi giấy bản thảo Nhật Bản */}
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.065 0.065'
              numOctaves='2'
              seed='23'
              result='paperGrain'
            />
            {/* Độ dịch chuyển tinh tế (1.25px) giúp mép chữ sần tự nhiên nhưng thân chữ và dấu tiếng Việt sắc nét */}
            <feDisplacementMap
              in='SourceGraphic'
              in2='paperGrain'
              scale='1.25'
              xChannelSelector='R'
              yChannelSelector='G'
              result='raggedEdge'
            />
            {/* Ghép lớp mép sần với bản gốc để bảo toàn 100% độ đậm và nét dấu tiếng Việt */}
            <feMerge>
              <feMergeNode in='raggedEdge' />
              <feMergeNode in='SourceGraphic' opacity='0.92' />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className='flex min-w-0 flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-6 w-full'>
        {/* Header ngữ cảnh đồng bộ với WorkspaceView (Quy trình sản xuất) */}
        <header className='flex min-w-0 flex-col gap-4 border-b border-[#D8D2C5] pb-5 lg:flex-row lg:items-end lg:justify-between'>
          <div className='min-w-0'>
            {/* Nhãn phân loại phụ */}
            <div className='flex items-center gap-2 mb-1.5'>
              <h1 className='inline-flex items-center rounded border border-stone-300 bg-stone-200/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-stone-700 font-mono'>
                Hồ sơ cá nhân
              </h1>
              <span className='inline-flex items-center rounded-md border border-stone-300 bg-[#FCFBF8] px-2 py-0.5 text-xs font-semibold text-[#57534E]'>
                Studio Creator
              </span>
            </div>

            {/* Tiêu đề chính */}
            <h2 className='font-serif text-2xl font-bold tracking-tight text-[#44403C] sm:text-3xl'>
              Hồ Sơ Tác Giả &amp; Không Gian Sáng Tác
            </h2>
            <p className='text-xs sm:text-sm text-[#57534E] mt-1'>
              Quản lý định danh tác giả manga, thông tin liên lạc và vai trò trong các xưởng sáng
              tác.
            </p>
          </div>

          {/* Nhóm nút hành động trên header */}
          <div className='flex flex-wrap items-center gap-2.5 shrink-0'>
            <button
              type='button'
              onClick={() => void loadProfile()}
              aria-label='Làm mới hồ sơ'
              title='Làm mới hồ sơ'
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] px-3.5 text-sm font-semibold text-[#44403C] hover:bg-white shadow-2xs transition-colors cursor-pointer active:scale-[0.99] ${focusRing}`}
            >
              <RefreshCw
                className={`h-4 w-4 text-[#57534E] ${loadingProfile ? 'animate-spin' : ''}`}
                aria-hidden='true'
              />
              <span className='max-sm:sr-only'>Đồng bộ</span>
            </button>
          </div>
        </header>

        {/* Global Feedback Banner with SVG animated checkmark */}
        {localFeedback && (
          <div
            role='status'
            aria-live='polite'
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
              localFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className='flex items-center gap-2.5 font-medium'>
              {localFeedback.type === 'success' ? (
                <svg
                  className='w-4 h-4 text-emerald-600 shrink-0'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'
                >
                  <path
                    d='M20 6L9 17l-5-5'
                    style={{
                      strokeDasharray: 24,
                      animation: 'strokeDrawCheck 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    }}
                  />
                </svg>
              ) : (
                <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
              )}
              <span>{localFeedback.message}</span>
            </div>
            <button
              type='button'
              onClick={() => setLocalFeedback(null)}
              className='p-1 hover:opacity-70 cursor-pointer'
              aria-label='Đóng thông báo'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          </div>
        )}

        {/* Profile Error Banner */}
        {profileError && (
          <div className='p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 text-rose-600' />
              <span>{profileError}</span>
            </div>
            <button
              type='button'
              onClick={() => void loadProfile()}
              className='underline hover:text-rose-900 font-medium cursor-pointer'
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* KHỐI NHẬN DIỆN: BÌA TRUYỆN CÁ NHÂN CỦA TÁC GIẢ (MANGA COVER SPREAD BANNER) */}
        {/* Lấy cảm hứng trực tiếp từ bố cục bản thảo HeroMangaPage & LandingPageView   */}
        {/* ========================================================================= */}
        <section
          ref={mangaSpreadRef}
          aria-label='Bìa truyện cá nhân của tác giả'
          className={`relative w-full min-w-0 select-none ${
            !hasAnimatedMount ? 'pf-cover-enter' : ''
          }`}
        >
          {/* Lớp giấy bản thảo lệch phía sau tạo chiều sâu 3D (Hero-inspired manuscript paper stack) */}
          <div
            ref={paperBacking1Ref}
            className='absolute -inset-1.5 rounded-2xl bg-[#FAF7F0] border border-[#D8D2C5] shadow-xs pointer-events-none -z-20 transition-transform duration-300 ease-out motion-reduce:hidden'
            style={{ transform: 'translate3d(0, 0, 0) rotate(-1.5deg)' }}
            aria-hidden='true'
          />
          <div
            ref={paperBacking2Ref}
            className='absolute -inset-0.5 rounded-2xl bg-[#F5F1E8] border border-[#E0D8C8] pointer-events-none -z-10 transition-transform duration-300 ease-out motion-reduce:hidden'
            style={{ transform: 'translate3d(0, 0, 0) rotate(1.2deg)' }}
            aria-hidden='true'
          />

          {/* Khung Bìa Truyện Chính (Main Manga Spread Frame) */}
          <div className='relative w-full rounded-2xl bg-[#FCFBF8] border-2 border-[#D8D2C5] shadow-[0_12px_36px_rgba(68,64,60,0.08)] overflow-hidden z-10'>
            {/* Dấu định vị cúp góc bản thảo truyện tranh (Registration Marks) */}
            <div
              className='absolute top-2.5 left-3 text-[#D8D2C5] font-mono text-[10px] select-none pointer-events-none tracking-widest'
              aria-hidden='true'
            >
              ⌜ PF-COVER
            </div>
            <div
              className='absolute top-2.5 right-3 text-[#D8D2C5] font-mono text-[10px] select-none pointer-events-none tracking-widest'
              aria-hidden='true'
            >
              MANGA SPREAD ⌝
            </div>
            <div
              className='absolute bottom-2 left-3 text-[#D8D2C5] font-mono text-[9px] select-none pointer-events-none hidden sm:block'
              aria-hidden='true'
            >
              ⌞ CHAPTER: AUTHOR PROFILE
            </div>
            <div
              className='absolute bottom-2 right-3 text-[#D8D2C5] font-mono text-[9px] select-none pointer-events-none'
              aria-hidden='true'
            >
              ⌟
            </div>

            {/* Bố cục hai panel manga có thứ bậc rõ rệt & đường phân chia gutter thống nhất */}
            <div className='grid grid-cols-1 lg:grid-cols-[minmax(280px,34%)_minmax(0,1fr)] w-full items-stretch min-h-[290px]'>
              {/* ================= PANEL CHÂN DUNG (BÊN TRÁI ~34%) ================= */}
              <div className='relative p-6 sm:p-7 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#D8D2C5] bg-[#FAF8F5]/80 overflow-hidden'>
                {/* Họa tiết Halftone Manga tinh tế phía sau avatar (chỉ ở vùng trang trí) */}
                <div
                  ref={halftoneBgRef}
                  className='absolute inset-0 pointer-events-none opacity-20 -z-0 transition-transform duration-300 ease-out'
                  aria-hidden='true'
                >
                  <svg className='w-full h-full' xmlns='http://www.w3.org/2000/svg'>
                    <defs>
                      <pattern
                        id='portrait-manga-halftone'
                        width='10'
                        height='10'
                        patternUnits='userSpaceOnUse'
                      >
                        <circle cx='2.5' cy='2.5' r='1.1' fill='#44403C' />
                        <circle cx='7.5' cy='7.5' r='1.1' fill='#44403C' />
                      </pattern>
                    </defs>
                    <rect width='100%' height='100%' fill='url(#portrait-manga-halftone)' />
                  </svg>
                </div>

                {/* Nhãn docket góc panel chân dung */}
                <div className='w-full flex items-center justify-between mb-3 text-[10px] font-mono text-[#57534E] font-bold uppercase tracking-wider relative z-10'>
                  <span>PANEL 01 · CHÂN DUNG</span>
                  <span className='text-stone-400'>[ 1:1 ]</span>
                </div>

                {/* Khung Chân Dung Lớn (Portrait Frame with Breathing Room & Double Ink Border) */}
                <div
                  className={`relative group/avatar my-1 ${
                    !hasAnimatedMount ? 'pf-portrait-enter' : ''
                  }`}
                >
                  <div className='w-32 h-32 sm:w-40 sm:h-40 lg:w-44 lg:h-44 rounded-2xl border-2 border-[#D8D2C5] p-1.5 bg-[#FCFBF8] shadow-soft-sm relative transition-transform duration-200 group-hover/avatar:border-[#C2410C]/60'>
                    {profile?.avatar && profile.avatar.trim() ? (
                      <img
                        src={profile.avatar}
                        alt={profile.username}
                        className='w-full h-full rounded-xl object-cover bg-stone-100 shadow-2xs select-none'
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className='w-full h-full rounded-xl bg-[#FFF2E6] border border-[#FDBA74]/50 flex items-center justify-center text-[#C2410C] font-serif font-black text-4xl sm:text-5xl shadow-2xs select-none'>
                        {userInitials}
                      </div>
                    )}

                    {/* Nút đổi ảnh đại diện (Hiển thị mượt mà trên hover/focus 180ms) */}
                    <button
                      type='button'
                      onClick={() => setIsAvatarPickerOpen(true)}
                      title='Đổi ảnh đại diện'
                      aria-label='Đổi ảnh đại diện'
                      className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#FCFBF8] border-2 border-[#D8D2C5] text-[#44403C] hover:border-[#F97316] hover:text-[#C2410C] flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer sm:opacity-95 sm:group-hover/avatar:scale-105 sm:group-hover/avatar:opacity-100 focus-visible:opacity-100 focus-visible:scale-105 active:scale-95 ${focusRing}`}
                    >
                      <Camera className='w-4 h-4' />
                    </button>
                  </div>
                </div>

                {/* Trạng thái xác thực & hoạt động dưới chân dung */}
                <div className='mt-3.5 flex flex-col items-center gap-1 text-center relative z-10'>
                  <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                    Đang hoạt động
                  </span>
                  <span className='text-[10px] text-[#57534E] font-mono'>
                    Xác thực bởi PanelForge Studio
                  </span>
                </div>
              </div>

              {/* ================= PANEL THÔNG TIN TÁC GIẢ (BÊN PHẢI ~66%) ================= */}
              <div
                className={`p-6 sm:p-7 flex flex-col justify-between relative bg-[#FCFBF8] ${
                  !hasAnimatedMount ? 'pf-info-enter' : ''
                }`}
              >
                {/* Hàng 1: Docket Header & Nút Chỉnh Sửa Hồ Sơ */}
                <div className='flex items-center justify-between gap-3 pb-2 border-b border-[#EAE5DC]'>
                  <div className='flex items-center gap-2 text-xs font-mono text-[#57534E]'>
                    <span className='font-bold text-[#1C1917] tracking-wider uppercase'>
                      PF / MANGA COVER
                    </span>
                    <span className='text-[#D8D2C5]'>—</span>
                    <span className='uppercase tracking-wider hidden sm:inline'>
                      TẬP HỒ SƠ TÁC GIẢ
                    </span>
                  </div>

                  {/* Nút “Chỉnh sửa hồ sơ” đặt nổi bật ngay tại đây */}
                  {!isEditing && (
                    <button
                      type='button'
                      onClick={() => setIsEditing(true)}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all cursor-pointer active:scale-[0.99] ${focusRing}`}
                    >
                      <Edit3 className='h-3.5 w-3.5' aria-hidden='true' />
                      <span>Chỉnh sửa hồ sơ</span>
                    </button>
                  )}
                </div>

                {/* Hàng 2: Typography Tên Tác Giả & Nét Bút Cam Bản Thảo */}
                <div className='my-auto py-3'>
                  <div className='relative inline-block max-w-full'>
                    {/* Tên hiển thị là text thật, có thể bôi đen & đọc bằng screen reader */}
                    <h2
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                      className='pf-ink-bleed-title text-2xl sm:text-3xl lg:text-4xl xl:text-[2.65rem] font-bold text-[#1C1917] tracking-tight leading-[1.12] select-text break-words relative z-10'
                    >
                      {profile?.username || 'Tác Giả PanelForge'}
                    </h2>

                    {/* Nét cọ cam quệt từ trái sang phải dưới baseline (620ms clip-path reveal) */}
                    <svg
                      className={`absolute -bottom-1 sm:-bottom-1.5 left-0 w-full max-w-[260px] sm:max-w-[320px] h-[10px] sm:h-[14px] pointer-events-none z-0 overflow-visible ${
                        !hasAnimatedMount ? 'pf-brush-wipe' : ''
                      }`}
                      viewBox='0 0 320 16'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      aria-hidden='true'
                    >
                      {/* Dáng nét cọ thư pháp manga với đầu vào thuôn, thân mở rộng và đuôi vuốt nhọn tự nhiên */}
                      <path
                        d='M 3 10 C 14 6.2, 40 8.5, 78 7.2 C 126 5.5, 192 9.5, 248 7.0 C 278 5.6, 304 7.2, 317 6.0 C 314 9.0, 286 11.2, 252 10.8 C 196 10.2, 134 13.0, 82 11.6 C 46 10.5, 16 12.2, 3 10 Z'
                        fill='#F97316'
                        opacity='0.82'
                      />
                      {/* Vệt xước cọ khô phụ tạo chiều sâu mực vẽ */}
                      <path
                        d='M 24 9.2 C 68 8.0, 142 10.5, 220 8.6 C 258 7.8, 290 8.5, 306 7.2'
                        stroke='#EA580C'
                        strokeWidth='1.2'
                        strokeLinecap='round'
                        opacity='0.4'
                      />
                    </svg>
                  </div>

                  {/* Username định danh & Vai trò hệ thống */}
                  <div className='mt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3'>
                    <span className='text-xs sm:text-sm font-mono text-[#57534E] font-medium'>
                      @{profile?.username?.toLowerCase().replace(/\s+/g, '_') || 'creator'}
                    </span>
                    <span className='text-stone-300'>·</span>
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold border ${
                        profile?.role === 'ADMINISTRATOR'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-[#F3F0E9] text-[#44403C] border-[#D8D2C5]'
                      }`}
                    >
                      {profile?.role === 'ADMINISTRATOR'
                        ? 'Quản Trị Viên Hệ Thống'
                        : 'Thành Viên Studio'}
                    </span>
                    <span className='text-stone-300'>·</span>
                    <span className='inline-flex items-center gap-1 text-[11px] text-[#57534E] font-mono'>
                      <Calendar className='w-3 h-3 text-stone-400' />
                      {formattedJoinDate}
                    </span>
                  </div>

                  {/* Lời tựa / Định hướng sáng tác manga */}
                  <p className='text-xs sm:text-[13px] text-[#57534E] mt-3 leading-relaxed max-w-2xl select-text'>
                    Không gian quản lý tác phẩm, kịch bản bản thảo và phối hợp sản xuất truyện tranh
                    chuyên nghiệp cùng các nghệ sĩ trong hệ thống PanelForge.
                  </p>
                </div>

                {/* Hàng 3: Metadata Chip Tóm Tắt Không Gian Sáng Tác */}
                <div className='pt-3 border-t border-[#EAE5DC] flex flex-wrap items-center justify-between gap-3 text-xs'>
                  <div className='flex items-center gap-3 text-[11px] font-mono text-[#57534E]'>
                    <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#D8D2C5]'>
                      <Building2 className='w-3 h-3 text-[#F97316]' />
                      Tham gia:{' '}
                      <strong className='text-[#44403C]'>{workspaces.length} Studio</strong>
                    </span>
                    <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#D8D2C5]'>
                      <Key className='w-3 h-3 text-[#C2410C]' />
                      2FA:{' '}
                      <strong className={is2faActive ? 'text-emerald-700' : 'text-amber-700'}>
                        {is2faActive ? 'BẢO VỆ' : 'CHƯA BẬT'}
                      </strong>
                    </span>
                  </div>

                  <span className='text-[10px] font-mono text-stone-400 select-none'>
                    PANELFORGE STUDIO ARCHIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PHẦN THÔNG TIN PHÍA DƯỚI: FORM CÁ NHÂN, BẢO MẬT & WORKSPACE THỰC TẾ       */}
        {/* ========================================================================= */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0'>
          {/* ================= CỘT TRÁI (7 COLS): THÔNG TIN HỒ SƠ & FORM CHỈNH SỬA ================= */}
          <div className='lg:col-span-7 space-y-6 min-w-0'>
            <div className='pf-editorial-card bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 sm:p-6 shadow-2xs'>
              <div className='flex items-center justify-between pb-4 border-b border-[#E7E2D9] mb-5'>
                <div>
                  <h3 className='text-base font-serif font-bold text-[#44403C]'>
                    Thông Tin Hồ Sơ Cá Nhân
                  </h3>
                  <p className='text-xs text-[#57534E] mt-0.5'>
                    Thông tin định danh của bạn được hiển thị trong các dự án và phân công công
                    việc.
                  </p>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold border ${
                    isEditing
                      ? 'bg-[#FFF2E6] text-[#C2410C] border-[#FDBA74]'
                      : 'bg-[#F3F0E9] text-[#57534E] border-[#D8D2C5]'
                  }`}
                >
                  {isEditing ? 'ĐANG CHỈNH SỬA' : 'CHẾ ĐỘ XEM'}
                </span>
              </div>

              {!isEditing ? (
                /* VIEW MODE: Bảng hiển thị thông tin rõ ràng */
                <div className='space-y-4 animate-in fade-in-50 duration-200'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg shadow-2xs'>
                      <span className='text-[10px] font-mono uppercase tracking-wider text-[#57534E] block mb-1 font-semibold'>
                        Tên hiển thị / Bút danh
                      </span>
                      <span className='text-sm font-semibold text-[#44403C] block'>
                        {profile?.username || '—'}
                      </span>
                    </div>

                    <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg shadow-2xs'>
                      <span className='text-[10px] font-mono uppercase tracking-wider text-[#57534E] block mb-1 font-semibold'>
                        Username định danh
                      </span>
                      <span className='text-sm font-mono text-[#44403C] block'>
                        @{profile?.username?.toLowerCase().replace(/\s+/g, '_') || 'creator'}
                      </span>
                    </div>

                    <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg shadow-2xs'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-[10px] font-mono uppercase tracking-wider text-[#57534E] font-semibold'>
                          Địa chỉ Email
                        </span>
                        <span className='text-[9px] font-mono text-[#57534E] bg-[#EFECE6] px-1.5 rounded'>
                          Nội bộ
                        </span>
                      </div>
                      <span className='text-sm font-medium text-[#44403C] block truncate'>
                        {profile?.email || '—'}
                      </span>
                    </div>

                    <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg shadow-2xs'>
                      <span className='text-[10px] font-mono uppercase tracking-wider text-[#57534E] block mb-1 font-semibold'>
                        Số điện thoại liên hệ
                      </span>
                      <span className='text-sm text-[#44403C] block'>
                        {profile?.phoneNumber ? (
                          <span className='font-mono tabular-nums'>{profile.phoneNumber}</span>
                        ) : (
                          <span className='text-[#A8A29E] italic text-xs'>Chưa cập nhật</span>
                        )}
                      </span>
                    </div>

                    <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg shadow-2xs'>
                      <span className='text-[10px] font-mono uppercase tracking-wider text-[#57534E] block mb-1 font-semibold'>
                        Vai trò hệ thống
                      </span>
                      <span className='text-sm font-medium text-[#44403C] block'>
                        {profile?.role === 'ADMINISTRATOR' ? 'Quản Trị Viên' : 'Thành Viên'}
                      </span>
                    </div>

                    <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg shadow-2xs'>
                      <span className='text-[10px] font-mono uppercase tracking-wider text-[#57534E] block mb-1 font-semibold'>
                        Trạng thái kích hoạt
                      </span>
                      <span className='text-sm font-medium text-emerald-700 flex items-center gap-1.5'>
                        <span className='w-2 h-2 rounded-full bg-emerald-500' />
                        Hoạt động bình thường
                      </span>
                    </div>
                  </div>

                  {/* Mã định danh tác giả (UUID) */}
                  <div className='p-3.5 bg-white border border-[#E7E2D9] rounded-lg flex items-center justify-between text-xs shadow-2xs'>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <Lock className='w-4 h-4 text-[#57534E] shrink-0' />
                      <div className='min-w-0'>
                        <span className='font-semibold text-[#44403C] block'>
                          Mã định danh tác giả (System UUID)
                        </span>
                        <span className='text-[10px] font-mono text-[#57534E] block truncate'>
                          {profile?.id || '—'}
                        </span>
                      </div>
                    </div>
                    <span className='text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 font-bold'>
                      VERIFIED
                    </span>
                  </div>

                  <div className='flex justify-end pt-2'>
                    <button
                      type='button'
                      onClick={() => setIsEditing(true)}
                      className={`min-h-10 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-[0.99] ${focusRing}`}
                    >
                      <Edit3 className='w-3.5 h-3.5' />
                      <span>Chỉnh sửa thông tin này</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* EDIT MODE: Form chỉnh sửa ổn định, không remount */
                <form
                  onSubmit={handleSaveProfile}
                  className='space-y-4 animate-in fade-in-50 duration-200'
                >
                  {/* Field: Username */}
                  <div>
                    <label
                      htmlFor='edit-username'
                      className='block text-xs font-bold text-[#44403C] mb-1'
                    >
                      Tên hiển thị / Bút danh tác giả <span className='text-[#C2410C]'>*</span>
                    </label>
                    <input
                      id='edit-username'
                      type='text'
                      value={editUsername}
                      onChange={(e) => {
                        setEditUsername(e.target.value);
                        if (formErrors.username) {
                          setFormErrors((prev) => ({ ...prev, username: undefined }));
                        }
                      }}
                      placeholder='Ví dụ: Tatsuki Fujimoto'
                      maxLength={30}
                      className={`min-h-10 w-full px-3.5 py-2 bg-white border rounded-lg text-xs sm:text-sm text-[#44403C] transition-colors ${focusRing} ${
                        formErrors.username
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-[#D8D2C5] focus:border-[#C2410C]'
                      }`}
                    />
                    <div className='flex justify-between items-center mt-1'>
                      {formErrors.username ? (
                        <span className='text-[11px] text-rose-600 font-medium'>
                          {formErrors.username}
                        </span>
                      ) : (
                        <span className='text-[10px] text-[#57534E]'>
                          Tên dùng để gán cho các bản thảo vẽ chì, inking và kịch bản.
                        </span>
                      )}
                      <span className='text-[10px] font-mono text-[#57534E] tabular-nums'>
                        {editUsername.length}/30
                      </span>
                    </div>
                  </div>

                  {/* Field: Phone */}
                  <div>
                    <label
                      htmlFor='edit-phone'
                      className='block text-xs font-bold text-[#44403C] mb-1'
                    >
                      Số điện thoại liên hệ (Tùy chọn)
                    </label>
                    <input
                      id='edit-phone'
                      type='text'
                      value={editPhone}
                      onChange={(e) => {
                        setEditPhone(e.target.value);
                        if (formErrors.phone) {
                          setFormErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      placeholder='Ví dụ: +84 901 234 567'
                      className={`min-h-10 w-full px-3.5 py-2 bg-white border rounded-lg text-xs sm:text-sm text-[#44403C] transition-colors ${focusRing} ${
                        formErrors.phone
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-[#D8D2C5] focus:border-[#C2410C]'
                      }`}
                    />
                    {formErrors.phone ? (
                      <span className='text-[11px] text-rose-600 font-medium mt-1 block'>
                        {formErrors.phone}
                      </span>
                    ) : (
                      <span className='text-[10px] text-[#57534E] mt-1 block'>
                        Dùng trong trường hợp khẩn cấp liên quan đến duyệt hạn nộp chương.
                      </span>
                    )}
                  </div>

                  {/* Field: Avatar URL */}
                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <label htmlFor='edit-avatar' className='text-xs font-bold text-[#44403C]'>
                        Đường dẫn ảnh đại diện (Avatar URL)
                      </label>
                      <button
                        type='button'
                        onClick={() => setIsAvatarPickerOpen(true)}
                        className='text-xs text-[#C2410C] hover:underline font-semibold cursor-pointer'
                      >
                        Chọn mẫu tác giả có sẵn
                      </button>
                    </div>
                    <input
                      id='edit-avatar'
                      type='text'
                      value={editAvatar}
                      onChange={(e) => {
                        setEditAvatar(e.target.value);
                        if (formErrors.avatar) {
                          setFormErrors((prev) => ({ ...prev, avatar: undefined }));
                        }
                      }}
                      placeholder='https://... hoặc chọn mẫu avatar bên dưới'
                      className={`min-h-10 w-full px-3.5 py-2 bg-white border rounded-lg text-xs sm:text-sm text-[#44403C] transition-colors ${focusRing} ${
                        formErrors.avatar
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-[#D8D2C5] focus:border-[#C2410C]'
                      }`}
                    />
                    {formErrors.avatar && (
                      <span className='text-[11px] text-rose-600 font-medium mt-1 block'>
                        {formErrors.avatar}
                      </span>
                    )}

                    {/* Quick Avatar Preview in Edit Mode */}
                    {editAvatar.trim() && (
                      <div className='mt-2 p-2.5 bg-white border border-[#E7E2D9] rounded-lg flex items-center gap-3'>
                        <img
                          src={editAvatar}
                          alt='Preview'
                          className='w-10 h-10 rounded-full border border-[#D8D2C5] object-cover bg-[#F8F6F0]'
                          onError={(e) => {
                            (e.target as HTMLElement).style.opacity = '0.3';
                          }}
                        />
                        <div className='text-[11px] text-[#57534E] truncate'>
                          <span className='font-semibold text-[#44403C] block'>Xem trước ảnh</span>
                          <span className='truncate block max-w-md'>{editAvatar}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Field: Read-Only Email */}
                  <div>
                    <label className='block text-xs font-bold text-[#57534E] mb-1'>
                      Địa chỉ Email tài khoản (Chỉ đọc)
                    </label>
                    <div className='relative'>
                      <input
                        type='email'
                        disabled
                        value={profile?.email || ''}
                        className='min-h-10 w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E7E2D9] rounded-lg text-xs sm:text-sm text-[#57534E] cursor-not-allowed select-none'
                      />
                      <Lock className='w-4 h-4 text-[#57534E] absolute right-3.5 top-1/2 -translate-y-1/2' />
                    </div>
                    <span className='text-[10px] text-[#57534E] mt-1 block'>
                      Email định danh tài khoản không thể chỉnh sửa trực tiếp vì lý do an toàn bảo
                      mật.
                    </span>
                  </div>

                  {/* Form Action Buttons */}
                  <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7E2D9]'>
                    <button
                      type='button'
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className={`min-h-10 px-4 py-2 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-white text-[#44403C] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.99] ${focusRing}`}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type='submit'
                      disabled={saving}
                      className={`min-h-10 px-5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 active:scale-[0.99] ${focusRing}`}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className='w-3.5 h-3.5 animate-spin' />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <Check className='w-3.5 h-3.5' />
                          <span>Lưu thay đổi</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ================= CỘT PHẢI (5 COLS): BẢO MẬT & PHIÊN ĐĂNG NHẬP ================= */}
          <div className='lg:col-span-5 space-y-6 min-w-0'>
            <div className='pf-editorial-card bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b border-[#E7E2D9]'>
                <ShieldCheck className='w-4 h-4 text-[#C2410C]' />
                <h4 className='text-xs font-mono font-bold tracking-wider uppercase text-[#44403C]'>
                  Bảo Mật &amp; Phiên Đăng Nhập
                </h4>
              </div>

              {/* 2FA Status Box */}
              <div className='p-3.5 bg-white border border-[#D8D2C5] rounded-lg space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-[#44403C] flex items-center gap-1.5'>
                    <Key className='w-3.5 h-3.5 text-[#C2410C]' />
                    Xác Thực 2 Bước (2FA)
                  </span>
                  {is2faActive ? (
                    <span className='text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'>
                      BẢO VỆ
                    </span>
                  ) : (
                    <span className='text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold'>
                      CHƯA BẬT
                    </span>
                  )}
                </div>
                <p className='text-[11px] text-[#57534E] leading-relaxed'>
                  Bảo vệ kịch bản, bản thảo gốc và tài nguyên studio bằng mã TOTP RFC 6238.
                </p>
                <button
                  type='button'
                  onClick={() => void handleOpen2FA()}
                  className={`w-full mt-1 min-h-10 px-3 py-2 bg-[#FCFBF8] hover:bg-white text-[#44403C] border border-[#D8D2C5] hover:border-[#F97316] text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.99] ${focusRing}`}
                >
                  <Key className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>
                    {is2faActive ? 'Quản lý Google Authenticator' : 'Cài đặt 2FA Authenticator'}
                  </span>
                </button>
              </div>

              {/* Đổi mật khẩu tài khoản */}
              <button
                type='button'
                onClick={() => {
                  const token = localStorage.getItem('token') || '';
                  setActiveJwtToken(token);
                  setIsChangePasswordOpen(true);
                }}
                className={`w-full min-h-10 px-3 py-2 bg-[#FCFBF8] hover:bg-white text-[#44403C] border border-[#D8D2C5] hover:border-[#F97316] text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.99] ${focusRing}`}
              >
                <KeyRound className='w-3.5 h-3.5 text-[#57534E]' />
                <span>Đổi mật khẩu tài khoản</span>
              </button>

              {/* Đăng xuất khỏi thiết bị */}
              <div className='pt-2 border-t border-[#E7E2D9]'>
                <button
                  type='button'
                  onClick={() => void handleLogoutClick()}
                  className={`w-full min-h-10 px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-[#EFECE6] text-[#57534E] hover:text-[#44403C] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99] ${focusRing}`}
                >
                  <LogOut className='w-3.5 h-3.5' />
                  <span>Đăng xuất khỏi thiết bị này</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HÀNG TOÀN CHIỀU RỘNG: XƯỞNG SÁNG TÁC ĐANG THAM GIA (STUDIO WORKSPACES)      */}
        {/* ========================================================================= */}
        <div className='w-full min-w-0'>
          <div className='pf-editorial-card bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4'>
            <div className='flex items-center justify-between pb-3 border-b border-[#E7E2D9]'>
              <div className='flex items-center gap-2'>
                <Building2 className='w-4 h-4 text-[#F97316]' />
                <h3 className='text-sm sm:text-base font-serif font-bold text-[#44403C]'>
                  Xưởng Sáng Tác Đang Tham Gia (Studio Workspaces)
                </h3>
              </div>
              <span className='text-xs font-mono text-[#57534E] tabular-nums'>
                {workspaces.length} Studio
              </span>
            </div>

            <p className='text-xs text-[#57534E] leading-relaxed'>
              Mỗi xưởng có phân quyền độc lập. Vai trò của bạn tại đây là vai trò sản xuất cụ thể,
              không bị cố định thành vai trò duy nhất toàn hệ thống.
            </p>

            {loadingWorkspaces ? (
              <div className='py-8 text-center text-[#57534E] flex items-center justify-center gap-2'>
                <RefreshCw className='w-4 h-4 animate-spin text-[#F97316]' />
                <span className='text-xs'>Đang tải danh sách xưởng truyện tranh...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className='py-8 text-center bg-white border border-dashed border-[#D8D2C5] rounded-lg p-5 space-y-2'>
                <Briefcase className='w-6 h-6 text-[#A8A29E] mx-auto' />
                <p className='text-xs font-semibold text-[#44403C]'>
                  Bạn chưa tham gia xưởng truyện tranh nào.
                </p>
                <p className='text-[11px] text-[#57534E] max-w-sm mx-auto'>
                  Hãy tạo Studio mới hoặc nhờ Producer gửi lời mời tham gia dự án qua email của bạn.
                </p>
                <button
                  type='button'
                  onClick={() => navigate('/workspaces')}
                  className={`mt-2 min-h-9 px-3.5 py-1.5 bg-[#44403C] hover:bg-[#292524] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.99] ${focusRing}`}
                >
                  <span>Khám phá Workspaces</span>
                  <ArrowRight className='w-3 h-3' />
                </button>
              </div>
            ) : (
              <div className='divide-y divide-[#E7E2D9] border border-[#E7E2D9] rounded-lg overflow-hidden bg-white'>
                {workspaces.map((ws) => {
                  const roleKey = String(ws.currentUserRole || 'ARTIST').toUpperCase();
                  const roleBadge =
                    WORKSPACE_ROLE_CONFIG[roleKey] || WORKSPACE_ROLE_CONFIG['ARTIST'];

                  return (
                    <div
                      key={ws.id}
                      className='p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors'
                    >
                      <div className='space-y-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='text-xs sm:text-sm font-bold text-[#44403C] truncate'>
                            {ws.name}
                          </span>
                          {ws.isOwner && (
                            <span className='text-[9px] font-mono font-bold bg-[#EAE5DC] text-[#44403C] px-1.5 py-0.2 rounded'>
                              CHỦ STUDIO
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2 text-[11px] text-[#57534E] font-mono tabular-nums'>
                          <span>{ws.memberCount || 1} thành viên</span>
                          <span>•</span>
                          <span>
                            Đã dùng: {Math.round((ws.usedStorageBytes || 0) / (1024 * 1024))} MB
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center gap-3 shrink-0 self-start sm:self-auto'>
                        <span
                          className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                        >
                          {roleBadge.label}
                        </span>
                        <button
                          type='button'
                          onClick={() => navigate(`/workspaces/${ws.id}`)}
                          className={`min-h-9 px-3 py-1 bg-[#FCFBF8] hover:bg-white border border-[#D8D2C5] text-[#44403C] text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs active:scale-[0.99] ${focusRing}`}
                        >
                          <span>Vào xưởng</span>
                          <ArrowRight className='w-3 h-3 text-[#57534E]' />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Presets Modal / Popover */}
      {isAvatarPickerOpen && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='avatar-modal-title'
          className='fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4'
        >
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between pb-3 border-b border-[#E7E2D9]'>
              <div className='flex items-center gap-2'>
                <Camera className='w-4 h-4 text-[#F97316]' />
                <h3 id='avatar-modal-title' className='text-sm font-bold text-[#44403C]'>
                  Chọn Mẫu Ảnh Đại Diện Tác Giả
                </h3>
              </div>
              <button
                type='button'
                onClick={() => setIsAvatarPickerOpen(false)}
                className='text-[#57534E] hover:text-[#44403C] cursor-pointer p-1'
                aria-label='Đóng hộp thoại'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <p className='text-xs text-[#57534E]'>
              Chọn nhanh avatar phong cách sáng tác manga hoặc dán link ảnh cá nhân của bạn:
            </p>

            <div className='grid grid-cols-2 gap-3'>
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type='button'
                  onClick={() => {
                    setEditAvatar(preset.url);
                    setIsAvatarPickerOpen(false);
                    if (!isEditing) setIsEditing(true);
                  }}
                  className={`p-3 rounded-lg border border-[#D8D2C5] hover:border-[#F97316] bg-white hover:bg-[#FFF2E6]/50 flex flex-col items-center gap-2 transition-all cursor-pointer ${focusRing}`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className='w-14 h-14 rounded-full border border-[#D8D2C5] bg-[#FAF8F5]'
                  />
                  <span className='text-[11px] font-semibold text-[#44403C] text-center'>
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            <div className='pt-2 flex justify-end'>
              <button
                type='button'
                onClick={() => setIsAvatarPickerOpen(false)}
                className={`min-h-9 px-4 py-1.5 bg-[#FCFBF8] hover:bg-white border border-[#D8D2C5] text-[#44403C] text-xs font-semibold rounded-lg cursor-pointer ${focusRing}`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={isTwoFactorOpen}
        token={activeJwtToken}
        twoFactorEnabled={is2faActive}
        isTwoFactorEnabled={is2faActive}
        onClose={() => setIsTwoFactorOpen(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        token={activeJwtToken}
        twoFactorEnabled={is2faActive}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export const UserProfile = UserProfileView;

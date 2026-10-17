import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { LogOut, User as UserIcon, ShieldCheck, Key, KeyRound } from 'lucide-react';
import { TwoFactorSetupModal } from '@/shared/features/account/TwoFactorSetupModal';
import { ChangePasswordModal } from '@/shared/features/account/ChangePasswordModal';
import { authService } from '@/services/auth.service';

interface UserProfileProps {
  // Firebase user chỉ có khi đăng nhập Google; đăng nhập email/mật khẩu dùng user backend trong localStorage.
  user?: User | null;
  onLogout: () => void;
  onOpenTwoFactor?: () => void;
}

const readStoredUser = (): { fullName?: string; email?: string; avatarUrl?: string } => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export const UserProfileView: React.FC<UserProfileProps> = ({
  user,
  onLogout,
  onOpenTwoFactor,
}) => {
  const storedUser = readStoredUser();
  const email = user?.email || storedUser.email || '';
  const photoUrl = user?.photoURL || storedUser.avatarUrl;
  const displayName = user?.displayName || storedUser.fullName || email.split('@')[0] || 'User';
  const [isTwoFactorOpen, setIsTwoFactorOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeJwtToken, setActiveJwtToken] = useState<string>('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      onLogout();
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const handleOpen2FA = async () => {
    let currentToken = localStorage.getItem('token') || '';

    // Nếu đang đăng nhập bằng Firebase và chưa có JWT Backend, tự động đổi Firebase idToken lấy .NET JWT
    if (user) {
      try {
        const idToken = await user.getIdToken();
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

  const is2faActive = (() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? Boolean(JSON.parse(savedUser).isTwoFactorEnabled) : false;
    } catch {
      return false;
    }
  })();

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-[#f5f5f5] p-6 text-[#0c0a09]'>
      <div className='bg-white rounded-2xl shadow-soft-sm p-8 w-full max-w-md border border-[#f0efed] space-y-6'>
        <div className='flex flex-col items-center'>
          {photoUrl && photoUrl.trim() ? (
            <img
              src={photoUrl}
              alt='Profile'
              className='w-24 h-24 rounded-full border-2 border-[#e7e5e4] mb-4 shadow-soft-sm object-cover'
            />
          ) : (
            <div className='w-24 h-24 rounded-full bg-[#fafafa] border-2 border-[#e7e5e4] mb-4 shadow-soft-sm flex items-center justify-center text-[#292524]'>
              <UserIcon className='w-10 h-10' />
            </div>
          )}
          <h2 className='text-2xl font-serif font-light text-[#0c0a09] mb-1 tracking-tight'>
            Hello, {displayName}!
          </h2>
          <p className='text-xs text-[#777169]'>{email}</p>
        </div>

        {/* 2FA Security Section */}
        <div className='bg-[#fafafa] border border-[#f0efed] rounded-xl p-4'>
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[#c2410c] shrink-0 mt-0.5'>
              <ShieldCheck className='w-4 h-4' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-1.5'>
                <h4 className='text-xs font-semibold text-[#0c0a09]'>Bảo mật 2FA (RFC 6238)</h4>
                <span className='text-xs font-mono font-medium bg-[#f0efed] text-[#292524] px-2 py-0.5 rounded-full uppercase'>
                  TOTP
                </span>
              </div>
              <p className='text-xs text-[#777169] mt-1 leading-relaxed'>
                Tích hợp mã xác thực 6 số trên Google Authenticator để bảo vệ bản thảo manga và tài
                sản studio.
              </p>
              <button
                type='button'
                onClick={handleOpen2FA}
                className='mt-3 w-full bg-white hover:bg-[#f0efed] text-[#0c0a09] border border-[#e7e5e4] hover:border-[#292524] text-xs font-medium py-2 px-3 rounded-full shadow-soft-sm transition-all flex items-center justify-center gap-2 cursor-pointer'
              >
                <Key className='w-3.5 h-3.5 text-[#292524]' />
                Cài đặt Google Authenticator (2FA)
              </button>
              <button
                type='button'
                onClick={() => {
                  const token = localStorage.getItem('token') || '';
                  setActiveJwtToken(token);
                  setIsChangePasswordOpen(true);
                }}
                className='mt-2 w-full bg-white hover:bg-[#f0efed] text-[#0c0a09] border border-[#e7e5e4] hover:border-[#292524] text-xs font-medium py-2 px-3 rounded-full shadow-soft-sm transition-all flex items-center justify-center gap-2 cursor-pointer'
              >
                <KeyRound className='w-3.5 h-3.5 text-[#292524]' />
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>

        <div className='pt-2 border-t border-[#f0efed] flex justify-center'>
          <button
            onClick={handleLogout}
            className='flex items-center gap-2 bg-[#292524] hover:bg-[#0c0a09] text-white px-6 py-2.5 rounded-full text-xs font-medium shadow-soft-sm transition-all duration-200 cursor-pointer'
          >
            <LogOut className='w-3.5 h-3.5' />
            Đăng xuất
          </button>
        </div>
      </div>

      <TwoFactorSetupModal
        isOpen={isTwoFactorOpen}
        token={activeJwtToken}
        twoFactorEnabled={is2faActive}
        isTwoFactorEnabled={is2faActive}
        onClose={() => setIsTwoFactorOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        token={activeJwtToken}
        twoFactorEnabled={(() => {
          try {
            const savedUser = localStorage.getItem('user');
            return savedUser ? Boolean(JSON.parse(savedUser).isTwoFactorEnabled) : false;
          } catch {
            return false;
          }
        })()}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export const UserProfile = UserProfileView;

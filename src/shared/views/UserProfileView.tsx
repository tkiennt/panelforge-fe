import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '@/firebase';
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
          localStorage.setItem('token', res.token);
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
    <div className='flex flex-col items-center justify-center min-h-screen bg-[#F8F6F0] p-6'>
      <div className='bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-[#e7e7e7] space-y-6'>
        <div className='flex flex-col items-center'>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt='Profile'
              className='w-24 h-24 rounded-full border-4 border-[#F97316] mb-4 shadow-lg object-cover'
            />
          ) : (
            <div className='w-24 h-24 rounded-full bg-[#F3F4F6] border-4 border-[#F97316] mb-4 shadow-lg flex items-center justify-center'>
              <UserIcon className='w-10 h-10 text-[#9CA3AF]' />
            </div>
          )}
          <h2 className='text-2xl font-bold text-[#171717] mb-1 font-display'>
            Hello, {displayName}!
          </h2>
          <p className='text-sm text-[#525252]'>{email}</p>
        </div>

        {/* 2FA Security Section */}
        <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-4'>
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shrink-0 mt-0.5'>
              <ShieldCheck className='w-4 h-4' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-1.5'>
                <h4 className='text-xs font-bold text-[#171717]'>Bảo mật 2FA (RFC 6238)</h4>
                <span className='text-[9px] font-mono font-bold bg-[#171717] text-white px-1.5 py-0.2 rounded'>
                  TOTP
                </span>
              </div>
              <p className='text-[11px] text-[#666666] mt-1 leading-relaxed'>
                Tích hợp mã xác thực 6 số trên Google Authenticator để bảo vệ bản thảo manga và tài
                sản studio.
              </p>
              <button
                type='button'
                onClick={handleOpen2FA}
                className='mt-3 w-full bg-white hover:bg-[#FAF8F5] text-[#171717] hover:text-[#F97316] border border-[#E7E7E7] hover:border-[#F97316] text-xs font-semibold py-2 px-3 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer'
              >
                <Key className='w-3.5 h-3.5 text-[#F97316]' />
                Cài đặt Google Authenticator (2FA)
              </button>
              <button
                type='button'
                onClick={() => {
                  const token = localStorage.getItem('token') || '';
                  setActiveJwtToken(token);
                  setIsChangePasswordOpen(true);
                }}
                className='mt-2 w-full bg-white hover:bg-[#FAF8F5] text-[#171717] hover:text-[#F97316] border border-[#E7E7E7] hover:border-[#F97316] text-xs font-semibold py-2 px-3 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer'
              >
                <KeyRound className='w-3.5 h-3.5 text-[#F97316]' />
                Change Password
              </button>
            </div>
          </div>
        </div>

        <div className='pt-2 border-t border-[#E7E7E7] flex justify-center'>
          <button
            onClick={handleLogout}
            className='flex items-center gap-2 bg-[#171717] hover:bg-[#262626] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer'
          >
            <LogOut className='w-3.5 h-3.5' />
            Sign Out
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

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
    <div className='flex flex-col items-center justify-center min-h-screen bg-[#F3F0E9] p-6 text-[#1C1917]'>
      <div className='bg-[#FCFBF8] rounded-2xl shadow-soft-sm p-8 w-full max-w-md border border-[#D8D2C5] space-y-6'>
        <div className='flex flex-col items-center'>
          {photoUrl && photoUrl.trim() ? (
            <img
              src={photoUrl}
              alt='Profile'
              className='w-24 h-24 rounded-full border-2 border-[#D8D2C5] mb-4 shadow-soft-sm object-cover'
            />
          ) : (
            <div className='w-24 h-24 rounded-full bg-[#F8F6F0] border-2 border-[#D8D2C5] mb-4 shadow-soft-sm flex items-center justify-center text-[#C2410C]'>
              <UserIcon className='w-10 h-10' />
            </div>
          )}
          <h2 className='text-2xl font-serif font-bold text-[#1C1917] mb-1 tracking-tight'>
            Xin chào, {displayName}!
          </h2>
          <p className='text-xs text-[#57534E]'>{email}</p>
        </div>

        {/* 2FA Security Section */}
        <div className='bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl p-4'>
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 rounded-full bg-[#FFF2E6] border border-[#FDBA74] flex items-center justify-center text-[#C2410C] shrink-0 mt-0.5 shadow-2xs'>
              <ShieldCheck className='w-4 h-4' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-1.5'>
                <h4 className='text-xs font-bold text-[#1C1917]'>Bảo mật 2FA (RFC 6238)</h4>
                <span className='text-xs font-mono font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] px-2 py-0.5 rounded-full uppercase'>
                  TOTP
                </span>
              </div>
              <p className='text-xs text-[#57534E] mt-1 leading-relaxed'>
                Tích hợp mã xác thực 6 số trên Google Authenticator để bảo vệ bản thảo manga và tài
                sản studio.
              </p>
              <button
                type='button'
                onClick={handleOpen2FA}
                className='mt-3 w-full bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] border border-[#D8D2C5] hover:border-[#F97316] text-xs font-semibold py-2 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer'
              >
                <Key className='w-3.5 h-3.5 text-[#C2410C]' />
                Cài đặt Google Authenticator (2FA)
              </button>
              <button
                type='button'
                onClick={() => {
                  const token = localStorage.getItem('token') || '';
                  setActiveJwtToken(token);
                  setIsChangePasswordOpen(true);
                }}
                className='mt-2 w-full bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] border border-[#D8D2C5] hover:border-[#F97316] text-xs font-semibold py-2 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer'
              >
                <KeyRound className='w-3.5 h-3.5 text-[#57534E]' />
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>

        <div className='pt-2 border-t border-[#D8D2C5] flex justify-center'>
          <button
            onClick={handleLogout}
            className='flex items-center gap-2 bg-[#1C1917] hover:bg-[#57534E] text-[#FCFBF8] px-6 py-2.5 rounded-xl text-xs font-semibold shadow-soft-sm transition-all duration-200 cursor-pointer active:scale-95'
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

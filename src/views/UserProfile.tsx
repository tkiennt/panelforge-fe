import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogOut, User as UserIcon } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-[#F8F6F0] p-6'>
      <div className='bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-[#e7e7e7]'>
        <div className='flex flex-col items-center'>
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt='Profile'
              className='w-24 h-24 rounded-full border-4 border-[#F97316] mb-4 shadow-lg object-cover'
            />
          ) : (
            <div className='w-24 h-24 rounded-full bg-[#F3F4F6] border-4 border-[#F97316] mb-4 shadow-lg flex items-center justify-center'>
              <UserIcon className='w-10 h-10 text-[#9CA3AF]' />
            </div>
          )}
          <h2 className='text-2xl font-bold text-[#171717] mb-2 font-display'>
            Hello, {user.displayName || user.email?.split('@')[0] || 'User'}!
          </h2>
          <p className='text-sm text-[#525252] mb-6'>{user.email}</p>

          <button
            onClick={handleLogout}
            className='flex items-center gap-2 bg-[#171717] hover:bg-[#262626] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200'
          >
            <LogOut className='w-4 h-4' />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

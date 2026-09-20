import { useState } from 'react';
import { authApi } from '../api/authApi';

const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await authApi.login({ email, password });
      
      // Lưu token vào storage để axiosClient tự động dùng cho các request sau
      localStorage.setItem('jwt_token', data.token); 
      
      console.log('Đăng nhập thành công', data);
      // Redirect tới Dashboard...
    } catch (error) {
      console.error('Lỗi đăng nhập', error);
    }
  };

  return (
    // Form HTML của bạn...
  );
};
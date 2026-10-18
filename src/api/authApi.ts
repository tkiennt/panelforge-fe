import axiosClient from './axiosClient';

export const authApi = {
  login: async (credentials: any) => {
    const response = await axiosClient.post('/api/Auth/login', credentials);
    return response.data;
  },

  register: async (userData: any) => {
    const response = await axiosClient.post('/api/Auth/register', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await axiosClient.get('/api/Auth/me');
    return response.data;
  },
};

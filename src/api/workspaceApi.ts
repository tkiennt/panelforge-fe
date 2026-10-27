import axiosClient from './axiosClient';

export const workspaceApi = {
  getAll: async () => {
    const response = await axiosClient.get('/api/Workspaces');
    return response.data;
  },

  create: async (data: any) => {
    const response = await axiosClient.post('/api/Workspaces', data);
    return response.data;
  },
};

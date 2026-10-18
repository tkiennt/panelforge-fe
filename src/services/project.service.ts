// src/services/project.service.ts

// Cập nhật lại đường dẫn chuẩn không có dấu gạch chéo dư và dùng đúng port Backend (5044)
const API_BASE_URL = 'http://localhost:5044/api';

export const projectService = {
  // 1. API Tạo bộ truyện (Project)
  createProject: async (projectData: any) => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(projectData),
    });
    if (!response.ok) throw new Error('Lỗi khi tạo bộ truyện');
    return response.json();
  },

  // 2. API Tạo Chapter mới cho Project
  createChapter: async (projectId: string, chapterData: any) => {
    const response = await fetch(`${API_BASE_URL}/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ ...chapterData, projectId }),
    });
    if (!response.ok) throw new Error('Lỗi khi tạo chương');
    return response.json();
  },

  // 3. API Tạo Pages cho Chapter
  createPages: async (chapterId: string, pageCount: number) => {
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ count: pageCount }),
    });
    if (!response.ok) throw new Error('Lỗi khi tạo trang');
    return response.json();
  },
};

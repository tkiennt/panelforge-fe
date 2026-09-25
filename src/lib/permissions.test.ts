import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, resolvePermissions } from './permissions';

describe('Permissions Security Test', () => {
  it('ADMINISTRATOR tuyệt đối không có bất kỳ quyền sáng tạo nội dung nào trong workspace', () => {
    const adminPermissions = resolvePermissions(['ADMINISTRATOR']);
    
    // Danh sách các quyền sáng tạo nội dung trong Workspace
    const creativePermissions = [
      'edit_script',
      'edit_art',
      'upload_layer',
      'script:write',
      'sketch:write',
      'color:write',
      'letter:write',
      'create_card',
      'drag_card',
      'request_ai',
      'review_card',
      'stage:approve',
    ];

    creativePermissions.forEach((perm) => {
      expect(adminPermissions).not.toContain(perm);
    });

    expect(ROLE_PERMISSIONS['ADMINISTRATOR']).toHaveLength(0);
  });

  it('Các vai trò sản xuất (Producer, Writer, Artist, Letterer, Editor) vẫn giữ đúng quyền hạn tương ứng', () => {
    const producerPerms = resolvePermissions(['PRODUCER']);
    expect(producerPerms).toContain('create_card');
    expect(producerPerms).toContain('stage:approve');

    const artistPerms = resolvePermissions(['ARTIST']);
    expect(artistPerms).toContain('edit_art');
    expect(artistPerms).toContain('upload_layer');

    const writerPerms = resolvePermissions(['WRITER']);
    expect(writerPerms).toContain('edit_script');

    const lettererPerms = resolvePermissions(['LETTERER']);
    expect(lettererPerms).toContain('letter:write');

    const editorPerms = resolvePermissions(['EDITOR']);
    expect(editorPerms).toContain('review_card');
  });
});

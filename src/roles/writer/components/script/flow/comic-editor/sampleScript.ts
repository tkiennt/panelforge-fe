// src/roles/writer/components/script/flow/comic-editor/sampleScript.ts
export const INITIAL_COMIC_SCRIPT_DOC = {
  type: 'doc',
  content: [
    {
      type: 'pageBlock',
      attrs: { pageNumber: '01', label: 'Trang 01' },
      content: [{ type: 'text', text: 'Trang 01 - Khởi đầu trong màn đêm' }],
    },
    {
      type: 'panelBlock',
      attrs: { panelNumber: '1.1', cameraAngle: 'Toàn cảnh góc cao' },
      content: [
        {
          type: 'text',
          text: 'Toàn cảnh ngã tư Shibuya lúc nửa đêm. Mưa phùn giăng kín ánh đèn neon.',
        },
      ],
    },
    {
      type: 'captionBlock',
      content: [
        {
          type: 'text',
          text: 'Tokyo lúc nửa đêm, cơn mưa rào bất chợt đổ xuống những con hẻm chật hẹp, xóa nhòa đi mọi dấu vết...',
        },
      ],
    },
    {
      type: 'dialogueBlock',
      attrs: { character: 'Minh' },
      content: [
        {
          type: 'text',
          text: 'Chúng ta không còn nhiều thời gian nữa rồi... Cần phải rời khỏi đây ngay!',
        },
      ],
    },
    {
      type: 'sfxBlock',
      content: [
        {
          type: 'text',
          text: 'RẦM RỘ! (Tiếng sấm chớp rạch ngang bầu trời)',
        },
      ],
    },
    {
      type: 'dialogueBlock',
      attrs: { character: 'Lan' },
      content: [
        {
          type: 'text',
          text: 'Cậu cứ bình tĩnh, tớ đã tìm thấy lối thoát hiểm phía sau tòa nhà.',
        },
      ],
    },
    {
      type: 'panelBlock',
      attrs: { panelNumber: '1.2', cameraAngle: 'Cận cảnh' },
      content: [
        {
          type: 'text',
          text: 'Cận cảnh đôi mắt của người lạ mặt đứng dưới ánh đèn đường nhấp nháy.',
        },
      ],
    },
    {
      type: 'dialogueBlock',
      attrs: { character: 'Người lạ mặt' },
      content: [
        {
          type: 'text',
          text: 'Hai người nghĩ mình có thể dễ dàng chạy thoát sao?',
        },
      ],
    },
    {
      type: 'sfxBlock',
      content: [
        {
          type: 'text',
          text: 'Xoẹt...! (Lưỡi kiếm rút khỏi vỏ)',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [],
    },
  ],
};

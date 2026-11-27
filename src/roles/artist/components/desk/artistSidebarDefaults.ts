import { translate } from '@/lib/i18n';
import type { FrameTemplateDto } from '@/services/frameTemplate.service';
import type { BibleEntityItem, ScriptLineItem } from './ArtistCanvaSidebar';

function formatNarrationMode(mode?: string): string | null {
  if (!mode || mode === 'Present') return null;
  const lower = mode.toLowerCase();
  if (lower.includes('flashback')) return translate('artist.canvaSidebar.narrationFlashback');
  if (lower.includes('inner') || lower.includes('monologue') || lower.includes('thought')) {
    return translate('artist.canvaSidebar.narrationInner');
  }
  if (lower.includes('voice') || lower.includes('narrat')) {
    return translate('artist.canvaSidebar.narrationVoice');
  }
  return null;
}

export type ResolvedLineKind = 'action' | 'dialogue' | 'thought' | 'narration' | 'sfx';

export function resolveScriptLineMeta(line: ScriptLineItem): {
  kind: ResolvedLineKind;
  typeLabel: string;
  speaker?: string;
  text: string;
  secondaryAction?: string;
} {
  const rawKind = String(line.kind ?? line.narrationMode ?? '').toLowerCase();
  const hasDialogue = Boolean(line.dialogueText && line.dialogueText.trim());
  const hasStage = Boolean(line.stageDirection && line.stageDirection.trim());
  const fallbackText = (line.text || line.dialogueText || line.stageDirection || '').trim();
  const speakerName = (line.characterName || line.speakerLabel || '').trim();

  if (rawKind === '5' || rawKind === 'sfx' || /^sfx\b/i.test(fallbackText)) {
    return {
      kind: 'sfx',
      typeLabel: 'SFX',
      text: (line.dialogueText || line.text || line.stageDirection || '').trim(),
    };
  }

  if (
    rawKind === '4' ||
    rawKind === 'narration' ||
    rawKind.includes('voice') ||
    rawKind.includes('narrat') ||
    /^(Người dẫn|Lời dẫn|Dẫn chuyện|Caption)$/i.test(speakerName)
  ) {
    return {
      kind: 'narration',
      typeLabel: 'Narration',
      text: (line.dialogueText || line.text || line.stageDirection || '').trim(),
      secondaryAction:
        hasDialogue && hasStage && line.dialogueText !== line.stageDirection
          ? line.stageDirection?.trim()
          : undefined,
    };
  }

  if (
    rawKind === '3' ||
    rawKind === 'thought' ||
    rawKind.includes('inner') ||
    rawKind.includes('monologue')
  ) {
    const spk =
      speakerName && speakerName !== 'Người dẫn'
        ? speakerName
        : translate('artist.canvaSidebar.characterFallback');
    return {
      kind: 'thought',
      typeLabel: translate('artist.canvaSidebar.thoughtPrefix', { speaker: spk }),
      speaker: spk,
      text: (line.dialogueText || line.text || line.stageDirection || '').trim(),
      secondaryAction:
        hasDialogue && hasStage && line.dialogueText !== line.stageDirection
          ? line.stageDirection?.trim()
          : undefined,
    };
  }

  if (rawKind === '2' || rawKind === 'dialogue' || hasDialogue) {
    const spk =
      speakerName && speakerName !== 'Người dẫn'
        ? speakerName
        : translate('artist.canvaSidebar.characterFallback');
    return {
      kind: 'dialogue',
      typeLabel: translate('artist.canvaSidebar.dialoguePrefix', { speaker: spk }),
      speaker: spk,
      text: (line.dialogueText || line.text || '').trim(),
      secondaryAction:
        hasStage && line.stageDirection !== line.dialogueText
          ? line.stageDirection?.trim()
          : undefined,
    };
  }

  return {
    kind: 'action',
    typeLabel: translate('artist.canvaSidebar.actionTypeLabel'),
    text: (line.stageDirection || line.text || line.dialogueText || '').trim(),
  };
}

export const DEFAULT_SCRIPT_LINES: ScriptLineItem[] = [
  {
    id: 'line-1',
    pageNumber: 1,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection:
      'Góc toàn cảnh: Thung lũng hoang tàn sau cơn bão cát. Khói bốc lên từ tháp quan sát cổng thành phía Nam.',
  },
  {
    id: 'line-2',
    pageNumber: 1,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText:
      'Cuối cùng chúng ta cũng vượt qua thung lũng bóng đêm. Nhưng cổng thành... đã bị phong toả hoàn toàn.',
  },
  {
    id: 'line-3',
    pageNumber: 1,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection:
      'Cận cảnh: Thanh kiếm của Minh Triết cắm sâu xuống lớp cát lún, ánh thép phản chiếu vệt nắng đầu tiên của bình minh.',
  },
  {
    id: 'line-4',
    pageNumber: 1,
    panelNumber: 3,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText:
      'Nhìn lên tường thành kia kìa! Dấu ấn của gia tộc Hắc Long vừa mới được khắc lên đó.',
  },
  {
    id: 'line-5',
    pageNumber: 1,
    panelNumber: 4,
    sceneTitle: 'Phân cảnh 1: Cổng Thành Phía Nam',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection:
      'Góc hất từ dưới lên: Cửa sắt nặng nề bắt đầu rung chuyển với âm thanh rít chói tai.',
  },
  {
    id: 'line-6',
    pageNumber: 2,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · ĐÔ THÀNH THƯỢNG CẢNH · SƯƠNG SỚM',
    stageDirection:
      'Đại cảnh thành phố cổ kính chìm trong màn sương mờ ảo. Những ngọn tháp cao vút chọc thủng tầng mây.',
  },
  {
    id: 'line-7',
    pageNumber: 2,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · ĐÔ THÀNH THƯỢNG CẢNH · SƯƠNG SỚM',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText: 'Mau tìm chỗ ẩn nấp trước khi đội tuần tra phát hiện!',
  },
  {
    id: 'line-8',
    pageNumber: 3,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · HẺM ĐÁ CỔ · SÁNG',
    stageDirection:
      'Góc trung cảnh: Hai người áp sát bức tường rêu, tiếng bước chân tuần tra nặng nề vang vọng phía đầu hẻm.',
  },
  {
    id: 'line-9',
    pageNumber: 3,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 2: Phố Cổ Trong Sương',
    sceneSlugline: 'NGOẠI · HẺM ĐÁ CỔ · SÁNG',
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText:
      'Đội hình bọn chúng có 5 người. Để tôi dùng phong thuật đánh lạc hướng phía bên kia.',
  },
  {
    id: 'line-10',
    pageNumber: 4,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    stageDirection: 'Ánh sáng hắt từ khe cửa đá rọi vào bàn thờ cổ phủ đầy bụi thời gian.',
  },
  {
    id: 'line-11',
    pageNumber: 4,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText: 'Cuộn gia phả Viễn Cổ vẫn còn nguyên vẹn ở đây!',
  },
  {
    id: 'line-12',
    pageNumber: 5,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    stageDirection:
      'Đặc tả cận cảnh: Dấu ấn Hắc Long bất ngờ phát sáng đỏ rực trên nền đá khi Minh Triết chạm tay vào cuộn thư.',
  },
  {
    id: 'line-13',
    pageNumber: 5,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 3: Mật Thất Cổ Tự',
    sceneSlugline: 'NỘI · TÀNG THƯ CÁC · TỐI',
    characterName: 'Thanh Hà',
    characterColor: '#06B6D4',
    dialogueText: 'Cẩn thận! Cả căn mật thất đang tự động kích hoạt cơ quan phong ấn!',
  },
  {
    id: 'line-14',
    pageNumber: 6,
    panelNumber: 1,
    sceneTitle: 'Phân cảnh 4: Thoát Khỏi Vòng Vây',
    sceneSlugline: 'NGOẠI · THÁP CHUÔNG PHÍA TÂY · CHIỀU TÀ',
    stageDirection:
      'Góc hành động: Minh Triết vung kiếm chém đứt dây xích cửa sập, ánh hoàng hôn rực rỡ tràn vào khung hình.',
  },
  {
    id: 'line-15',
    pageNumber: 6,
    panelNumber: 2,
    sceneTitle: 'Phân cảnh 4: Thoát Khỏi Vòng Vây',
    sceneSlugline: 'NGOẠI · THÁP CHUÔNG PHÍA TÂY · CHIỀU TÀ',
    characterName: 'Minh Triết',
    characterColor: '#F97316',
    dialogueText: 'Chúng ta phải rời khỏi Thượng Cảnh trước khi màn đêm buông xuống!',
  },
];

export const DEFAULT_BIBLE_ENTITIES: BibleEntityItem[] = [
  {
    id: 'char-1',
    name: 'Minh Triết (Nhân vật chính)',
    category: 'character',
    tag: 'Kiếm Sĩ / Lãng Khách',
    color: '#F97316',
    description:
      'Chiến binh mang huyết thống Viễn Cổ. Trầm tĩnh, quyết đoán, sử dụng trường kiếm cổ bản rộng.',
    visualNotes: [
      'Tóc đen buộc cao nửa đầu, áo choàng rách gấu màu xám tro',
      'Vết sẹo mảnh cắt ngang gò má phải',
      'Chuôi kiếm bọc da thuộc sẫm màu với hoa văn mây lửa',
    ],
  },
  {
    id: 'char-2',
    name: 'Thanh Hà',
    category: 'character',
    tag: 'Thuật Sĩ Gió',
    color: '#06B6D4',
    description: 'Bạn đồng hành thông minh, tinh thông phong thuật và bản đồ địa hình cổ đại.',
    visualNotes: [
      'Tóc ngắn ngang vai xanh lơ, đeo dải băng trán ngọc lục bảo',
      'Ống phóng phi tiêu nhỏ ở cổ tay trái',
      'Áo khoác dáng lửng màu trắng ngà viền chỉ xanh ngọc',
    ],
  },
  {
    id: 'loc-1',
    name: 'Cổng Thành Phía Nam (Nam Môn Quan)',
    category: 'location',
    tag: 'Địa danh chính',
    color: '#8B5CF6',
    description: 'Cửa ngõ phòng thủ kiên cố ngăn cách sa mạc Tử Thần với đô thành Thượng Cảnh.',
    visualNotes: [
      'Tường đá rêu phong cao 20m, xây từ các khối đá hoa cương xám đen',
      'Cánh cổng sắt khổng lồ có chạm phù điêu đôi rồng vờn ngọc',
      'Tháp canh phía Tây bị nứt vỡ một mảng lớn sau trận chiến',
    ],
  },
  {
    id: 'lore-1',
    name: 'Dấu Ấn Hắc Long',
    category: 'lore',
    tag: 'Quy tắc cốt truyện',
    color: '#EF4444',
    description:
      'Ký hiệu nguyền rủa của hoàng tộc thoái vị. Khi xuất hiện ở đâu, nơi đó sẽ chịu phong ấn vĩnh viễn.',
    visualNotes: [
      'Hình tròn đồng tâm lồng 3 vuốt rồng nhọn hướng vào tâm',
      'Luôn phát ra khói đen mờ ảo khi tiếp xúc ánh sáng mặt trời',
    ],
  },
];

export const DEFAULT_FRAME_TEMPLATES: FrameTemplateDto[] = [
  // ── NHÓM 1: TỰ SỰ TIÊU CHUẨN (STANDARD & NARRATIVE) ─────────────────────────
  {
    id: 'f0000000-0000-0000-0000-00000000000c',
    name: '4 Khung 4-Koma Cổ Điển',
    code: 'TPL-MANGA-01',
    category: 'narrative',
    description:
      '4 khung truyện thẳng hàng (Khởi - Thừa - Chuyển - Hợp) chuẩn hài hước & đời thường',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.18, y: 0.025, w: 0.64, h: 0.2285, borderless: false },
      { x: 0.18, y: 0.2655, w: 0.64, h: 0.2285, borderless: false },
      { x: 0.18, y: 0.506, w: 0.64, h: 0.2285, borderless: false },
      { x: 0.18, y: 0.7465, w: 0.64, h: 0.2285, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000008',
    name: '3 Tầng Cân Bằng (5 Khung)',
    code: 'TPL-MANGA-02',
    category: 'narrative',
    description:
      'Bố cục 3 tầng cổ điển: Tier 1 mở cảnh, Tier 2 trọng tâm kịch tính, Tier 3 chuyển tiếp trang',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 5,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.27, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.27, borderless: false },
      { x: 0.025, y: 0.31, w: 0.95, h: 0.38, borderless: false },
      { x: 0.506, y: 0.705, w: 0.469, h: 0.27, borderless: false },
      { x: 0.025, y: 0.705, w: 0.469, h: 0.27, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000006',
    name: 'Lưới 3 Tầng Dày (6 Khung)',
    code: 'TPL-MANGA-03',
    category: 'narrative',
    description:
      'Lưới 3 hàng × 2 cột cho các phân cảnh nhiều đối thoại, điều tra, tranh luận gay cấn',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 6,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.296, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.296, borderless: false },
      { x: 0.506, y: 0.336, w: 0.469, h: 0.296, borderless: false },
      { x: 0.025, y: 0.336, w: 0.469, h: 0.296, borderless: false },
      { x: 0.506, y: 0.647, w: 0.469, h: 0.296, borderless: false },
      { x: 0.025, y: 0.647, w: 0.469, h: 0.296, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000e',
    name: 'Lưới 9 Khung Cổ Điển',
    code: 'TPL-COMIC-01',
    category: 'narrative',
    description:
      'Lưới 3×3 phong cách Watchmen/DC Classic: nhịp kể đều đặn, phân tích tâm lý sâu sắc',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 9,
    slots: [
      { x: 0.025, y: 0.025, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.3457, y: 0.025, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.6663, y: 0.025, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.025, y: 0.3467, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.3457, y: 0.3467, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.6663, y: 0.3467, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.025, y: 0.6684, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.3457, y: 0.6684, w: 0.3087, h: 0.3067, borderless: false },
      { x: 0.6663, y: 0.6684, w: 0.3087, h: 0.3067, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    name: '2 Tầng Ngang Cơ Bản',
    category: 'narrative',
    description: 'Chia đôi trang theo chiều ngang, cân bằng nhịp kể',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 2,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.4675, borderless: false },
      { x: 0.025, y: 0.5075, w: 0.95, h: 0.4675, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'builtin-2-panel-split',
    name: '2 Khung Song Song (Đối thoại)',
    category: 'narrative',
    description: 'Chia đôi trang theo chiều dọc cho cảnh đối thoại hai nhân vật',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 2,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.95, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.95, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000004',
    name: '3 Tầng Ngang Cơ Bản',
    category: 'narrative',
    description: '3 dải ngang bằng nhau cho phân cảnh diễn biến theo trình tự thời gian',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.33, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.635, w: 0.95, h: 0.34, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000005',
    name: '4 Khung (Lưới 2×2)',
    category: 'narrative',
    description: '4 ô vuông cân xứng cho nhịp kể phân đoạn',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.506, y: 0.025, w: 0.469, h: 0.4675, borderless: false },
      { x: 0.025, y: 0.025, w: 0.469, h: 0.4675, borderless: false },
      { x: 0.506, y: 0.5075, w: 0.469, h: 0.4675, borderless: false },
      { x: 0.025, y: 0.5075, w: 0.469, h: 0.4675, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 2: HÀNH ĐỘNG & KỊCH TÍNH (ACTION & HIGH-TENSION) ────────────────────
  {
    id: 'f0000000-0000-0000-0000-00000000000a',
    name: '4 Khung Vát Chéo Shonen',
    code: 'TPL-MANGA-04',
    category: 'action',
    description:
      'Rãnh cắt chéo góc 15°-25° tạo xung lực gia tốc cực mạnh cho phân cảnh combat, ra đòn chớp nhoáng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      {
        x: 0.025,
        y: 0.025,
        w: 0.95,
        h: 0.28,
        corners: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 0.75 },
          { x: 0, y: 1 },
        ],
        borderless: false,
      },
      {
        x: 0.44,
        y: 0.26,
        w: 0.535,
        h: 0.38,
        corners: [
          { x: 0, y: 0.22 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 0.85 },
        ],
        borderless: false,
      },
      {
        x: 0.025,
        y: 0.32,
        w: 0.4,
        h: 0.38,
        corners: [
          { x: 0, y: 0 },
          { x: 1, y: 0.15 },
          { x: 1, y: 1 },
          { x: 0, y: 0.85 },
        ],
        borderless: false,
      },
      {
        x: 0.025,
        y: 0.685,
        w: 0.95,
        h: 0.29,
        corners: [
          { x: 0, y: 0.15 },
          { x: 1, y: 0.05 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        borderless: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000010',
    name: 'Khung Lồng Khung (Inset)',
    code: 'TPL-MANGA-06',
    category: 'action',
    description:
      '1 khung toàn cảnh chiến trường làm nền lồng 2 khung cận cảnh biểu cảm và chi tiết vũ khí',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.95, borderless: false },
      { x: 0.55, y: 0.08, w: 0.39, h: 0.26, borderless: false },
      { x: 0.06, y: 0.62, w: 0.39, h: 0.26, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'builtin-5-action-dynamic',
    name: '5 Khung Cao Trào Shonen',
    category: 'action',
    description: '1 khung mở lớn đầu trang kết hợp 4 khung đối đầu dồn dập',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 5,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.44, borderless: false },
      { x: 0.506, y: 0.48, w: 0.469, h: 0.22, borderless: false },
      { x: 0.025, y: 0.48, w: 0.469, h: 0.22, borderless: false },
      { x: 0.506, y: 0.715, w: 0.469, h: 0.26, borderless: false },
      { x: 0.025, y: 0.715, w: 0.469, h: 0.26, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000009',
    name: '6 Khung Hành Động Dày',
    category: 'action',
    description: '1 mở đầu + 2 dồn dập + 1 cao trào lớn + 2 dư chấn phản ứng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 6,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.205, borderless: false },
      { x: 0.506, y: 0.245, w: 0.469, h: 0.205, borderless: false },
      { x: 0.025, y: 0.245, w: 0.469, h: 0.205, borderless: false },
      { x: 0.025, y: 0.465, w: 0.95, h: 0.265, borderless: false },
      { x: 0.506, y: 0.745, w: 0.469, h: 0.23, borderless: false },
      { x: 0.025, y: 0.745, w: 0.469, h: 0.23, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 3: ĐẠI CẢNH & ĐIỂM NHẤN (CINEMATIC & SPLASH) ─────────────────────────
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    name: 'Đại Cảnh Tràn Lề',
    category: 'cinematic',
    description:
      '1 panel tràn viền 100% đến hết vùng Bleed dành cho trang bìa hoặc đại cảnh kết liễu',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 1,
    slots: [{ x: 0, y: 0, w: 1, h: 1, borderless: true }],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    name: 'Đại Cảnh 1 Khung',
    category: 'cinematic',
    description: '1 khung viền đơn toàn trang chuẩn lề in ấn',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 1,
    slots: [{ x: 0.025, y: 0.025, w: 0.95, h: 0.95, borderless: false }],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000d',
    name: 'Đại Cảnh 70/30',
    code: 'TPL-MANGA-05',
    category: 'cinematic',
    description:
      'Khung chiếm 70% trang trên cho cảnh đại chiến bùng nổ, 3 khung hẹp 30% dưới cho phản hồi của đồng đội',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.67, borderless: false },
      { x: 0.665, y: 0.71, w: 0.31, h: 0.265, borderless: false },
      { x: 0.345, y: 0.71, w: 0.308, h: 0.265, borderless: false },
      { x: 0.025, y: 0.71, w: 0.308, h: 0.265, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000f',
    name: '3 Khung Điện Ảnh Rộng',
    code: 'TPL-COMIC-02',
    category: 'cinematic',
    description:
      '3 thanh dài ngang tỉ lệ màn ảnh rộng widescreen cho cảnh thiên nhiên kéo dài hoặc du hành thời gian',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.33, w: 0.95, h: 0.29, borderless: false },
      { x: 0.025, y: 0.635, w: 0.95, h: 0.34, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000007',
    name: '1 Khung Lớn + 2 Nhỏ',
    category: 'cinematic',
    description: '1 khung chính phía trên kết hợp 2 khung cận cảnh phân tích bên dưới',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.52, borderless: false },
      { x: 0.506, y: 0.56, w: 0.469, h: 0.415, borderless: false },
      { x: 0.025, y: 0.56, w: 0.469, h: 0.415, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-00000000000b',
    name: 'Trang Đôi: Toàn Cảnh + 3 Khung',
    category: 'cinematic',
    description: 'Bố cục trang đôi (Spread): Đại cảnh trải dài 2 trang kết hợp 3 khung nhịp điệu',
    layoutFormat: 'SpreadDouble',
    isBuiltIn: true,
    panelCount: 4,
    slots: [
      { x: 0.025, y: 0.025, w: 0.95, h: 0.6, borderless: false },
      { x: 0.025, y: 0.64, w: 0.305, h: 0.335, borderless: false },
      { x: 0.345, y: 0.64, w: 0.305, h: 0.335, borderless: false },
      { x: 0.665, y: 0.64, w: 0.31, h: 0.335, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },

  // ── NHÓM 4: WEBTOON / MOBILE VERTICAL SCROLL ──────────────────────────────────
  {
    id: 'f0000000-0000-0000-0000-000000000011',
    name: 'Cuộn Dọc 3 Khung (Webtoon)',
    code: 'TPL-WEBTOON-01',
    category: 'webtoon',
    description:
      'Bố cục cuộn dọc tiêu chuẩn smartphone 9:16 với khoảng lặng ngừng nghỉ (negative space)',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.04, y: 0.04, w: 0.92, h: 0.27, borderless: false },
      { x: 0.04, y: 0.36, w: 0.92, h: 0.27, borderless: false },
      { x: 0.04, y: 0.68, w: 0.92, h: 0.28, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000012',
    name: 'So Sánh Song Song (Webtoon)',
    code: 'TPL-WEBTOON-02',
    category: 'webtoon',
    description:
      '1 khung dẫn đề ở trên + 2 cột song song 50-50 để miêu tả 2 góc nhìn đối thoại đồng thời',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 3,
    slots: [
      { x: 0.04, y: 0.04, w: 0.92, h: 0.32, borderless: false },
      { x: 0.515, y: 0.4, w: 0.445, h: 0.55, borderless: false },
      { x: 0.04, y: 0.4, w: 0.445, h: 0.55, borderless: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000013',
    name: 'Khung Nổi Không Viền (Webtoon)',
    code: 'TPL-WEBTOON-03',
    category: 'webtoon',
    description:
      'Khung tranh không viền chìm dần vào trang cuộn, tạo cảm xúc bay bổng hoặc hồi tưởng',
    layoutFormat: 'StandardPage',
    isBuiltIn: true,
    panelCount: 2,
    slots: [
      { x: 0, y: 0, w: 1, h: 0.45, borderless: true },
      { x: 0.08, y: 0.52, w: 0.84, h: 0.42, borderless: true },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
];

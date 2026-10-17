import React from 'react';

export const HeroMangaPage: React.FC = () => {
  return (
    <div className='relative w-full flex flex-col items-center lg:items-end select-none py-1 px-1'>
      {/* Manga Page Stack Wrapper: holds background script and foreground manuscript */}
      <div className='relative w-full max-w-[420px] lg:max-w-none lg:w-auto lg:h-[min(calc(84svh-4rem),820px)] aspect-[1/1.4]'>
        {/* Background Draft Script Sheet (Lệch nhẹ phía sau, chỉ lộ một mép) */}
        <div
          className='absolute -top-1.5 -right-2.5 sm:-right-4 w-[94%] h-[96%] rounded-xl bg-[#FAF7F0] border border-[#E2D9C5] shadow-sm pointer-events-none transform rotate-3 hidden sm:block opacity-75'
          style={{
            backgroundImage: 'repeating-linear-gradient(#FAF7F0, #FAF7F0 23px, #E8E2D5 24px)',
          }}
          aria-hidden='true'
        >
          <div className='p-4 sm:p-5 text-[13px] font-sans text-stone-600 space-y-2 opacity-85'>
            <div className='font-mono font-semibold text-stone-700 uppercase tracking-wider text-[12px] sm:text-[13px]'>
              Kịch bản phân cảnh · Hồi II / Cảnh 04
            </div>
            <div className='italic text-stone-600 text-[12px] sm:text-[13px]'>
              [Ngoại cảnh · Thành phố đêm · Mưa tạnh]
            </div>
            <div className='text-stone-700 leading-snug text-[12px] sm:text-[13px]'>
              An quay đầu nhìn lại qua vai, gió thổi tung vạt áo khoác xám dài. Tay siết chặt cán
              bút vẽ.
            </div>
            <div className='font-semibold text-stone-900 text-[13px] sm:text-[14px]'>
              « "Bản vẽ này... chưa kết thúc ở đây đâu." »
            </div>
          </div>
        </div>

        {/* Main Manga Manuscript Sheet (Tờ bản thảo chính trên bàn vẽ) */}
        <div
          id='hero-manuscript-card'
          className='relative w-full h-full rounded-xl bg-[#FFFEFA] border border-stone-300 shadow-[0_16px_40px_rgba(28,25,23,0.09)] p-3 sm:p-4.5 transition-transform duration-300 ease-out transform rotate-0 lg:-rotate-2 hover:rotate-0 hover:-translate-y-1'
        >
          {/* Manga Genkō Yōshi (Corner Crop Marks / Dấu xén Tonbo 4 góc) */}
          <div className='absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-stone-300 pointer-events-none' />
          <div className='absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-stone-300 pointer-events-none' />
          <div className='absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-stone-300 pointer-events-none' />
          <div className='absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-stone-300 pointer-events-none' />

          {/* Top margin metadata of manuscript - font-size >= 13px and high contrast */}
          <div className='flex items-center justify-between text-[13px] font-mono text-stone-600 mb-2 px-1 border-b border-stone-200 pb-1'>
            <span className='tracking-wider font-semibold'>PANELFORGE · GENKŌ YŌSHI B4</span>
            <span className='font-bold'>CH.14 / P.04</span>
          </div>

          {/* The SVG Manga Panels Layout */}
          <div className='relative w-full h-[calc(100%-44px)]'>
            <svg
              viewBox='0 0 380 500'
              className='w-full h-full object-contain'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              role='img'
              aria-label='Bản thảo manga hoàn thiện với 4 khung truyện'
            >
              <defs>
                {/* Dense Screentone Pattern */}
                <pattern id='hero-tone-dense' width='4' height='4' patternUnits='userSpaceOnUse'>
                  <circle cx='1.5' cy='1.5' r='0.85' fill='#262626' />
                </pattern>

                {/* Sky Tone Pattern */}
                <pattern id='hero-tone-sky' width='3' height='3' patternUnits='userSpaceOnUse'>
                  <circle cx='1' cy='1' r='0.45' fill='#525252' />
                </pattern>

                {/* Clip path for Panel 1 (City skyline) */}
                <clipPath id='hero-clip-p1'>
                  <rect x='10' y='10' width='360' height='126' rx='2' />
                </clipPath>

                {/* Clip path for Panel 2 (Character face) */}
                <clipPath id='hero-clip-p2'>
                  <rect x='10' y='144' width='212' height='182' rx='2' />
                </clipPath>

                {/* Clip path for Panel 3 (Rough blue pencil sketch) */}
                <clipPath id='hero-clip-p3'>
                  <rect x='230' y='144' width='140' height='182' rx='2' />
                </clipPath>

                {/* Clip path for Panel 4 (Inking hand & speed lines) */}
                <clipPath id='hero-clip-p4'>
                  <rect x='10' y='334' width='360' height='156' rx='2' />
                </clipPath>
              </defs>

              {/* ============================================================== */}
              {/* PANEL 1: TOÀN CẢNH THÀNH PHỐ ĐÊM (WIDE CITYSCAPE SKYLINE)      */}
              {/* ============================================================== */}
              <g clipPath='url(#hero-clip-p1)'>
                {/* Background Night Sky */}
                <rect x='10' y='10' width='360' height='126' fill='#FAFAF8' />
                <rect
                  x='10'
                  y='10'
                  width='360'
                  height='68'
                  fill='url(#hero-tone-sky)'
                  opacity='0.45'
                />

                {/* Crescent Moon */}
                <path d='M 322 24 A 14 14 0 1 0 334 38 A 12 12 0 1 1 322 24 Z' fill='#171717' />

                {/* Background depth silhouettes */}
                <rect x='28' y='50' width='30' height='86' fill='#E2E2E2' />
                <rect x='64' y='38' width='34' height='98' fill='#D4D4D4' />
                <rect x='104' y='56' width='26' height='80' fill='#E2E2E2' />
                <rect x='136' y='32' width='36' height='104' fill='#C8C8C8' />
                <rect x='178' y='46' width='32' height='90' fill='#D4D4D4' />
                <rect x='216' y='26' width='44' height='110' fill='#A8A8A8' />
                <rect x='266' y='42' width='34' height='94' fill='#C8C8C8' />
                <rect x='306' y='54' width='26' height='82' fill='#D4D4D4' />
                <rect x='338' y='34' width='32' height='102' fill='#B5B5B5' />

                {/* Middle-ground building with screentone facade */}
                <rect x='228' y='52' width='56' height='84' fill='url(#hero-tone-dense)' />
                <line x1='228' y1='52' x2='228' y2='136' stroke='#171717' strokeWidth='1.8' />
                <line x1='284' y1='52' x2='284' y2='136' stroke='#171717' strokeWidth='1.8' />
                <line x1='228' y1='52' x2='284' y2='52' stroke='#171717' strokeWidth='1.8' />

                {/* Foreground crisp inked towers with window grids */}
                <rect x='18' y='66' width='44' height='70' fill='#171717' />
                <rect x='24' y='74' width='6' height='8' fill='#FFFFFF' />
                <rect x='34' y='74' width='6' height='8' fill='#FFFFFF' />
                <rect x='48' y='74' width='6' height='8' fill='#FFFFFF' />
                <rect x='24' y='90' width='6' height='8' fill='#FFFFFF' />
                <rect x='48' y='90' width='6' height='8' fill='#FFFFFF' />
                <rect x='34' y='106' width='6' height='8' fill='#FFFFFF' />

                {/* Center Communications Tower */}
                <line x1='152' y1='14' x2='152' y2='38' stroke='#171717' strokeWidth='1.6' />
                <circle cx='152' cy='14' r='2' fill='#F97316' />
                <rect x='128' y='40' width='48' height='96' fill='#171717' />
                <rect x='136' y='50' width='7' height='9' fill='#FFFFFF' />
                <rect x='148' y='50' width='7' height='9' fill='#FFFFFF' />
                <rect x='160' y='50' width='7' height='9' fill='#FFFFFF' />
                <rect x='136' y='68' width='7' height='9' fill='#FFFFFF' />
                <rect x='160' y='68' width='7' height='9' fill='#FFFFFF' />
                <rect x='148' y='86' width='7' height='9' fill='#FFFFFF' />

                {/* Manga sweeping powerlines */}
                <path d='M 10 36 Q 185 62 370 40' stroke='#171717' strokeWidth='1.2' fill='none' />
                <path d='M 10 44 Q 185 70 370 48' stroke='#171717' strokeWidth='0.9' fill='none' />
              </g>
              {/* Panel 1 Outer Ink Border */}
              <rect
                x='10'
                y='10'
                width='360'
                height='126'
                stroke='#171717'
                strokeWidth='2.2'
                rx='1'
              />

              {/* ============================================================== */}
              {/* PANEL 2: CẬN MẶT NHÂN VẬT & BÓNG THOẠI MANGA                   */}
              {/* ============================================================== */}
              <g clipPath='url(#hero-clip-p2)'>
                <rect x='10' y='144' width='212' height='182' fill='#FFFFFF' />

                {/* Background shadow mood tone */}
                <polygon
                  points='10,144 110,144 10,250'
                  fill='url(#hero-tone-dense)'
                  opacity='0.35'
                />

                {/* High-Collar Trench Coat */}
                <path
                  d='M 38 326 L 70 252 L 118 242 L 158 256 L 192 326 Z'
                  fill='url(#hero-tone-dense)'
                />
                <path
                  d='M 38 326 L 70 252 L 118 242 L 158 256 L 192 326'
                  stroke='#171717'
                  strokeWidth='2.2'
                  fill='none'
                />
                {/* Collar lapels in rich black */}
                <polygon points='70,252 94,216 118,242' fill='#171717' />
                <polygon points='158,256 140,220 118,242' fill='#171717' />

                {/* Neck & Jawline with anatomical taper */}
                <path
                  d='M 96 224 L 102 206 Q 106 182 120 178 Q 134 182 138 206 L 140 224'
                  stroke='#171717'
                  strokeWidth='1.8'
                  fill='#FFFFFF'
                />

                {/* Resolute manga eyes with iris, catchlight, double crease */}
                <g stroke='#171717' strokeLinecap='round'>
                  {/* Eyebrows */}
                  <polygon points='106,188 124,184 124,187 106,190' fill='#171717' />
                  <polygon points='134,187 148,184 148,187 134,190' fill='#171717' />

                  {/* Double eyelid crease lines */}
                  <path d='M 112 191 Q 118 188 124 192' strokeWidth='0.9' fill='none' />
                  <path d='M 134 192 Q 140 188 146 191' strokeWidth='0.9' fill='none' />

                  {/* Bold tapered upper lash lines */}
                  <path d='M 108 196 Q 117 190 126 197' strokeWidth='2.6' fill='none' />
                  <path d='M 134 197 Q 143 190 148 196' strokeWidth='2.6' fill='none' />
                </g>

                {/* Irises with deep pupil & white catchlight reflection */}
                <ellipse cx='118' cy='198' rx='3.6' ry='4.8' fill='#171717' />
                <circle cx='117' cy='196' r='1.3' fill='#FFFFFF' />
                <ellipse cx='139' cy='198' rx='3.6' ry='4.8' fill='#171717' />
                <circle cx='138' cy='196' r='1.3' fill='#FFFFFF' />

                {/* Manga Nose with facet shadow */}
                <path
                  d='M 126 205 L 124 210 L 128 210'
                  stroke='#171717'
                  strokeWidth='1.5'
                  fill='none'
                />

                {/* Resolute Mouth & Lower Lip Shadow */}
                <line
                  x1='121'
                  y1='217'
                  x2='132'
                  y2='217'
                  stroke='#171717'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
                <ellipse cx='126.5' cy='221' rx='2.2' ry='0.8' fill='#737373' />

                {/* Inked Anime Hair with White Gloss Highlight Ribbons */}
                {/* Base Black Hair Mass */}
                <path
                  d='M 88 196 Q 82 158 114 150 Q 138 144 156 154 Q 172 168 162 206 Q 156 190 148 178 Q 132 168 118 176 Q 102 178 96 198 Z'
                  fill='#171717'
                />
                {/* White Sheen Highlight Ribbons (Gloss streaks) */}
                <polygon points='104,162 116,158 122,170 112,172' fill='#FFFFFF' />
                <polygon points='128,160 140,156 146,168 136,170' fill='#FFFFFF' />
                <polygon points='152,164 162,160 166,172 158,174' fill='#FFFFFF' />

                {/* Hair strands detailing */}
                <path
                  d='M 114 150 Q 120 172 126 180'
                  stroke='#171717'
                  strokeWidth='1.5'
                  fill='none'
                />
                <path
                  d='M 142 152 Q 136 170 134 182'
                  stroke='#171717'
                  strokeWidth='1.5'
                  fill='none'
                />

                {/* Speech balloon tail pointing to mouth */}
                <polygon
                  points='28,198 38,206 44,198'
                  fill='#FFFFFF'
                  stroke='#171717'
                  strokeWidth='1.8'
                />
              </g>
              {/* Panel 2 Outer Ink Border */}
              <rect
                x='10'
                y='144'
                width='212'
                height='182'
                stroke='#171717'
                strokeWidth='2.2'
                rx='1'
              />

              {/* ============================================================== */}
              {/* PANEL 3: NÉT CHÌ XANH PHÁC THẢO (NON-PHOTO BLUE SKETCH)        */}
              {/* Nhân vật cận cảnh góc nhìn khác với đường gióng và dựng khối   */}
              {/* ============================================================== */}
              <g id='hero-sketch-panel' clipPath='url(#hero-clip-p3)'>
                {/* Drafting Paper ground */}
                <rect x='230' y='144' width='140' height='182' fill='#FAFBFD' />

                {/* Cranium Construction Circle */}
                <circle
                  cx='300'
                  cy='206'
                  r='32'
                  stroke='#93C5FD'
                  strokeWidth='1.2'
                  strokeDasharray='3 2'
                />

                {/* Curved 3/4 Facial Construction Axis */}
                <path
                  d='M 300 172 Q 310 206 298 248'
                  stroke='#93C5FD'
                  strokeWidth='1'
                  strokeDasharray='2 2'
                />

                {/* Horizontal Eye Level Guideline */}
                <line
                  x1='242'
                  y1='206'
                  x2='358'
                  y2='206'
                  stroke='#93C5FD'
                  strokeWidth='1'
                  strokeDasharray='2 2'
                />

                {/* Jawline and Chin Searching Strokes */}
                <path
                  d='M 270 196 Q 274 224 296 245 Q 322 230 330 198'
                  stroke='#60A5FA'
                  strokeWidth='1.6'
                  strokeLinecap='round'
                  fill='none'
                />
                <path
                  d='M 272 198 L 296 243 L 328 200'
                  stroke='#93C5FD'
                  strokeWidth='0.9'
                  fill='none'
                />

                {/* Rough Anime Hair Searching Contours */}
                <path
                  d='M 264 192 Q 252 160 286 150 Q 318 146 336 168 Q 348 196 332 222'
                  stroke='#60A5FA'
                  strokeWidth='1.5'
                  fill='none'
                />
                <path
                  d='M 286 150 Q 296 176 304 186'
                  stroke='#93C5FD'
                  strokeWidth='1.2'
                  fill='none'
                />

                {/* Preliminary Eye, Brow & Nose Placement */}
                <path
                  d='M 284 204 Q 292 201 298 205'
                  stroke='#3B82F6'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  fill='none'
                />
                <circle cx='293' cy='206' r='2.5' stroke='#3B82F6' strokeWidth='1' fill='none' />
                <polygon points='283,198 296,195 296,197 283,199' fill='#60A5FA' />
                <path
                  d='M 300 214 L 298 218 L 302 218'
                  stroke='#60A5FA'
                  strokeWidth='1.2'
                  fill='none'
                />

                {/* Cross-hatching shading under jaw */}
                <line x1='288' y1='247' x2='296' y2='241' stroke='#93C5FD' strokeWidth='1' />
                <line x1='292' y1='249' x2='300' y2='243' stroke='#93C5FD' strokeWidth='1' />
                <line x1='296' y1='251' x2='304' y2='245' stroke='#93C5FD' strokeWidth='1' />
              </g>
              {/* Panel 3 Outer Ink Border */}
              <rect
                x='230'
                y='144'
                width='140'
                height='182'
                stroke='#171717'
                strokeWidth='2.2'
                rx='1'
              />

              {/* ============================================================== */}
              {/* PANEL 4: BÀN TAY CẦM BÚT G-PEN & TIA TỐC ĐỘ (SPEED LINES & SFX) */}
              {/* ============================================================== */}
              <g clipPath='url(#hero-clip-p4)'>
                <rect x='10' y='334' width='360' height='156' fill='#FFFFFF' />

                {/* Tapered Speed Lines converging towards nib tip at (180, 424) */}
                <g fill='#262626'>
                  <polygon points='12,342 160,398 12,344' />
                  <polygon points='12,372 155,410 12,374' />
                  <polygon points='12,408 152,420 12,410' />
                  <polygon points='12,448 165,432 12,450' />
                  <polygon points='12,476 175,438 12,479' />

                  <polygon points='368,342 270,396 368,345' />
                  <polygon points='368,378 280,412 368,380' />
                  <polygon points='368,415 285,424 368,418' />
                  <polygon points='368,455 275,436 368,457' />
                </g>

                {/* Artist Hand Drawing */}
                {/* Sleeve fabric with screentone */}
                <path d='M 286 488 L 266 438 L 236 440 L 230 488 Z' fill='url(#hero-tone-dense)' />
                <path
                  d='M 286 488 L 266 438 L 236 440 L 230 488'
                  stroke='#171717'
                  strokeWidth='2.2'
                />

                {/* Anatomical fingers gripping pen firmly */}
                {/* Thumb pressing on ferrule with knuckle fold */}
                <path
                  d='M 245 428 Q 235 418 220 415 Q 212 425 224 435 Q 236 440 248 434'
                  stroke='#171717'
                  strokeWidth='2.2'
                  fill='#FFFFFF'
                />
                {/* Index finger curled over barrel */}
                <path
                  d='M 230 412 Q 222 398 234 394 Q 245 400 248 416'
                  stroke='#171717'
                  strokeWidth='2.2'
                  fill='#FFFFFF'
                />
                {/* Middle finger supporting from below */}
                <path
                  d='M 248 416 Q 252 405 260 402 Q 268 408 266 422'
                  stroke='#171717'
                  strokeWidth='2'
                  fill='#FFFFFF'
                />

                {/* Manga G-Pen Body (Dark charcoal wooden holder) */}
                <polygon
                  points='205,410 285,355 292,364 212,418'
                  fill='#262626'
                  stroke='#171717'
                  strokeWidth='1.6'
                />

                {/* Metallic Chrome Ferrule Socket */}
                <polygon
                  points='195,416 207,408 211,418 200,424'
                  fill='#D4D4D4'
                  stroke='#171717'
                  strokeWidth='1.4'
                />

                {/* Sharp G-Pen Nib */}
                <polygon
                  points='180,424 196,413 201,423'
                  fill='#F5F5F5'
                  stroke='#171717'
                  strokeWidth='1.6'
                />

                {/* PanelForge Orange Slit on G-Pen Nib (Signature accent) */}
                <line
                  x1='182'
                  y1='423'
                  x2='194'
                  y2='417'
                  stroke='#F97316'
                  strokeWidth='2'
                  strokeLinecap='round'
                />

                {/* Fresh Black Ink Stroke flowing PRECISELY from nib tip at (180, 424) */}
                <path
                  d='M 180 424 Q 155 435 120 426 Q 85 418 50 435'
                  stroke='#171717'
                  strokeWidth='3.8'
                  strokeLinecap='round'
                  fill='none'
                />

                {/* Spiky SFX Balloon for "SOẠT!" */}
                <g>
                  <polygon
                    points='56,350 72,358 92,345 88,362 108,364 94,374 106,390 88,386 82,402 74,386 56,394 66,378 48,370 66,364'
                    fill='#FFFFFF'
                    stroke='#171717'
                    strokeWidth='2.2'
                  />
                  <text
                    x='66'
                    y='378'
                    fontSize='18'
                    fontWeight='900'
                    fontFamily='sans-serif'
                    fontStyle='italic'
                    fill='#171717'
                    letterSpacing='-0.5'
                    className='select-none'
                  >
                    SOẠT!
                  </text>
                </g>
              </g>
              {/* Panel 4 Outer Ink Border */}
              <rect
                x='10'
                y='334'
                width='360'
                height='156'
                stroke='#171717'
                strokeWidth='2.2'
                rx='1'
              />
            </svg>
          </div>

          {/* ============================================================== */}
          {/* HTML OVERLAYS: SPEECH BALLOON, NOTES, AND BADGES               */}
          {/* All text guaranteed >= 12px actual computed font size          */}
          {/* ============================================================== */}

          {/* 1. Manga Speech Balloon in Panel 2 (HTML overlay for razor-sharp >= 13px text) */}
          <div
            id='hero-speech-balloon'
            className='absolute top-[32%] left-[4%] bg-white border-2 border-stone-900 rounded-2xl px-3.5 py-2 shadow-sm max-w-[190px] pointer-events-none z-10'
          >
            <p className='text-[13px] sm:text-[14px] font-sans font-bold text-stone-900 leading-tight'>
              Bản vẽ này...
            </p>
            <p className='text-[13px] sm:text-[14px] font-serif italic text-stone-700 leading-tight mt-0.5'>
              chưa kết thúc ở đây đâu.
            </p>
          </div>

          {/* 2. Blue Sketch Stage Badge in Panel 3 */}
          <div className='absolute top-[32%] right-[4%] bg-blue-50/95 border border-blue-200 text-blue-700 px-2.5 py-1 rounded text-[13px] font-mono font-semibold pointer-events-none z-10'>
            ROUGH · GÓC 2
          </div>

          {/* 3. Sticky Note from Editor (Positioned inside card bounds to guarantee zero overflow) */}
          <div
            id='hero-editor-note'
            className='absolute bottom-10 right-2 sm:right-3 bg-[#FEF9C3] text-stone-900 px-3.5 py-2.5 rounded shadow-md border border-[#FDE047] text-left max-w-[200px] transform rotate-1 z-20'
            title='Ghi chú biên tập'
          >
            <div className='absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2 bg-stone-300/70 rounded-xs' />
            <span className='block text-[13px] sm:text-[14px] font-sans font-bold text-stone-900 tracking-tight leading-snug'>
              Editor · Tăng tương phản khung 3
            </span>
          </div>

          {/* 4. Artist Version Stamp (Larger and bolder) */}
          <div
            id='hero-artist-label'
            className='absolute bottom-3.5 left-4 flex items-center gap-2 bg-stone-900 text-white px-3.5 py-1.5 rounded-md text-[13px] font-mono shadow-md border border-stone-800 z-10'
          >
            <span className='w-2 h-2 rounded-full bg-[#F97316]' />
            <span className='font-bold tracking-wider'>Artist · v3</span>
          </div>
        </div>
      </div>

      {/* Dải HTML dưới visual: Kịch bản → Phác thảo → Hoàn thiện */}
      <div
        id='hero-pipeline-strip'
        className='mt-3.5 sm:mt-4 flex items-center justify-center gap-2.5 text-[13px] sm:text-[14px] font-sans text-stone-600'
      >
        <span className='text-stone-700 font-medium'>Kịch bản</span>
        <span className='text-stone-300 select-none'>→</span>
        <span className='text-stone-700 font-medium'>Phác thảo</span>
        <span className='text-stone-300 select-none'>→</span>
        <span className='inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-50 text-[#C2410C] font-semibold border border-orange-200 shadow-xs'>
          <span className='w-1.5 h-1.5 rounded-full bg-[#F97316]' />
          Hoàn thiện
        </span>
      </div>
    </div>
  );
};

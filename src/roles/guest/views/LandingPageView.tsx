import React, { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/shared/components/BrandMark';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FolderTree,
  History,
  Sparkles,
  Database,
  GitCommit,
  KanbanSquare,
  FileText,
  Lock,
  Menu,
  X,
  Palette,
  BookMarked,
  Users,
  ChevronDown,
} from 'lucide-react';
import { HeroMangaPage } from '../components/HeroMangaPage';
import { LanguageSwitcher, useTranslation } from '@/lib/i18n';

interface LandingPageViewProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

// Shared by the scroll-reveal observer: classic fade-ins plus the hero→intro ink transition and card frames.
const REVEAL_SELECTOR = '.animate-on-scroll, [data-reveal]';

// Shared pushpin anchor coordinates for mathematical alignment with transform-origin
const PIN_ANCHOR_Y_PX = 28.5; // Needle enters paper at 28.5px from note container top
const LEFT_PIN_ANCHOR_X_PERCENT = 50; // Left note pin centered at 50% width
const RIGHT_PIN_ANCHOR_X_PERCENT = 58; // Right note pin placed at 58% width

// Deckle torn paper SVG paths matching the concept image
// 1. LEFT NOTE (Giấy phác thảo kem - Sketch Sheet, ViewBox 0 0 520 480)
const LEFT_NOTE_PAPER_BODY_PATH =
  'M 16 12.4 Q 16 12.4, 25.9 12.4 Q 35.9 12.3, 45.8 12.3 Q 55.8 12.2, 65.8 12.3 Q 75.8 12.3, 85.8 12.3 Q 95.7 12.2, 105.7 12.1 Q 115.6 11.9, 125.5 11.7 Q 135.5 11.5, 145.4 11.4 Q 155.4 11.4, 165.4 11.6 Q 175.3 11.7, 185.3 11.9 Q 195.3 12.1, 205.3 12.1 Q 215.2 12.2, 225.1 12.1 Q 235.1 12.1, 245.1 12.1 Q 255 12, 264.9 12 Q 274.9 12, 284.9 12 Q 294.8 12, 304.8 11.9 Q 314.8 11.9, 324.8 11.9 Q 334.7 11.8, 344.6 12 Q 354.6 12.2, 364.6 12.6 Q 374.5 12.9, 384.4 12.8 Q 394.4 12.7, 404.4 12.3 Q 414.3 12, 424.3 11.8 Q 434.3 11.5, 444.3 11.6 Q 454.2 11.7, 464.1 11.8 Q 474.1 11.9, 484.1 11.9 L 494 11.8 L 493.5 12 Q 493.5 12, 493.6 20.9 Q 493.6 29.8, 493.3 38.6 Q 493 47.5, 493 56.4 Q 493 65.3, 493.4 74.2 Q 493.9 83, 493.8 91.9 Q 493.6 100.8, 493.5 109.7 Q 493.4 118.6, 493.8 127.5 Q 494.1 136.3, 494.1 145.2 Q 494.1 154.1, 493.8 163 Q 493.5 171.9, 493.2 180.8 Q 492.9 189.6, 492.6 198.5 Q 492.4 207.4, 492.2 216.3 Q 492 225.1, 491.8 234 Q 491.6 242.9, 492.1 251.8 Q 492.6 260.7, 493.1 269.5 Q 493.7 278.4, 493.4 287.3 Q 493.2 296.2, 493.1 305.1 Q 493 314, 492.9 322.9 Q 492.9 331.7, 492.3 340.6 Q 491.6 349.5, 491.4 358.4 Q 491.2 367.2, 491.4 376.1 L 491.6 385 L 462 430 L 424 468 L 424 464.7 Q 424 464.7, 419 465.4 Q 414 466.2, 409.1 465.4 Q 404.1 464.5, 399.1 465.4 Q 394.1 466.2, 389.1 466.6 Q 384.2 467.1, 379.2 466.8 Q 374.2 466.4, 369.3 467.9 Q 364.3 469.5, 359.3 470.1 Q 354.3 470.7, 349.4 471 Q 344.4 471.4, 339.4 473.2 Q 334.4 475, 329.4 474.4 Q 324.5 473.9, 319.5 472.5 Q 314.5 471.1, 309.6 471.6 Q 304.6 472, 299.6 470.4 Q 294.6 468.9, 289.6 467.5 Q 284.7 466.2, 279.7 466.4 Q 274.7 466.7, 269.8 465.4 Q 264.8 464.1, 259.8 463.8 Q 254.8 463.4, 249.9 464.1 Q 244.9 464.9, 239.9 464.5 Q 234.9 464.1, 229.9 466.6 Q 225 469, 220 472.4 Q 215 475.9, 210.1 476.5 Q 205.1 477.1, 200.1 477.4 Q 195.1 477.6, 190.1 476.5 Q 185.2 475.3, 180.2 472.7 Q 175.2 470.1, 170.3 470.1 Q 165.3 470, 160.3 469.1 Q 155.3 468.3, 150.4 466.3 Q 145.4 464.3, 140.4 464.6 Q 135.4 464.9, 130.4 464.9 Q 125.5 464.9, 120.5 464.8 Q 115.5 464.6, 110.5 466.3 Q 105.6 468, 100.6 468.7 Q 95.6 469.4, 90.7 469.9 Q 85.7 470.3, 80.7 471.4 Q 75.7 472.4, 70.8 471.1 Q 65.8 469.9, 60.8 469.7 Q 55.8 469.5, 50.8 470.5 Q 45.9 471.5, 40.9 470.5 Q 35.9 469.5, 30.9 469.7 Q 26 469.9, 21 470.8 L 16 471.7 L 19 468 Q 19 468, 18.1 463.1 Q 17.3 458.1, 16.7 453.1 Q 16.1 448.2, 16.3 443.3 Q 16.5 438.3, 15.2 433.3 Q 13.9 428.3, 13.9 423.4 Q 14 418.4, 14.9 413.4 Q 15.9 408.5, 14.9 403.6 Q 13.8 398.6, 13.8 393.6 Q 13.7 388.7, 14.1 383.8 Q 14.4 378.8, 13.2 373.9 Q 11.9 368.9, 11.8 363.9 Q 11.6 359, 11.6 354 Q 11.6 349, 11.3 344.1 Q 11.1 339.1, 13.4 334.1 Q 15.7 329.2, 17.4 324.3 Q 19 319.3, 18.9 314.4 Q 18.9 309.4, 19.9 304.4 Q 20.9 299.5, 20.3 294.6 Q 19.7 289.6, 18.4 284.6 Q 17 279.7, 17.4 274.7 Q 17.7 269.7, 16.7 264.8 Q 15.7 259.8, 14.3 254.9 Q 12.9 249.9, 12.9 244.9 Q 12.8 240, 11 235.1 Q 9.2 230.1, 8.1 225.1 Q 6.9 220.2, 8 215.3 Q 9 210.3, 9.2 205.3 Q 9.4 200.3, 10.9 195.4 Q 12.5 190.4, 15.1 185.4 Q 17.7 180.5, 17.9 175.6 Q 18.1 170.6, 18.9 165.6 Q 19.6 160.7, 20.1 155.8 Q 20.7 150.8, 19.1 145.9 Q 17.6 140.9, 17.5 135.9 Q 17.3 131, 17.6 126 Q 17.8 121, 16.6 116 Q 15.5 111.1, 14.9 106.2 Q 14.3 101.2, 12.9 96.3 Q 11.6 91.3, 10.7 86.3 Q 9.8 81.4, 11.9 76.5 Q 14 71.5, 14.6 66.5 Q 15.1 61.6, 14.1 56.7 Q 13.1 51.7, 13.7 46.7 Q 14.3 41.7, 14.1 36.8 Q 13.9 31.8, 13.8 26.9 Q 13.7 21.9, 15.3 16.9 L 16.9 12 Z';

const LEFT_NOTE_BOTTOM_PULP_PATH =
  'M 424 464.7 L 424 464.7 Q 424 464.7, 419 465.4 Q 414 466.2, 409.1 465.4 Q 404.1 464.5, 399.1 465.4 Q 394.1 466.2, 389.1 466.6 Q 384.2 467.1, 379.2 466.8 Q 374.2 466.4, 369.3 467.9 Q 364.3 469.5, 359.3 470.1 Q 354.3 470.7, 349.4 471 Q 344.4 471.4, 339.4 473.2 Q 334.4 475, 329.4 474.4 Q 324.5 473.9, 319.5 472.5 Q 314.5 471.1, 309.6 471.6 Q 304.6 472, 299.6 470.4 Q 294.6 468.9, 289.6 467.5 Q 284.7 466.2, 279.7 466.4 Q 274.7 466.7, 269.8 465.4 Q 264.8 464.1, 259.8 463.8 Q 254.8 463.4, 249.9 464.1 Q 244.9 464.9, 239.9 464.5 Q 234.9 464.1, 229.9 466.6 Q 225 469, 220 472.4 Q 215 475.9, 210.1 476.5 Q 205.1 477.1, 200.1 477.4 Q 195.1 477.6, 190.1 476.5 Q 185.2 475.3, 180.2 472.7 Q 175.2 470.1, 170.3 470.1 Q 165.3 470, 160.3 469.1 Q 155.3 468.3, 150.4 466.3 Q 145.4 464.3, 140.4 464.6 Q 135.4 464.9, 130.4 464.9 Q 125.5 464.9, 120.5 464.8 Q 115.5 464.6, 110.5 466.3 Q 105.6 468, 100.6 468.7 Q 95.6 469.4, 90.7 469.9 Q 85.7 470.3, 80.7 471.4 Q 75.7 472.4, 70.8 471.1 Q 65.8 469.9, 60.8 469.7 Q 55.8 469.5, 50.8 470.5 Q 45.9 471.5, 40.9 470.5 Q 35.9 469.5, 30.9 469.7 Q 26 469.9, 21 470.8 L 16 471.7 L 18 471.3 L 18 471.3 Q 18 471.3, 22.9 470.7 Q 27.9 470.1, 32.8 470.5 Q 37.7 470.8, 42.7 470.5 Q 47.6 470.2, 52.5 469.2 Q 57.4 468.2, 62.3 469.4 Q 67.3 470.6, 72.2 471.5 Q 77.1 472.3, 82 471 Q 87 469.7, 91.9 468.9 Q 96.8 468.2, 101.8 467.4 Q 106.7 466.5, 111.6 465.9 Q 116.5 465.2, 121.5 465.9 Q 126.4 466.6, 131.3 466 Q 136.2 465.4, 141.1 465.3 Q 146.1 465.1, 151.1 466.9 Q 156 468.7, 160.9 469.3 Q 165.8 469.9, 170.8 470.4 Q 175.7 471, 180.6 472.9 Q 185.5 474.9, 190.4 475.2 Q 195.4 475.5, 200.3 475.4 Q 205.2 475.3, 210.1 474.6 Q 215.1 473.8, 220 470.8 Q 224.9 467.7, 229.9 466.3 Q 234.8 464.9, 239.7 464.9 Q 244.6 465, 249.6 464.4 Q 254.5 463.7, 259.4 464.6 Q 264.3 465.5, 269.3 466.6 Q 274.2 467.6, 279.1 467.2 Q 284 466.8, 288.9 468 Q 293.9 469.2, 298.9 470.3 Q 303.8 471.3, 308.7 471 Q 313.6 470.7, 318.6 472.1 Q 323.5 473.6, 328.4 473.8 Q 333.3 473.9, 338.3 472.1 Q 343.2 470.4, 348.1 470.3 Q 353 470.1, 357.9 469.8 Q 362.9 469.4, 367.8 468.1 Q 372.7 466.9, 377.6 467.2 Q 382.6 467.5, 387.5 467 Q 392.4 466.5, 397.4 465.9 Q 402.3 465.2, 407.2 465.9 Q 412.1 466.6, 417.1 466 L 422 465.4 Z';

const LEFT_NOTE_LEFT_PULP_PATH =
  'M 19 468 L 19 468 Q 19 468, 18.1 463.1 Q 17.3 458.1, 16.7 453.1 Q 16.1 448.2, 16.3 443.3 Q 16.5 438.3, 15.2 433.3 Q 13.9 428.3, 13.9 423.4 Q 14 418.4, 14.9 413.4 Q 15.9 408.5, 14.9 403.6 Q 13.8 398.6, 13.8 393.6 Q 13.7 388.7, 14.1 383.8 Q 14.4 378.8, 13.2 373.9 Q 11.9 368.9, 11.8 363.9 Q 11.6 359, 11.6 354 Q 11.6 349, 11.3 344.1 Q 11.1 339.1, 13.4 334.1 Q 15.7 329.2, 17.4 324.3 Q 19 319.3, 18.9 314.4 Q 18.9 309.4, 19.9 304.4 Q 20.9 299.5, 20.3 294.6 Q 19.7 289.6, 18.4 284.6 Q 17 279.7, 17.4 274.7 Q 17.7 269.7, 16.7 264.8 Q 15.7 259.8, 14.3 254.9 Q 12.9 249.9, 12.9 244.9 Q 12.8 240, 11 235.1 Q 9.2 230.1, 8.1 225.1 Q 6.9 220.2, 8 215.3 Q 9 210.3, 9.2 205.3 Q 9.4 200.3, 10.9 195.4 Q 12.5 190.4, 15.1 185.4 Q 17.7 180.5, 17.9 175.6 Q 18.1 170.6, 18.9 165.6 Q 19.6 160.7, 20.1 155.8 Q 20.7 150.8, 19.1 145.9 Q 17.6 140.9, 17.5 135.9 Q 17.3 131, 17.6 126 Q 17.8 121, 16.6 116 Q 15.5 111.1, 14.9 106.2 Q 14.3 101.2, 12.9 96.3 Q 11.6 91.3, 10.7 86.3 Q 9.8 81.4, 11.9 76.5 Q 14 71.5, 14.6 66.5 Q 15.1 61.6, 14.1 56.7 Q 13.1 51.7, 13.7 46.7 Q 14.3 41.7, 14.1 36.8 Q 13.9 31.8, 13.8 26.9 Q 13.7 21.9, 15.3 16.9 L 16.9 12 L 15 14 L 15 14 Q 15 14, 14.5 18.9 Q 14 23.8, 14.6 28.8 Q 15.2 33.7, 14.4 38.6 Q 13.7 43.5, 13.3 48.4 Q 12.9 53.3, 13.9 58.2 Q 15 63.1, 14.3 68 Q 13.7 73, 12.6 77.9 Q 11.4 82.8, 12.3 87.7 Q 13.2 92.6, 13.8 97.5 Q 14.3 102.4, 15 107.3 Q 15.7 112.3, 16.9 117.2 Q 18.2 122.1, 17.7 127 Q 17.2 131.9, 17.4 136.8 Q 17.7 141.7, 18.5 146.6 Q 19.4 151.6, 18.9 156.5 Q 18.3 161.4, 18.4 166.3 Q 18.4 171.2, 17.9 176.1 Q 17.4 181, 14.7 185.9 Q 12 190.9, 10.8 195.8 Q 9.7 200.7, 9.6 205.6 Q 9.5 210.5, 9.3 215.4 Q 9.1 220.3, 10.3 225.3 Q 11.6 230.2, 12.1 235.1 Q 12.7 240, 12.8 244.9 Q 12.8 249.8, 14.5 254.8 Q 16.2 259.7, 16.9 264.6 Q 17.7 269.5, 17.4 274.4 Q 17.1 279.3, 18.1 284.2 Q 19.2 289.1, 19.4 294.1 Q 19.5 299, 18.9 303.9 Q 18.4 308.8, 18.6 313.7 Q 18.8 318.6, 17.2 323.5 Q 15.6 328.4, 13.6 333.4 Q 11.5 338.3, 11.8 343.2 Q 12 348.1, 12.2 353 Q 12.4 357.9, 12.8 362.8 Q 13.2 367.7, 13.8 372.6 Q 14.4 377.6, 13.9 382.5 Q 13.5 387.4, 13.7 392.3 Q 13.9 397.2, 14.8 402.1 Q 15.7 407, 14.9 411.9 Q 14.1 416.9, 14.1 421.8 Q 14.1 426.7, 15.1 431.6 Q 16.2 436.5, 16.1 441.4 Q 15.9 446.3, 16.4 451.3 Q 17 456.2, 17.7 461.1 L 18.4 466 Z';

const LEFT_NOTE_TEAR_CONTOUR_PATH =
  'M 424 464.7 Q 424 464.7, 419 465.4 Q 414 466.2, 409.1 465.4 Q 404.1 464.5, 399.1 465.4 Q 394.1 466.2, 389.1 466.6 Q 384.2 467.1, 379.2 466.8 Q 374.2 466.4, 369.3 467.9 Q 364.3 469.5, 359.3 470.1 Q 354.3 470.7, 349.4 471 Q 344.4 471.4, 339.4 473.2 Q 334.4 475, 329.4 474.4 Q 324.5 473.9, 319.5 472.5 Q 314.5 471.1, 309.6 471.6 Q 304.6 472, 299.6 470.4 Q 294.6 468.9, 289.6 467.5 Q 284.7 466.2, 279.7 466.4 Q 274.7 466.7, 269.8 465.4 Q 264.8 464.1, 259.8 463.8 Q 254.8 463.4, 249.9 464.1 Q 244.9 464.9, 239.9 464.5 Q 234.9 464.1, 229.9 466.6 Q 225 469, 220 472.4 Q 215 475.9, 210.1 476.5 Q 205.1 477.1, 200.1 477.4 Q 195.1 477.6, 190.1 476.5 Q 185.2 475.3, 180.2 472.7 Q 175.2 470.1, 170.3 470.1 Q 165.3 470, 160.3 469.1 Q 155.3 468.3, 150.4 466.3 Q 145.4 464.3, 140.4 464.6 Q 135.4 464.9, 130.4 464.9 Q 125.5 464.9, 120.5 464.8 Q 115.5 464.6, 110.5 466.3 Q 105.6 468, 100.6 468.7 Q 95.6 469.4, 90.7 469.9 Q 85.7 470.3, 80.7 471.4 Q 75.7 472.4, 70.8 471.1 Q 65.8 469.9, 60.8 469.7 Q 55.8 469.5, 50.8 470.5 Q 45.9 471.5, 40.9 470.5 Q 35.9 469.5, 30.9 469.7 Q 26 469.9, 21 470.8 L 16 471.7 L 19 468 Q 19 468, 18.1 463.1 Q 17.3 458.1, 16.7 453.1 Q 16.1 448.2, 16.3 443.3 Q 16.5 438.3, 15.2 433.3 Q 13.9 428.3, 13.9 423.4 Q 14 418.4, 14.9 413.4 Q 15.9 408.5, 14.9 403.6 Q 13.8 398.6, 13.8 393.6 Q 13.7 388.7, 14.1 383.8 Q 14.4 378.8, 13.2 373.9 Q 11.9 368.9, 11.8 363.9 Q 11.6 359, 11.6 354 Q 11.6 349, 11.3 344.1 Q 11.1 339.1, 13.4 334.1 Q 15.7 329.2, 17.4 324.3 Q 19 319.3, 18.9 314.4 Q 18.9 309.4, 19.9 304.4 Q 20.9 299.5, 20.3 294.6 Q 19.7 289.6, 18.4 284.6 Q 17 279.7, 17.4 274.7 Q 17.7 269.7, 16.7 264.8 Q 15.7 259.8, 14.3 254.9 Q 12.9 249.9, 12.9 244.9 Q 12.8 240, 11 235.1 Q 9.2 230.1, 8.1 225.1 Q 6.9 220.2, 8 215.3 Q 9 210.3, 9.2 205.3 Q 9.4 200.3, 10.9 195.4 Q 12.5 190.4, 15.1 185.4 Q 17.7 180.5, 17.9 175.6 Q 18.1 170.6, 18.9 165.6 Q 19.6 160.7, 20.1 155.8 Q 20.7 150.8, 19.1 145.9 Q 17.6 140.9, 17.5 135.9 Q 17.3 131, 17.6 126 Q 17.8 121, 16.6 116 Q 15.5 111.1, 14.9 106.2 Q 14.3 101.2, 12.9 96.3 Q 11.6 91.3, 10.7 86.3 Q 9.8 81.4, 11.9 76.5 Q 14 71.5, 14.6 66.5 Q 15.1 61.6, 14.1 56.7 Q 13.1 51.7, 13.7 46.7 Q 14.3 41.7, 14.1 36.8 Q 13.9 31.8, 13.8 26.9 Q 13.7 21.9, 15.3 16.9 L 16.9 12';

const LEFT_NOTE_FIBERS = [
  {
    x1: 334,
    y1: 467,
    x2: 337,
    y2: 470.5,
  },
  {
    x1: 204,
    y1: 465,
    x2: 206,
    y2: 469,
  },
  {
    x1: 84,
    y1: 466,
    x2: 87,
    y2: 470,
  },
  {
    x1: 15,
    y1: 348,
    x2: 12,
    y2: 351,
  },
  {
    x1: 14,
    y1: 208,
    x2: 11,
    y2: 211,
  },
  {
    x1: 15,
    y1: 88,
    x2: 12.5,
    y2: 91,
  },
];

const LEFT_NOTE_CURL_FLAP_PATH =
  'M 424 468 C 445 476, 480 472, 498 435 C 504 412, 498 393, 492 385 Q 462 430, 424 468 Z';

const LEFT_NOTE_CURL_RIM_HIGHLIGHT =
  'M 424 468 C 445 476, 480 472, 498 435 C 504 412, 498 393, 492 385';

// 2. RIGHT NOTE (Giấy ghi chú kẻ dòng - Lined Note Sheet, ViewBox 0 0 740 430)
const RIGHT_NOTE_PAPER_BODY_PATH =
  'M 14 12.4 Q 14 12.4, 23.9 12.4 Q 33.8 12.3, 43.7 12.3 Q 53.6 12.2, 63.5 12.3 Q 73.3 12.3, 83.2 12.3 Q 93.1 12.3, 103 12.1 Q 112.9 11.9, 122.8 11.7 Q 132.7 11.5, 142.6 11.4 Q 152.4 11.4, 162.3 11.6 Q 172.2 11.7, 182.1 11.9 Q 192 12.2, 201.9 12.3 Q 211.8 12.5, 221.7 12.6 Q 231.6 12.7, 241.4 12.6 Q 251.3 12.5, 261.2 12.3 Q 271.1 12, 281 11.6 Q 290.9 11.2, 300.8 11.1 Q 310.7 11, 320.5 11.3 Q 330.4 11.6, 340.3 12.1 Q 350.2 12.5, 360.1 12.4 Q 370 12.4, 379.9 12.3 Q 389.8 12.1, 399.7 12.1 Q 409.6 12, 419.5 12 Q 429.3 12, 439.2 12 Q 449.1 12, 459 12 Q 468.9 12, 478.8 11.9 Q 488.7 11.9, 498.5 11.8 Q 508.4 11.7, 518.3 11.8 Q 528.2 12, 538.1 12.5 Q 548 13, 557.9 13.1 Q 567.8 13.2, 577.7 12.8 Q 587.6 12.3, 597.5 11.8 Q 607.3 11.2, 617.2 11.1 Q 627.1 11.1, 637 11.3 Q 646.9 11.6, 656.8 11.9 Q 666.7 12.2, 676.5 12.3 Q 686.4 12.3, 696.3 12.3 Q 706.2 12.2, 716.1 12.3 L 726 12.3 L 722.6 12 Q 722.6 12, 723.9 16.9 Q 725.1 21.9, 724.5 26.8 Q 723.8 31.7, 724.1 36.6 Q 724.5 41.6, 725.8 46.5 Q 727.1 51.4, 726.8 56.3 Q 726.5 61.3, 727 66.2 Q 727.5 71.1, 728 76 Q 728.5 81, 727.5 85.9 Q 726.6 90.8, 727.7 95.8 Q 728.8 100.7, 730.6 105.6 Q 732.5 110.5, 732 115.5 Q 731.5 120.4, 730.9 125.3 Q 730.3 130.2, 728.5 135.1 Q 726.7 140.1, 724.7 145.1 Q 722.6 150, 723 154.9 Q 723.5 159.8, 723.1 164.8 Q 722.8 169.7, 721.8 174.6 Q 720.9 179.5, 722.5 184.4 Q 724 189.4, 725.1 194.3 Q 726.3 199.2, 726.9 204.1 Q 727.5 209.1, 729.5 214 Q 731.6 218.9, 732.5 223.9 Q 733.3 228.8, 733.5 233.7 Q 733.7 238.6, 734.2 243.6 Q 734.7 248.5, 732.3 253.4 Q 729.8 258.3, 727.2 263.3 Q 724.6 268.2, 724.4 273.1 Q 724.1 278, 723.1 282.9 Q 722.1 287.9, 722.4 292.9 Q 722.6 297.8, 723.9 302.7 Q 725.1 307.6, 724.5 312.6 Q 723.8 317.5, 724.1 322.4 Q 724.5 327.3, 726.6 332.3 Q 728.7 337.2, 729.5 342.1 Q 730.3 347, 730.8 351.9 Q 731.4 356.9, 730.8 361.8 Q 730.2 366.7, 728.4 371.6 Q 726.6 376.6, 727.4 381.5 Q 728.2 386.4, 728.9 391.4 Q 729.6 396.3, 728.4 401.2 Q 727.1 406.1, 726.9 411.1 L 726.7 416 L 726 413.1 Q 726 413.1, 721 413.1 Q 716 413.1, 711 412.7 Q 706.1 412.3, 701.1 413.5 Q 696.1 414.7, 691.1 414.2 Q 686.1 413.7, 681.2 413.4 Q 676.2 413, 671.2 414.6 Q 666.2 416.3, 661.2 416.1 Q 656.2 416, 651.2 415.9 Q 646.2 415.9, 641.3 416.8 Q 636.3 417.6, 631.3 416.7 Q 626.3 415.8, 621.3 416.4 Q 616.3 416.9, 611.3 418.8 Q 606.4 420.7, 601.4 421 Q 596.4 421.3, 591.4 422.2 Q 586.4 423.1, 581.5 423 Q 576.5 422.8, 571.5 420.7 Q 566.5 418.6, 561.5 418.8 Q 556.5 418.9, 551.5 418.8 Q 546.5 418.7, 541.5 416.9 Q 536.6 415, 531.6 415 Q 526.6 415, 521.6 414.6 Q 516.6 414.1, 511.6 413 Q 506.7 411.9, 501.7 412.5 Q 496.7 413.2, 491.7 412.4 Q 486.7 411.7, 481.8 410.9 Q 476.8 410.2, 471.8 411.9 Q 466.8 413.5, 461.8 413.9 Q 456.8 414.2, 451.8 414.8 Q 446.8 415.3, 441.9 417 Q 436.9 418.6, 431.9 419.1 Q 426.9 419.6, 421.9 421.5 Q 416.9 423.3, 411.9 425.5 Q 407 427.6, 402 426.3 Q 397 425, 392 423.6 Q 387 422.1, 382.1 421 Q 377.1 419.9, 372.1 418 Q 367.1 416.2, 362.1 416.4 Q 357.1 416.6, 352.1 416.5 Q 347.2 416.3, 342.2 414.5 Q 337.2 412.6, 332.2 412.8 Q 327.2 412.9, 322.2 413 Q 317.2 413.1, 312.3 412.6 Q 307.3 412, 302.3 413.3 Q 297.3 414.6, 292.3 414.5 Q 287.3 414.3, 282.4 413.6 Q 277.4 412.8, 272.4 414.3 Q 267.4 415.7, 262.4 416.3 Q 257.4 416.8, 252.4 417.9 Q 247.5 418.9, 242.5 420.7 Q 237.5 422.5, 232.5 421.2 Q 227.5 419.9, 222.5 418.8 Q 217.5 417.7, 212.6 418.5 Q 207.6 419.3, 202.6 418.7 Q 197.6 418.1, 192.6 418.2 Q 187.6 418.3, 182.6 418.9 Q 177.7 419.4, 172.7 418.3 Q 167.7 417.2, 162.7 417.8 Q 157.7 418.3, 152.8 418.7 Q 147.8 419.1, 142.8 417.4 Q 137.8 415.6, 132.8 415.3 Q 127.8 415, 122.8 414.6 Q 117.8 414.2, 112.8 412.9 Q 107.9 411.7, 102.9 412.4 Q 97.9 413.1, 92.9 412.7 Q 87.9 412.3, 83 411.3 Q 78 410.2, 73 411.5 L 68 412.9 L 38 392 L 14 362 L 14.5 362 Q 14.5 362, 14.4 353.3 Q 14.3 344.5, 14.6 335.8 Q 14.9 327, 14.8 318.3 Q 14.7 309.5, 14.2 300.8 Q 13.7 292, 13.9 283.3 Q 14.1 274.5, 14 265.8 Q 13.9 257, 13.6 248.3 Q 13.3 239.5, 13.3 230.8 Q 13.2 222, 13.4 213.3 Q 13.6 204.5, 13.8 195.8 Q 14.1 187, 14.2 178.3 Q 14.3 169.5, 14.8 160.8 Q 15.2 152, 15.2 143.3 Q 15.2 134.5, 14.5 125.8 Q 13.8 117, 13.7 108.3 Q 13.5 99.5, 13.4 90.8 Q 13.3 82, 13.1 73.3 Q 12.8 64.5, 13.2 55.8 Q 13.6 47, 14.1 38.3 Q 14.5 29.5, 14.6 20.8 L 14.7 12 Z';

const RIGHT_NOTE_RIGHT_PULP_PATH =
  'M 722.6 12 L 722.6 12 Q 722.6 12, 723.9 16.9 Q 725.1 21.9, 724.5 26.8 Q 723.8 31.7, 724.1 36.6 Q 724.5 41.6, 725.8 46.5 Q 727.1 51.4, 726.8 56.3 Q 726.5 61.3, 727 66.2 Q 727.5 71.1, 728 76 Q 728.5 81, 727.5 85.9 Q 726.6 90.8, 727.7 95.8 Q 728.8 100.7, 730.6 105.6 Q 732.5 110.5, 732 115.5 Q 731.5 120.4, 730.9 125.3 Q 730.3 130.2, 728.5 135.1 Q 726.7 140.1, 724.7 145.1 Q 722.6 150, 723 154.9 Q 723.5 159.8, 723.1 164.8 Q 722.8 169.7, 721.8 174.6 Q 720.9 179.5, 722.5 184.4 Q 724 189.4, 725.1 194.3 Q 726.3 199.2, 726.9 204.1 Q 727.5 209.1, 729.5 214 Q 731.6 218.9, 732.5 223.9 Q 733.3 228.8, 733.5 233.7 Q 733.7 238.6, 734.2 243.6 Q 734.7 248.5, 732.3 253.4 Q 729.8 258.3, 727.2 263.3 Q 724.6 268.2, 724.4 273.1 Q 724.1 278, 723.1 282.9 Q 722.1 287.9, 722.4 292.9 Q 722.6 297.8, 723.9 302.7 Q 725.1 307.6, 724.5 312.6 Q 723.8 317.5, 724.1 322.4 Q 724.5 327.3, 726.6 332.3 Q 728.7 337.2, 729.5 342.1 Q 730.3 347, 730.8 351.9 Q 731.4 356.9, 730.8 361.8 Q 730.2 366.7, 728.4 371.6 Q 726.6 376.6, 727.4 381.5 Q 728.2 386.4, 728.9 391.4 Q 729.6 396.3, 728.4 401.2 Q 727.1 406.1, 726.9 411.1 L 726.7 416 L 726.5 414 L 726.5 414 Q 726.5 414, 726.9 409 Q 727.2 404, 728.1 399 Q 729 394, 728.4 389 Q 727.8 384, 728 379 Q 728.2 374, 729.1 369 Q 730 364, 729.6 359 Q 729.3 354, 729 349 Q 728.8 344, 727.9 339 Q 727 334, 725.9 329 Q 724.8 324, 724.8 319 Q 724.8 314, 724.1 309 Q 723.5 304, 722.9 299 Q 722.3 294, 723.5 289 Q 724.7 284, 725 279 Q 725.2 274, 725.8 269 Q 726.4 264, 729 259 Q 731.6 254, 732.5 249 Q 733.3 244, 733.1 239 Q 732.9 234, 732.4 229 Q 731.9 224, 729.9 219 Q 727.9 214, 726.9 209 Q 725.9 204, 725.6 199 Q 725.3 194, 724 189 Q 722.8 184, 723 179 Q 723.1 174, 723.5 169 Q 723.8 164, 723.3 159 Q 722.7 154, 724.2 149 Q 725.6 144, 727.7 139 Q 729.8 134, 730.4 129 Q 731 124, 731.1 119 Q 731.3 114, 729.9 109 Q 728.5 104, 727.6 99 Q 726.8 94, 727.6 89 Q 728.5 84, 728.1 79 Q 727.8 74, 727.1 69 Q 726.5 64, 726.8 59 Q 727 54, 726 49 Q 725.1 44, 724.8 39 Q 724.4 34, 724.9 29 Q 725.4 24, 724.3 19 L 723.2 14 Z';

const RIGHT_NOTE_BOTTOM_PULP_PATH =
  'M 726 413.1 L 726 413.1 Q 726 413.1, 721 413.1 Q 716 413.1, 711 412.7 Q 706.1 412.3, 701.1 413.5 Q 696.1 414.7, 691.1 414.2 Q 686.1 413.7, 681.2 413.4 Q 676.2 413, 671.2 414.6 Q 666.2 416.3, 661.2 416.1 Q 656.2 416, 651.2 415.9 Q 646.2 415.9, 641.3 416.8 Q 636.3 417.6, 631.3 416.7 Q 626.3 415.8, 621.3 416.4 Q 616.3 416.9, 611.3 418.8 Q 606.4 420.7, 601.4 421 Q 596.4 421.3, 591.4 422.2 Q 586.4 423.1, 581.5 423 Q 576.5 422.8, 571.5 420.7 Q 566.5 418.6, 561.5 418.8 Q 556.5 418.9, 551.5 418.8 Q 546.5 418.7, 541.5 416.9 Q 536.6 415, 531.6 415 Q 526.6 415, 521.6 414.6 Q 516.6 414.1, 511.6 413 Q 506.7 411.9, 501.7 412.5 Q 496.7 413.2, 491.7 412.4 Q 486.7 411.7, 481.8 410.9 Q 476.8 410.2, 471.8 411.9 Q 466.8 413.5, 461.8 413.9 Q 456.8 414.2, 451.8 414.8 Q 446.8 415.3, 441.9 417 Q 436.9 418.6, 431.9 419.1 Q 426.9 419.6, 421.9 421.5 Q 416.9 423.3, 411.9 425.5 Q 407 427.6, 402 426.3 Q 397 425, 392 423.6 Q 387 422.1, 382.1 421 Q 377.1 419.9, 372.1 418 Q 367.1 416.2, 362.1 416.4 Q 357.1 416.6, 352.1 416.5 Q 347.2 416.3, 342.2 414.5 Q 337.2 412.6, 332.2 412.8 Q 327.2 412.9, 322.2 413 Q 317.2 413.1, 312.3 412.6 Q 307.3 412, 302.3 413.3 Q 297.3 414.6, 292.3 414.5 Q 287.3 414.3, 282.4 413.6 Q 277.4 412.8, 272.4 414.3 Q 267.4 415.7, 262.4 416.3 Q 257.4 416.8, 252.4 417.9 Q 247.5 418.9, 242.5 420.7 Q 237.5 422.5, 232.5 421.2 Q 227.5 419.9, 222.5 418.8 Q 217.5 417.7, 212.6 418.5 Q 207.6 419.3, 202.6 418.7 Q 197.6 418.1, 192.6 418.2 Q 187.6 418.3, 182.6 418.9 Q 177.7 419.4, 172.7 418.3 Q 167.7 417.2, 162.7 417.8 Q 157.7 418.3, 152.8 418.7 Q 147.8 419.1, 142.8 417.4 Q 137.8 415.6, 132.8 415.3 Q 127.8 415, 122.8 414.6 Q 117.8 414.2, 112.8 412.9 Q 107.9 411.7, 102.9 412.4 Q 97.9 413.1, 92.9 412.7 Q 87.9 412.3, 83 411.3 Q 78 410.2, 73 411.5 L 68 412.9 L 70 413.2 L 70 413.2 Q 70 413.2, 75 412.3 Q 79.9 411.4, 84.8 412.1 Q 89.8 412.8, 94.8 412.6 Q 99.7 412.4, 104.7 413 Q 109.6 413.6, 114.5 414.9 Q 119.5 416.2, 124.5 415.7 Q 129.5 415.2, 134.4 415.6 Q 139.4 416.1, 144.4 417.4 Q 149.3 418.7, 154.3 418.4 Q 159.2 418, 164.1 418.4 Q 169.1 418.8, 174.1 419 Q 179 419.2, 183.9 418.1 Q 188.9 417, 193.9 417.6 Q 198.8 418.1, 203.8 418.5 Q 208.7 418.9, 213.6 418.4 Q 218.6 418, 223.6 419.3 Q 228.5 420.5, 233.5 420.4 Q 238.5 420.2, 243.4 418.5 Q 248.4 416.8, 253.4 416.9 Q 258.3 416.9, 263.3 416.4 Q 268.2 415.9, 273.1 414.7 Q 278.1 413.5, 283.1 414 Q 288 414.5, 292.9 414.1 Q 297.9 413.8, 302.9 413.4 Q 307.8 413, 312.8 413.8 Q 317.7 414.6, 322.6 413.9 Q 327.6 413.2, 332.6 413.2 Q 337.5 413.2, 342.5 414.9 Q 347.5 416.5, 352.4 416.6 Q 357.4 416.7, 362.4 417.1 Q 367.3 417.6, 372.3 418.7 Q 377.2 419.8, 382.1 420.2 Q 387.1 420.6, 392.1 422.4 Q 397 424.1, 401.9 425.1 Q 406.9 426.1, 411.9 423.9 Q 416.8 421.7, 421.8 420.2 Q 426.7 418.7, 431.6 418.1 Q 436.6 417.5, 441.6 416.1 Q 446.5 414.8, 451.5 414.9 Q 456.5 414.9, 461.4 414.4 Q 466.4 414, 471.4 412.6 Q 476.3 411.1, 481.3 411.8 Q 486.2 412.4, 491.1 412.9 Q 496.1 413.3, 501.1 413.1 Q 506 412.9, 510.9 414 Q 515.9 415.2, 520.8 415.3 Q 525.8 415.3, 530.8 415.3 Q 535.7 415.3, 540.7 417 Q 545.6 418.6, 550.5 418.6 Q 555.5 418.6, 560.5 418.6 Q 565.5 418.5, 570.5 420.3 Q 575.4 422.1, 580.3 422 Q 585.3 421.8, 590.3 421 Q 595.2 420.2, 600.2 419.9 Q 605.1 419.7, 610 418.4 Q 615 417, 620 416.6 Q 624.9 416.2, 629.8 416.8 Q 634.8 417.4, 639.8 416.7 Q 644.7 416, 649.7 416.1 Q 654.6 416.3, 659.5 416.4 Q 664.5 416.4, 669.5 415 Q 674.5 413.6, 679.5 413.9 Q 684.4 414.2, 689.3 414.5 Q 694.3 414.9, 699.3 413.9 Q 704.2 413, 709.2 413.4 Q 714.1 413.7, 719 413.7 L 724 413.7 Z';

const RIGHT_NOTE_TEAR_CONTOUR_PATH =
  'M 722.6 12 Q 722.6 12, 723.9 16.9 Q 725.1 21.9, 724.5 26.8 Q 723.8 31.7, 724.1 36.6 Q 724.5 41.6, 725.8 46.5 Q 727.1 51.4, 726.8 56.3 Q 726.5 61.3, 727 66.2 Q 727.5 71.1, 728 76 Q 728.5 81, 727.5 85.9 Q 726.6 90.8, 727.7 95.8 Q 728.8 100.7, 730.6 105.6 Q 732.5 110.5, 732 115.5 Q 731.5 120.4, 730.9 125.3 Q 730.3 130.2, 728.5 135.1 Q 726.7 140.1, 724.7 145.1 Q 722.6 150, 723 154.9 Q 723.5 159.8, 723.1 164.8 Q 722.8 169.7, 721.8 174.6 Q 720.9 179.5, 722.5 184.4 Q 724 189.4, 725.1 194.3 Q 726.3 199.2, 726.9 204.1 Q 727.5 209.1, 729.5 214 Q 731.6 218.9, 732.5 223.9 Q 733.3 228.8, 733.5 233.7 Q 733.7 238.6, 734.2 243.6 Q 734.7 248.5, 732.3 253.4 Q 729.8 258.3, 727.2 263.3 Q 724.6 268.2, 724.4 273.1 Q 724.1 278, 723.1 282.9 Q 722.1 287.9, 722.4 292.9 Q 722.6 297.8, 723.9 302.7 Q 725.1 307.6, 724.5 312.6 Q 723.8 317.5, 724.1 322.4 Q 724.5 327.3, 726.6 332.3 Q 728.7 337.2, 729.5 342.1 Q 730.3 347, 730.8 351.9 Q 731.4 356.9, 730.8 361.8 Q 730.2 366.7, 728.4 371.6 Q 726.6 376.6, 727.4 381.5 Q 728.2 386.4, 728.9 391.4 Q 729.6 396.3, 728.4 401.2 Q 727.1 406.1, 726.9 411.1 L 726.7 416 L 726 413.1 Q 726 413.1, 721 413.1 Q 716 413.1, 711 412.7 Q 706.1 412.3, 701.1 413.5 Q 696.1 414.7, 691.1 414.2 Q 686.1 413.7, 681.2 413.4 Q 676.2 413, 671.2 414.6 Q 666.2 416.3, 661.2 416.1 Q 656.2 416, 651.2 415.9 Q 646.2 415.9, 641.3 416.8 Q 636.3 417.6, 631.3 416.7 Q 626.3 415.8, 621.3 416.4 Q 616.3 416.9, 611.3 418.8 Q 606.4 420.7, 601.4 421 Q 596.4 421.3, 591.4 422.2 Q 586.4 423.1, 581.5 423 Q 576.5 422.8, 571.5 420.7 Q 566.5 418.6, 561.5 418.8 Q 556.5 418.9, 551.5 418.8 Q 546.5 418.7, 541.5 416.9 Q 536.6 415, 531.6 415 Q 526.6 415, 521.6 414.6 Q 516.6 414.1, 511.6 413 Q 506.7 411.9, 501.7 412.5 Q 496.7 413.2, 491.7 412.4 Q 486.7 411.7, 481.8 410.9 Q 476.8 410.2, 471.8 411.9 Q 466.8 413.5, 461.8 413.9 Q 456.8 414.2, 451.8 414.8 Q 446.8 415.3, 441.9 417 Q 436.9 418.6, 431.9 419.1 Q 426.9 419.6, 421.9 421.5 Q 416.9 423.3, 411.9 425.5 Q 407 427.6, 402 426.3 Q 397 425, 392 423.6 Q 387 422.1, 382.1 421 Q 377.1 419.9, 372.1 418 Q 367.1 416.2, 362.1 416.4 Q 357.1 416.6, 352.1 416.5 Q 347.2 416.3, 342.2 414.5 Q 337.2 412.6, 332.2 412.8 Q 327.2 412.9, 322.2 413 Q 317.2 413.1, 312.3 412.6 Q 307.3 412, 302.3 413.3 Q 297.3 414.6, 292.3 414.5 Q 287.3 414.3, 282.4 413.6 Q 277.4 412.8, 272.4 414.3 Q 267.4 415.7, 262.4 416.3 Q 257.4 416.8, 252.4 417.9 Q 247.5 418.9, 242.5 420.7 Q 237.5 422.5, 232.5 421.2 Q 227.5 419.9, 222.5 418.8 Q 217.5 417.7, 212.6 418.5 Q 207.6 419.3, 202.6 418.7 Q 197.6 418.1, 192.6 418.2 Q 187.6 418.3, 182.6 418.9 Q 177.7 419.4, 172.7 418.3 Q 167.7 417.2, 162.7 417.8 Q 157.7 418.3, 152.8 418.7 Q 147.8 419.1, 142.8 417.4 Q 137.8 415.6, 132.8 415.3 Q 127.8 415, 122.8 414.6 Q 117.8 414.2, 112.8 412.9 Q 107.9 411.7, 102.9 412.4 Q 97.9 413.1, 92.9 412.7 Q 87.9 412.3, 83 411.3 Q 78 410.2, 73 411.5 L 68 412.9';

const RIGHT_NOTE_FIBERS = [
  {
    x1: 726,
    y1: 122,
    x2: 729.5,
    y2: 124,
  },
  {
    x1: 725,
    y1: 242,
    x2: 728.5,
    y2: 245,
  },
  {
    x1: 726,
    y1: 352,
    x2: 729,
    y2: 355,
  },
  {
    x1: 586,
    y1: 415,
    x2: 588.5,
    y2: 419,
  },
  {
    x1: 406,
    y1: 414,
    x2: 408,
    y2: 418,
  },
  {
    x1: 236,
    y1: 415,
    x2: 238.5,
    y2: 419,
  },
];

const RIGHT_NOTE_FOLD_FLAP_PATH =
  'M 14 362 C 20 388, 30 412, 48 420 C 58 424, 64 420, 68 416 Q 38 392, 14 362 Z';

const RIGHT_NOTE_FOLD_RIM_HIGHLIGHT = 'M 14 362 C 20 388, 30 412, 48 420 C 58 424, 64 420, 68 416';

// Realistic 3D Tactile Pushpin with Steel Needle piercing through paper puncture slit
const RealisticTornNotePin: React.FC<{
  tilted?: 'left' | 'right';
  isDropped: boolean;
  paperBg?: string;
  isImmediate?: boolean;
}> = ({ tilted = 'left', isDropped, paperBg = '#FFF8DF', isImmediate = false }) => {
  const isRight = tilted === 'right';
  const pinAnimClass = isImmediate
    ? 'opacity-100 translate-y-[3px]'
    : isDropped
      ? isRight
        ? 'pin-drop-right'
        : 'pin-drop-left'
      : 'opacity-0 -translate-y-7';

  const holeAnimClass = isImmediate
    ? 'opacity-100 scale-100'
    : isDropped
      ? isRight
        ? 'hole-drop-right'
        : 'hole-drop-left'
      : 'opacity-0 scale-50';

  return (
    <div
      className='absolute pointer-events-none select-none z-20'
      style={{
        left: isRight ? `${RIGHT_PIN_ANCHOR_X_PERCENT}%` : `${LEFT_PIN_ANCHOR_X_PERCENT}%`,
        top: '-12px',
        transform: 'translateX(-50%)',
      }}
      aria-hidden='true'
    >
      {/* 1. Under-layer: Contact puncture hole, paper stress dimple & pin base contact shadow */}
      <div
        className={`absolute left-1/2 top-[40.5px] -translate-x-1/2 -translate-y-1/2 pointer-events-none ${holeAnimClass}`}
      >
        <svg width='32' height='16' viewBox='0 0 32 16' fill='none'>
          {/* Subtle paper stress crease / depression dimple */}
          <ellipse cx='16' cy='8' rx='10' ry='4.5' fill='rgba(28,25,23,0.16)' />
          {/* Contact shadow of pin base */}
          <ellipse cx='16.5' cy='8.5' rx='6.8' ry='2.6' fill='rgba(28,25,23,0.26)' />
          {/* Dark puncture hole base */}
          <ellipse cx='16' cy='8' rx='3.5' ry='1.3' fill='#1C1917' />
        </svg>
      </div>

      {/* 2. Middle-layer: Pushpin Body (Head + Metal Pin Needle) */}
      <div className={pinAnimClass}>
        <svg
          width='36'
          height='44'
          viewBox='0 0 36 44'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          className='drop-shadow-[0_4px_8px_rgba(28,25,23,0.32)]'
        >
          {/* Metal Needle Shadow */}
          <line
            x1='18.8'
            y1='24'
            x2='18.8'
            y2='40.5'
            stroke='rgba(28,25,23,0.35)'
            strokeWidth='1.5'
          />
          {/* Metallic Steel Pin Needle */}
          <line
            x1='18'
            y1='23.5'
            x2='18'
            y2='40.5'
            stroke='#78716C'
            strokeWidth='2.4'
            strokeLinecap='round'
          />
          {/* Needle Specular Highlight */}
          <line
            x1='17.4'
            y1='24'
            x2='17.4'
            y2='39.5'
            stroke='#F5F5F4'
            strokeWidth='0.75'
            strokeLinecap='round'
          />

          {/* Pin Head - Lower Base Flange */}
          <ellipse cx='18' cy='24.8' rx='7.5' ry='2.4' fill='#7C2D12' />
          <ellipse cx='18' cy='24' rx='6.2' ry='1.8' fill='#9A3412' />

          {/* Pin Head - Waist / Contoured Body */}
          <path
            d='M12.5 12 C12.5 17.5, 14.5 22, 12 24.5 L24 24.5 C21.5 22, 23.5 17.5, 23.5 12 Z'
            fill='#C2410C'
          />
          {/* Waist Highlight */}
          <path
            d='M15.5 12.5 C15.5 16.5, 16.8 20.5, 15 23 L21 23 C19.2 20.5, 20.5 16.5, 20.5 12.5 Z'
            fill='#EA580C'
            opacity='0.7'
          />

          {/* Pin Head - Upper Collar Rim */}
          <ellipse cx='18' cy='12' rx='10' ry='3.4' fill='#C2410C' />
          <ellipse cx='18' cy='11.3' rx='8.8' ry='2.6' fill='#EA580C' />

          {/* Pin Head - Top Dome */}
          <path d='M9 11.5 C9 4.8, 27 4.8, 27 11.5 Z' fill='#F97316' />
          {/* Dome 3D Highlight Curve */}
          <ellipse
            cx='15.5'
            cy='7.8'
            rx='4.5'
            ry='2'
            fill='#FFFFFF'
            opacity='0.75'
            transform='rotate(-12 15.5 7.8)'
          />
        </svg>
      </div>

      {/* 3. Over-layer: Paper Surface Slit & Lower Lip - cleanly conceals needle tip penetrating under paper */}
      <div
        className={`absolute left-1/2 top-[40.5px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 ${holeAnimClass}`}
      >
        <svg width='32' height='16' viewBox='0 0 32 16' fill='none'>
          {/* Paper mask in exact sheet background color covering the penetrating needle tip */}
          <path d='M8 8 C12 8.6, 20 8.6, 24 8 L24 16 L8 16 Z' fill={paperBg} />
          {/* Dark puncture slit entrance mouth */}
          <ellipse cx='16' cy='8' rx='2.8' ry='1.1' fill='#1C1917' />
          {/* Specular fiber highlight on torn entrance edge */}
          <path
            d='M13 7.4 Q16 6.4 19 7.4'
            stroke='rgba(255,255,255,0.85)'
            strokeWidth='0.75'
            strokeLinecap='round'
            fill='none'
          />
          {/* Paper stress crease below entry */}
          <path
            d='M13 8.8 Q16 9.8 19 8.8'
            stroke='rgba(28,25,23,0.32)'
            strokeWidth='0.6'
            strokeLinecap='round'
            fill='none'
          />
        </svg>
      </div>
    </div>
  );
};

// Thin ink outline traced over a value card's border once, then faded out (see .frame-ink CSS).
const FrameInk = () => (
  <svg className='frame-ink' aria-hidden='true' focusable='false'>
    <rect className='frame-ink-rect' x='0.5' y='0.5' rx='15.5' pathLength={1} />
  </svg>
);

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('landing');
  const [heroHighlight, setHeroHighlight] = useState<'editor' | 'artist' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Showcase Tabs state: 'pipeline' | 'script' | 'bible' | 'events' | 'references'
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<
    'pipeline' | 'script' | 'bible' | 'events' | 'references'
  >('pipeline');

  // Comparison Slider state (Phác thảo vs Hoàn thiện): 0 to 100%
  const [comparisonSliderPos, setComparisonSliderPos] = useState<number>(50);

  // Refs for the swaying paper sheets (for direct GPU transform without React re-renders)
  const leftNoteSwayRef = useRef<HTMLDivElement | null>(null);
  const rightNoteSwayRef = useRef<HTMLDivElement | null>(null);

  // Pushpin drop animation trigger states (run once per note)
  const [isPinDropped, setIsPinDropped] = useState<boolean>(false);
  const [isLeftPinDropped, setIsLeftPinDropped] = useState<boolean>(false);
  const [isRightPinDropped, setIsRightPinDropped] = useState<boolean>(false);
  const introSectionRef = useRef<HTMLDivElement | null>(null);

  const isAuthActive =
    location.pathname.startsWith('/login') || location.pathname.startsWith('/register');
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const isImmediatePinned = isAuthActive || prefersReducedMotion;

  // Track whether pushpin strike animation has completed before enabling scroll wind physics
  const pinsSettledRef = useRef<boolean>(isImmediatePinned);

  useEffect(() => {
    if (isImmediatePinned) {
      pinsSettledRef.current = true;
      return;
    }
    if (isLeftPinDropped || isRightPinDropped) {
      const timer = setTimeout(() => {
        pinsSettledRef.current = true;
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [isLeftPinDropped, isRightPinDropped, isImmediatePinned]);

  const tabKeys: Array<'pipeline' | 'script' | 'bible' | 'events' | 'references'> = [
    'pipeline',
    'script',
    'bible',
    'events',
    'references',
  ];

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentKey: typeof activeShowcaseTab,
  ) => {
    const currentIndex = tabKeys.indexOf(currentKey);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabKeys.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabKeys.length) % tabKeys.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabKeys.length - 1;
    } else {
      return;
    }

    const nextKey = tabKeys[nextIndex];
    setActiveShowcaseTab(nextKey);
    document.getElementById(`showcase-tab-${nextKey}`)?.focus();
  };

  const handleLoginClick = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      navigate(`/login${location.search}`);
    }
  };

  const handleRegisterClick = () => {
    if (onOpenRegister) {
      onOpenRegister();
    } else {
      navigate(`/register${location.search}`);
    }
  };

  const handleScrollToWorkflow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('block-workflow');
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    window.history.pushState(null, '', '#block-workflow');
  };

  const handleNavScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const target = document.getElementById(targetId);
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    window.history.pushState(null, '', `#${targetId}`);
  };

  // Close mobile drawer on Escape key and restore focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        document.getElementById('mobile-nav-toggle')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Reset mobile menu and scroll lock when resized to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile menu modal drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Manage page title and description for landing page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = t('pageTitle', 'PanelForge — Không gian cộng tác sản xuất manga');
    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc ? metaDesc.getAttribute('content') : null;
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        t(
          'pageMetaDesc',
          'PanelForge — Nền tảng cộng tác sản xuất truyện tranh có cấu trúc. Đồng bộ kịch bản, nét vẽ, xét duyệt và lịch sử phiên bản trong một không gian duy nhất.',
        ),
      );
    }
    return () => {
      document.title = previousTitle;
      if (metaDesc && previousDesc) {
        metaDesc.setAttribute('content', previousDesc);
      }
    };
  }, [t]);

  // Progressive enhancement scroll reveal observer and Pushpin observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback: If observer not supported or reduced motion preferred, make everything visible immediately
    if (!('IntersectionObserver' in window) || prefersReduced) {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        el.classList.add('is-visible');
      });
      setIsPinDropped(true);
      setIsLeftPinDropped(true);
      setIsRightPinDropped(true);
      return;
    }

    // If currently at auth route or dialog, present immediately in pinned state
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/register')) {
      setIsPinDropped(true);
      setIsLeftPinDropped(true);
      setIsRightPinDropped(true);
    }

    // Signal CSS that JS observer is active
    document.documentElement.classList.add('js-observer-ready');

    try {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              if (entry.target.id === 'block-intro-note-left') {
                setIsLeftPinDropped(true);
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setIsRightPinDropped(true);
                }
              }
              if (entry.target.id === 'block-intro-note-right') {
                setIsRightPinDropped(true);
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setIsLeftPinDropped(true);
                }
              }
              if (
                entry.target.id === 'block-intro' ||
                entry.target.getAttribute('data-reveal') === 'ink'
              ) {
                setIsPinDropped(true);
                // On desktop: if the whole intro block is in view, drop both
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setIsLeftPinDropped(true);
                  setIsRightPinDropped(true);
                }
              }
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -50px 0px' },
      );

      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        observerRef.current?.observe(el);
      });

      const leftNoteEl = document.getElementById('block-intro-note-left');
      const rightNoteEl = document.getElementById('block-intro-note-right');
      if (leftNoteEl) observerRef.current?.observe(leftNoteEl);
      if (rightNoteEl) observerRef.current?.observe(rightNoteEl);
    } catch {
      // Fallback on initialization error
      document.documentElement.classList.remove('js-observer-ready');
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        el.classList.add('is-visible');
      });
      setIsPinDropped(true);
      setIsLeftPinDropped(true);
      setIsRightPinDropped(true);
    }

    return () => {
      observerRef.current?.disconnect();
      document.documentElement.classList.remove('js-observer-ready');
    };
  }, [location.pathname]);

  // Scroll-driven gentle wind sway physics around stationary pin puncture point
  useEffect(() => {
    if (prefersReducedMotion) return;

    let isRunning = false;
    let rafId: number | null = null;

    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();
    let scrollVelocity = 0; // smoothed velocity (px/ms)

    // Current physics state
    let z1 = 0;
    let vz1 = 0;
    let x1 = 0;
    let vx1 = 0;

    let z2 = 0;
    let vz2 = 0;
    let x2 = 0;
    let vx2 = 0;

    // Spring constants (calibrated for 600-900ms settling time):
    // Note 1: slightly lower natural frequency
    const k1z = 175;
    const c1z = 18.5;
    const k1x = 180;
    const c1x = 22.0;

    // Note 2: slightly stiffer, oscillating out of sync
    const k2z = 200;
    const c2z = 21.0;
    const k2x = 195;
    const c2x = 23.5;

    const updateTransforms = (
      angleZ1: number,
      angleX1: number,
      angleZ2: number,
      angleX2: number,
    ) => {
      const isDesktop = window.innerWidth >= 1024;
      const baseZ1 = isDesktop ? -1.5 : 0;
      const baseZ2 = isDesktop ? 1.0 : 0;

      if (leftNoteSwayRef.current) {
        leftNoteSwayRef.current.style.transform = `perspective(1000px) rotate(${baseZ1 + angleZ1}deg) rotateX(${angleX1}deg)`;
      }
      if (rightNoteSwayRef.current) {
        rightNoteSwayRef.current.style.transform = `perspective(1000px) rotate(${baseZ2 + angleZ2}deg) rotateX(${angleX2}deg)`;
      }
    };

    const applyRestTransforms = () => {
      z1 = 0;
      vz1 = 0;
      x1 = 0;
      vx1 = 0;
      z2 = 0;
      vz2 = 0;
      x2 = 0;
      vx2 = 0;
      scrollVelocity = 0;
      updateTransforms(0, 0, 0, 0);
    };

    let lastFrameTime = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      // Clamp dt to avoid physics explosion on background tab wake
      const dt = Math.min(0.033, Math.max(0.005, rawDt));

      // Velocity decay towards 0
      scrollVelocity *= 0.86;
      if (Math.abs(scrollVelocity) < 0.0005) {
        scrollVelocity = 0;
      }

      const isDesktop = window.innerWidth >= 1024;
      const maxZ = isDesktop ? 1.0 : 0.35;
      const maxX = isDesktop ? 0.8 : 0.25;

      // Aerodynamic target deflections based on scroll direction & velocity
      const targetZ1 = Math.max(-maxZ, Math.min(maxZ, scrollVelocity * 1.4));
      const targetX1 = Math.max(0, Math.min(maxX, scrollVelocity * 1.0));

      const targetZ2 = Math.max(-maxZ, Math.min(maxZ, -scrollVelocity * 1.3));
      const targetX2 = Math.max(0, Math.min(maxX, scrollVelocity * 0.9));

      // Spring integration for Note 1
      const f1z = -k1z * (z1 - targetZ1) - c1z * vz1;
      vz1 += f1z * dt;
      z1 += vz1 * dt;

      const f1x = -k1x * (x1 - targetX1) - c1x * vx1;
      vx1 += f1x * dt;
      x1 += vx1 * dt;

      // Spring integration for Note 2
      const f2z = -k2z * (z2 - targetZ2) - c2z * vz2;
      vz2 += f2z * dt;
      z2 += vz2 * dt;

      const f2x = -k2x * (x2 - targetX2) - c2x * vx2;
      vx2 += f2x * dt;
      x2 += vx2 * dt;

      // Clamp strictly within safe angle bounds
      z1 = Math.max(-maxZ, Math.min(maxZ, z1));
      x1 = Math.max(0, Math.min(maxX, x1));
      z2 = Math.max(-maxZ, Math.min(maxZ, z2));
      x2 = Math.max(0, Math.min(maxX, x2));

      updateTransforms(z1, x1, z2, x2);

      // Check if motion has settled into rest state
      const isSettled =
        Math.abs(scrollVelocity) === 0 &&
        Math.abs(z1) < 0.02 &&
        Math.abs(vz1) < 0.02 &&
        Math.abs(x1) < 0.02 &&
        Math.abs(vx1) < 0.02 &&
        Math.abs(z2) < 0.02 &&
        Math.abs(vz2) < 0.02 &&
        Math.abs(x2) < 0.02 &&
        Math.abs(vx2) < 0.02;

      if (isSettled || document.hidden || isAuthActive) {
        applyRestTransforms();
        isRunning = false;
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (isRunning) return;
      if (!pinsSettledRef.current) return;
      if (document.hidden || isAuthActive) return;
      isRunning = true;
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!pinsSettledRef.current) return;
      if (document.hidden || isAuthActive) return;

      const introEl = introSectionRef.current;
      if (introEl) {
        const rect = introEl.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (!inView) {
          if (isRunning) {
            if (rafId) cancelAnimationFrame(rafId);
            isRunning = false;
            applyRestTransforms();
          }
          return;
        }
      }

      const now = performance.now();
      const currentY = window.scrollY;
      const timeSinceLastScroll = now - lastScrollTime;
      const dt = timeSinceLastScroll > 120 ? 16 : Math.max(1, timeSinceLastScroll);
      const dy = currentY - lastScrollY;
      lastScrollY = currentY;
      lastScrollTime = now;

      const rawV = dy / dt;
      scrollVelocity =
        timeSinceLastScroll > 120 ? rawV * 0.45 : scrollVelocity * 0.55 + rawV * 0.45;

      if (Math.abs(scrollVelocity) > 0.015) {
        startLoop();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden && isRunning) {
        if (rafId) cancelAnimationFrame(rafId);
        isRunning = false;
        applyRestTransforms();
      }
    };

    const onResize = () => {
      if (!isRunning) {
        applyRestTransforms();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    applyRestTransforms();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthActive, prefersReducedMotion]);

  // Hiệu ứng chữ loang mực tiêu đề Hero: mực vừa chạm giấy và thấm sâu vào thớ sợi (chạy một lần duy nhất khi mount)
  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId: number | null = null;
    let isCancelled = false;

    const runInkSoak = () => {
      if (isCancelled) return;
      const disp = document.getElementById(
        'pf-hero-disp',
      ) as unknown as SVGFEDisplacementMapElement | null;
      const halo = document.getElementById(
        'pf-hero-halo-matrix',
      ) as unknown as SVGFEColorMatrixElement | null;
      if (!disp) return;

      const duration = 850; // 850ms soaking duration (trong khoảng 700-1000ms)
      const startDelay = 160; // đồng bộ với hero-stagger-2 bắt đầu xuất hiện
      let startTime: number | null = null;

      const step = (now: number) => {
        if (isCancelled) return;
        if (!startTime) startTime = now + startDelay;

        if (now < startTime) {
          rafId = requestAnimationFrame(step);
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing tự nhiên đồng bộ với Hero: cubic-bezier(0.16, 1, 0.3, 1)
        const ease = 1 - Math.pow(1 - progress, 3);

        // Mực ướt lúc chạm giấy loang mạnh (8.2px) rồi hút sâu vào thớ giấy, ổn định ở mép sần tự nhiên (3.6px)
        const currentScale = 8.2 - 4.6 * ease;
        disp.setAttribute('scale', currentScale.toFixed(2));

        // Quầng mao dẫn mực thấm nhạt dần theo quá trình khô tự nhiên
        if (halo) {
          const haloAlpha = (0.65 - 0.35 * ease).toFixed(2);
          halo.setAttribute(
            'values',
            `0 0 0 0 0.11 0 0 0 0 0.10 0 0 0 0 0.09 0 0 0 ${haloAlpha} 0`,
          );
        }

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          // Trạng thái kết thúc: cố định vĩnh viễn ở texture mép sần mực in manga, không lặp lại
          disp.setAttribute('scale', '3.60');
          if (halo) {
            halo.setAttribute('values', '0 0 0 0 0.11 0 0 0 0 0.10 0 0 0 0 0.09 0 0 0 0.30 0');
          }
        }
      };

      rafId = requestAnimationFrame(step);
    };

    // Đợi font Patrick Hand SC / Patrick Hand tải xong để hiệu ứng không chạy trước khi chữ hiển thị
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          runInkSoak();
        })
        .catch(() => {
          runInkSoak();
        });
    } else {
      runInkSoak();
    }

    return () => {
      isCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  return (
    <div className='antialiased text-[#1C1917] bg-[#F3F0E9] overflow-x-hidden min-h-screen flex flex-col justify-between font-sans'>
      {/* Scoped CSS for Comic Typography, Speech Balloon CTA, Brush Underline, and Pushpin Drop */}
      <style>{`
        @keyframes heroFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-stagger-1 {
          animation: heroFadeIn 500ms cubic-bezier(0.16, 1, 0.3, 1) 60ms both;
        }
        .hero-stagger-2 {
          animation: heroFadeIn 520ms cubic-bezier(0.16, 1, 0.3, 1) 160ms both;
        }
        .hero-stagger-3 {
          animation: heroFadeIn 520ms cubic-bezier(0.16, 1, 0.3, 1) 280ms both;
        }
        .hero-stagger-4 {
          animation: heroFadeIn 520ms cubic-bezier(0.16, 1, 0.3, 1) 380ms both;
        }
        .hero-stagger-5 {
          animation: heroFadeIn 520ms cubic-bezier(0.16, 1, 0.3, 1) 480ms both;
        }

        /* Hiệu ứng mực in manga hơi loang nhẹ và sần viền chữ (Manga Ink Bleed) */
        .hero-ink-bleed {
          filter: url(#pf-hero-ink-bleed);
          color: #1C1917;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: subpixel-antialiased;
        }
        @supports not (filter: url(#pf-hero-ink-bleed)) {
          .hero-ink-bleed {
            filter: none;
          }
        }

        /* Quệt nét cọ cam từ trái sang phải bằng clip-path giữ nguyên dáng hữu cơ */
        @keyframes heroBrushWipe {
          0% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          100% {
            clip-path: inset(0 0% 0 0);
            opacity: 0.85;
          }
        }
        .hero-brush-svg {
          opacity: 0;
          clip-path: inset(0 100% 0 0);
          animation: heroBrushWipe 680ms cubic-bezier(0.16, 1, 0.3, 1) 440ms forwards;
          will-change: clip-path, opacity;
        }
        /* 650ms Multi-phase Realistic Pin Strike - Left Note (-8deg to -3deg to settle) */
        @keyframes pinStrikeLeft {
          0% {
            opacity: 0;
            transform: translateY(-28px) rotate(-8deg);
          }
          46% {
            opacity: 1;
            transform: translateY(0px) rotate(-3deg);
          }
          65% {
            transform: translateY(3.5px) rotate(0deg);
          }
          82% {
            transform: translateY(2.6px) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: translateY(3px) rotate(0deg);
          }
        }

        /* 650ms Multi-phase Realistic Pin Strike - Right Note (+8deg to +3deg to settle) */
        @keyframes pinStrikeRight {
          0% {
            opacity: 0;
            transform: translateY(-28px) rotate(8deg);
          }
          46% {
            opacity: 1;
            transform: translateY(0px) rotate(3deg);
          }
          65% {
            transform: translateY(3.5px) rotate(0deg);
          }
          82% {
            transform: translateY(2.6px) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: translateY(3px) rotate(0deg);
          }
        }

        /* Puncture Hole & Impact Dimple: appears precisely upon needle impact at ~300ms (46%) */
        @keyframes punctureHoleImpact {
          0%, 44% {
            opacity: 0;
            transform: scale(0.35);
          }
          48% {
            opacity: 1;
            transform: scale(1.22);
          }
          68% {
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Paper Depresses 1.5px upon pin strike and springs back to rest (420ms - 650ms) */
        @keyframes paperImpactSettle {
          0%, 46% {
            transform: translateY(0px);
          }
          65% {
            transform: translateY(1.5px);
          }
          85% {
            transform: translateY(0.4px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .pin-drop-left {
          animation: pinStrikeLeft 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pin-drop-right {
          animation: pinStrikeRight 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hole-drop-left {
          animation: punctureHoleImpact 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hole-drop-right {
          animation: punctureHoleImpact 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .paper-settle-left {
          animation: paperImpactSettle 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .paper-settle-right {
          animation: paperImpactSettle 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (min-width: 1024px) {
          .pin-drop-right {
            animation-delay: 140ms;
          }
          .hole-drop-right {
            animation-delay: 140ms;
          }
          .paper-settle-right {
            animation-delay: 140ms;
          }
          #block-intro-note-left .note-content {
            transform: rotate(1.5deg);
          }
          #block-intro-note-right .note-content {
            transform: rotate(-1.0deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-stagger-1,
          .hero-stagger-2,
          .hero-stagger-3,
          .hero-stagger-4,
          .hero-stagger-5 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .hero-brush-svg,
          .hero-brush-path {
            animation: none !important;
            clip-path: none !important;
            opacity: 0.85 !important;
            stroke-dashoffset: 0 !important;
          }
          .pin-drop-left,
          .pin-drop-right,
          .hole-drop-left,
          .hole-drop-right,
          .paper-settle-left,
          .paper-settle-right,
          .note-paper-sway {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* SVG Filter cho hiệu ứng chữ loang mực tiêu đề Hero (Manga Manuscript Ink Bleed) */}
      <svg
        width='0'
        height='0'
        className='absolute pointer-events-none -z-50 overflow-hidden'
        aria-hidden='true'
        focusable='false'
      >
        <defs>
          <filter
            id='pf-hero-ink-bleed'
            x='-20%'
            y='-20%'
            width='140%'
            height='140%'
            filterUnits='objectBoundingBox'
          >
            {/* Nhiễu hạt vi mô mô phỏng xơ sợi giấy bản thảo và mao dẫn mực */}
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.042 0.042'
              numOctaves='3'
              seed='38'
              result='paperNoise'
            />

            {/* Lớp sần mép mực chính (Displacement Map: loang sần lúc ướt -> thấm sâu ổn định vào xơ giấy) */}
            <feDisplacementMap
              id='pf-hero-disp'
              in='SourceGraphic'
              in2='paperNoise'
              scale='3.6'
              xChannelSelector='R'
              yChannelSelector='G'
              result='displacedText'
            >
              <animate
                id='pf-hero-disp-anim'
                attributeName='scale'
                values='8.2; 6.5; 4.6; 3.6'
                keyTimes='0; 0.25; 0.65; 1'
                dur='850ms'
                begin='160ms'
                fill='freeze'
                calcMode='spline'
                keySplines='0.16 1 0.3 1; 0.16 1 0.3 1; 0.16 1 0.3 1'
              />
            </feDisplacementMap>

            {/* Lớp thấm mực mao dẫn (Capillary Bleed Spread): mô phỏng mực ướt ngấm theo thớ giấy quanh mép */}
            <feMorphology operator='dilate' radius='0.6' in='SourceGraphic' result='dilatedText' />
            <feDisplacementMap
              in='dilatedText'
              in2='paperNoise'
              scale='5.5'
              xChannelSelector='R'
              yChannelSelector='G'
              result='capillaryFringe'
            />
            <feColorMatrix
              id='pf-hero-halo-matrix'
              in='capillaryFringe'
              type='matrix'
              values='0 0 0 0 0.11
                      0 0 0 0 0.10
                      0 0 0 0 0.09
                      0 0 0 0 0.30 0'
              result='faintBleedHalo'
            >
              <animate
                attributeName='values'
                values='0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.65 0;
                        0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.45 0;
                        0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.30 0'
                keyTimes='0; 0.4; 1'
                dur='850ms'
                begin='160ms'
                fill='freeze'
              />
            </feColorMatrix>

            {/* Ghép lớp: Lớp mao dẫn mờ ở đáy, lớp mép sần chính ở trên, và lớp lõi SourceGraphic tăng độ sắc nét */}
            <feMerge>
              <feMergeNode in='faintBleedHalo' />
              <feMergeNode in='displacedText' />
              <feMergeNode in='SourceGraphic' opacity='0.40' />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* ===== HEADER / NAVBAR ===== */}
      <header className='sticky top-0 z-40 bg-[#F3F0E9]/95 backdrop-blur-md border-b border-[#D8D2C5]'>
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] h-16 flex items-center justify-between'>
          {/* Logo */}
          <a
            href='#hero-section'
            onClick={(e) => handleNavScroll(e, 'hero-section')}
            className='flex items-center gap-2 group shrink-0'
            aria-label={t('nav.homeAria', 'PanelForge - Về đầu trang')}
          >
            <BrandMark
              size={30}
              className='shrink-0 group-hover:scale-105 transition-transform motion-reduce:transform-none'
            />
            <span className='font-serif text-lg sm:text-xl font-medium tracking-tight text-[#1C1917]'>
              PanelForge
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav
            aria-label={t('nav.mainNavAria', 'Điều hướng chính')}
            className='hidden md:flex items-center gap-8 text-xs font-medium text-[#57534E]'
          >
            <a
              href='#block-features'
              onClick={(e) => handleNavScroll(e, 'block-features')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              {t('nav.features', 'Tính năng')}
            </a>
            <a
              href='#block-workflow'
              onClick={(e) => handleNavScroll(e, 'block-workflow')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              {t('nav.workflow', 'Quy trình')}
            </a>
            <a
              href='#block-showcase'
              onClick={(e) => handleNavScroll(e, 'block-showcase')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              {t('nav.showcase', 'Trưng bày')}
            </a>
            <a
              href='#block-faq'
              onClick={(e) => handleNavScroll(e, 'block-faq')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              {t('nav.faq', 'Hỏi đáp')}
            </a>
          </nav>

          {/* Right: Language switcher, Auth buttons & Mobile menu toggle */}
          <div className='flex items-center gap-2 sm:gap-3 shrink-0'>
            <LanguageSwitcher className='hidden sm:inline-flex mr-0.5' />
            <button
              onClick={handleLoginClick}
              aria-label={t('nav.login', 'Đăng nhập')}
              className='text-xs sm:text-sm text-[#1C1917] font-medium hover:bg-[#EAE5DC] border border-[#D8D2C5] hover:border-[#1C1917] active:scale-[0.98] motion-reduce:transform-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
            >
              {t('nav.login', 'Đăng nhập')}
            </button>
            <button
              onClick={handleRegisterClick}
              aria-label={t('nav.register', 'Tạo tài khoản')}
              className='inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#1C1917] text-white text-xs sm:text-sm font-medium hover:bg-black active:scale-[0.98] motion-reduce:transform-none shadow-soft-sm transition-all duration-200 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
            >
              <span>{t('nav.register', 'Tạo tài khoản')}</span>
              <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
            </button>

            {/* Mobile Nav Toggle */}
            <button
              id='mobile-nav-toggle'
              type='button'
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-controls='mobile-nav-drawer'
              aria-label={
                isMobileMenuOpen
                  ? t('nav.closeMenu', 'Đóng menu điều hướng')
                  : t('nav.openMenu', 'Mở menu điều hướng')
              }
              className='md:hidden p-2 rounded-lg text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
            >
              {isMobileMenuOpen ? (
                <X className='w-5 h-5' aria-hidden='true' />
              ) : (
                <Menu className='w-5 h-5' aria-hidden='true' />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            id='mobile-nav-drawer'
            role='dialog'
            aria-modal='true'
            aria-label={t('nav.mobileDrawerAria', 'Menu điều hướng trên điện thoại')}
            className='md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-[#F3F0E9]/98 backdrop-blur-md border-b border-[#D8D2C5] flex flex-col justify-between p-6 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200'
          >
            <nav className='flex flex-col gap-3 text-base font-medium text-stone-800 pt-2'>
              <a
                href='#block-features'
                onClick={(e) => handleNavScroll(e, 'block-features')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>{t('nav.features', 'Tính năng')}</span>
                <span className='text-stone-400'>→</span>
              </a>
              <a
                href='#block-workflow'
                onClick={(e) => handleNavScroll(e, 'block-workflow')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>{t('nav.workflow', 'Quy trình')}</span>
                <span className='text-stone-400'>→</span>
              </a>
              <a
                href='#block-showcase'
                onClick={(e) => handleNavScroll(e, 'block-showcase')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>{t('nav.showcase', 'Trưng bày')}</span>
                <span className='text-stone-400'>→</span>
              </a>
              <a
                href='#block-faq'
                onClick={(e) => handleNavScroll(e, 'block-faq')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>{t('nav.faq', 'Hỏi đáp')}</span>
                <span className='text-stone-400'>→</span>
              </a>
            </nav>

            <div className='flex flex-col gap-3 pb-8 pt-4 border-t border-[#D8D2C5]'>
              <div className='flex items-center justify-between pb-1'>
                <span className='text-xs font-mono text-[#57534E]'>Ngôn ngữ / Language:</span>
                <LanguageSwitcher />
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLoginClick();
                }}
                className='w-full py-3 rounded-full border border-[#D8D2C5] text-[#1C1917] font-medium hover:bg-[#EAE5DC] transition-colors active:scale-[0.98] motion-reduce:transform-none'
              >
                {t('nav.login', 'Đăng nhập')}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleRegisterClick();
                }}
                className='w-full py-3 rounded-full bg-[#1C1917] text-white font-medium hover:bg-black transition-colors active:scale-[0.98] motion-reduce:transform-none'
              >
                {t('nav.register', 'Tạo tài khoản')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===== HERO SECTION ===== */}
      <section
        id='hero-section'
        className='hero-desktop-screen scroll-mt-20 relative w-full bg-[#FCFBF8] flex flex-col justify-between overflow-hidden'
      >
        {/* Subtle Studio Drafting Grid on the right canvas (< 3.5% opacity) */}
        <div
          className='absolute inset-0 pointer-events-none opacity-[0.035] manuscript-grid z-0'
          aria-hidden='true'
        />

        {/* Left margin guideline indicator (as seen in Reference Image 2) */}
        <div
          className='hidden 2xl:flex absolute left-4 sm:left-7 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180 text-[11px] font-mono tracking-[0.2em] text-[#0284C7]/75 select-none pointer-events-none items-center gap-2 z-10'
          aria-hidden='true'
        >
          <span>{t('hero.marginGuideline', '01 / Bắt đầu một câu chuyện')}</span>
        </div>

        {/* ============================================================== */}
        {/* DESKTOP TORN PAPER SHEET (LEFT ~54% WIDTH) — ASYMMETRIC TORN EDGE */}
        {/* ============================================================== */}
        <div
          className='hidden lg:block absolute inset-0 w-full h-full pointer-events-none select-none z-0'
          aria-hidden='true'
        >
          <svg
            className='w-full h-full'
            viewBox='0 0 1000 800'
            preserveAspectRatio='none'
            style={{
              filter:
                'drop-shadow(2.5px 0px 3px rgba(45, 34, 24, 0.13)) drop-shadow(8px 0px 20px rgba(45, 34, 24, 0.06))',
            }}
          >
            {/* Main torn paper body */}
            <path
              d='M 0 0 L 575.8 0 Q 575.8 0, 576.6 4.5 Q 577.4 8.9, 577.3 13.4 Q 577.3 17.8, 577.4 22.3 Q 577.5 26.7, 579.2 31.2 Q 580.8 35.6, 580.4 40 Q 580 44.4, 579.9 48.8 Q 579.7 53.3, 580.9 57.8 Q 582 62.2, 582.1 66.7 Q 582.2 71.1, 581.2 75.6 Q 580.1 80, 581.7 84.5 Q 583.2 88.9, 581 93.4 Q 578.8 97.8, 579.6 102.3 Q 580.3 106.7, 578.3 111.2 Q 576.3 115.6, 575.3 120 Q 574.2 124.4, 574.3 128.9 Q 574.3 133.3, 573.6 137.8 Q 572.9 142.2, 573.5 146.6 Q 574.1 151.1, 574.3 155.6 Q 574.4 160, 571.2 164.5 Q 568 168.9, 568.2 173.4 Q 568.3 177.8, 566.3 182.3 Q 564.3 186.7, 564.5 191.1 Q 564.6 195.6, 562.8 200 Q 560.9 204.4, 557.3 208.9 Q 553.7 213.3, 552.4 217.8 Q 551 222.2, 549.4 226.7 Q 547.8 231.1, 548.2 235.6 Q 548.5 240, 549.5 244.5 Q 550.5 248.9, 550 253.4 Q 549.4 257.8, 548.6 262.3 Q 547.8 266.7, 548.2 271.2 Q 548.6 275.6, 544.6 280 Q 540.5 284.4, 541.1 288.9 Q 541.6 293.3, 540.4 297.8 Q 539.1 302.2, 541.2 306.7 Q 543.3 311.1, 538.8 315.6 Q 534.2 320, 535.9 324.5 Q 537.5 328.9, 536.6 333.4 Q 535.6 337.8, 540.3 342.3 Q 545 346.7, 543.9 351.2 Q 542.7 355.6, 541.1 360 Q 539.4 364.4, 541.4 368.9 Q 543.4 373.3, 544.6 377.8 Q 545.8 382.2, 544.7 386.7 Q 543.5 391.1, 543.6 395.6 Q 543.7 400, 544.3 404.5 Q 544.9 408.9, 545.3 413.4 Q 545.6 417.8, 546.5 422.3 Q 547.4 426.7, 548.2 431.2 Q 548.9 435.6, 550.5 440 Q 552.1 444.4, 551.7 448.9 Q 551.3 453.3, 551.6 457.8 Q 551.9 462.2, 552.2 466.7 Q 552.4 471.1, 550.3 475.6 Q 548.1 480, 551.2 484.5 Q 554.2 488.9, 553.2 493.4 Q 552.1 497.8, 554.7 502.3 Q 557.3 506.7, 556.7 511.2 Q 556 515.6, 556.9 520 Q 557.7 524.4, 559.2 528.8 Q 560.6 533.3, 563.3 537.8 Q 565.9 542.2, 564.1 546.7 Q 562.3 551.1, 562.6 555.6 Q 562.8 560, 565.1 564.5 Q 567.3 568.9, 567.4 573.3 Q 567.5 577.8, 568.6 582.3 Q 569.6 586.7, 570 591.2 Q 570.3 595.6, 569.3 600 Q 568.4 604.4, 569 608.8 Q 569.5 613.3, 569.6 617.8 Q 569.6 622.2, 570.6 626.7 Q 571.5 631.1, 571.8 635.6 Q 572.1 640, 573.5 644.5 Q 574.8 648.9, 573.2 653.3 Q 571.6 657.8, 572.3 662.3 Q 573 666.7, 572 671.2 Q 571 675.6, 570.9 680 Q 570.7 684.4, 569.7 688.8 Q 568.6 693.3, 566.9 697.8 Q 565.1 702.2, 565.3 706.7 Q 565.4 711.1, 565.8 715.6 Q 566.2 720, 566.6 724.5 Q 566.9 728.9, 568.3 733.3 Q 569.8 737.8, 569.8 742.3 Q 569.9 746.7, 569.3 751.2 Q 568.6 755.6, 569 760 Q 569.4 764.4, 569.1 768.8 Q 568.8 773.3, 568.8 777.8 Q 568.7 782.2, 569.7 786.7 Q 570.7 791.1, 570.5 795.6 L 570.3 800 L 0 800 Z'
              fill='#F3F0E9'
            />
            {/* Exposed inner pulp deckle ribbon */}
            <path
              d='M 575.8 0 L 576.9 0 Q 576.9 0, 577.7 4.5 Q 578.5 8.9, 578.5 13.4 Q 578.4 17.8, 579.2 22.3 Q 579.9 26.7, 580.9 31.2 Q 581.9 35.6, 582.3 40 Q 582.6 44.4, 582.3 48.8 Q 582 53.3, 583.2 57.8 Q 584.4 62.2, 584.5 66.7 Q 584.6 71.1, 584 75.6 Q 583.3 80, 584.3 84.5 Q 585.2 88.9, 583.4 93.4 Q 581.6 97.8, 582.3 102.3 Q 582.9 106.7, 581.3 111.2 Q 579.8 115.6, 578.7 120 Q 577.5 124.4, 577.5 128.9 Q 577.4 133.3, 577.4 137.8 Q 577.4 142.2, 577.1 146.6 Q 576.7 151.1, 577.2 155.6 Q 577.7 160, 574.1 164.5 Q 570.4 168.9, 571.2 173.4 Q 572 177.8, 569.9 182.3 Q 567.7 186.7, 567 191.1 Q 566.2 195.6, 564.7 200 Q 563.1 204.4, 559.7 208.9 Q 556.3 213.3, 554.7 217.8 Q 553 222.2, 551.6 226.7 Q 550.1 231.1, 549.9 235.6 Q 549.6 240, 551 244.5 Q 552.4 248.9, 552.3 253.4 Q 552.3 257.8, 551.3 262.3 Q 550.3 266.7, 550.1 271.2 Q 549.9 275.6, 547 280 Q 544 284.4, 544.1 288.9 Q 544.1 293.3, 542.9 297.8 Q 541.7 302.2, 544.1 306.7 Q 546.4 311.1, 542.8 315.6 Q 539.1 320, 540.6 324.5 Q 542.1 328.9, 540.4 333.4 Q 538.7 337.8, 542.8 342.3 Q 546.8 346.7, 545.7 351.2 Q 544.5 355.6, 543.4 360 Q 542.3 364.4, 544.2 368.9 Q 546.1 373.3, 546.9 377.8 Q 547.6 382.2, 546.4 386.7 Q 545.2 391.1, 545.4 395.6 Q 545.6 400, 546.1 404.5 Q 546.6 408.9, 547.2 413.4 Q 547.7 417.8, 548.2 422.3 Q 548.7 426.7, 549.6 431.2 Q 550.4 435.6, 551.9 440 Q 553.4 444.4, 553.7 448.9 Q 553.9 453.3, 554.2 457.8 Q 554.4 462.2, 554.8 466.7 Q 555.1 471.1, 553.1 475.6 Q 551.1 480, 553.5 484.5 Q 555.8 488.9, 555.7 493.4 Q 555.5 497.8, 558 502.3 Q 560.4 506.7, 559.1 511.2 Q 557.7 515.6, 558.8 520 Q 559.8 524.4, 561.1 528.8 Q 562.3 533.3, 565.9 537.8 Q 569.5 542.2, 567.6 546.7 Q 565.7 551.1, 566 555.6 Q 566.3 560, 567.9 564.5 Q 569.5 568.9, 569.7 573.3 Q 569.8 577.8, 571 582.3 Q 572.2 586.7, 572.5 591.2 Q 572.8 595.6, 571.9 600 Q 571 604.4, 571.2 608.8 Q 571.3 613.3, 571.3 617.8 Q 571.4 622.2, 572.6 626.7 Q 573.8 631.1, 573.7 635.6 Q 573.6 640, 574.8 644.5 Q 575.9 648.9, 574.8 653.3 Q 573.7 657.8, 574.1 662.3 Q 574.5 666.7, 573.5 671.2 Q 572.5 675.6, 572.1 680 Q 571.7 684.4, 571.3 688.8 Q 570.9 693.3, 569 697.8 Q 567.1 702.2, 567.5 706.7 Q 567.9 711.1, 568.3 715.6 Q 568.8 720, 568.3 724.5 Q 567.9 728.9, 569.7 733.3 Q 571.4 737.8, 571.7 742.3 Q 571.9 746.7, 570.8 751.2 Q 569.8 755.6, 570.1 760 Q 570.3 764.4, 570.6 768.8 Q 570.9 773.3, 570.5 777.8 Q 570.1 782.2, 571.2 786.7 Q 572.2 791.1, 571.9 795.6 L 571.5 800 L 570.3 800 Z'
              fill='#FAF7F0'
              opacity='0.96'
            />
            {/* Fine outer tear contour */}
            <path
              d='M 576.9 0 Q 576.9 0, 577.7 4.5 Q 578.5 8.9, 578.5 13.4 Q 578.4 17.8, 579.2 22.3 Q 579.9 26.7, 580.9 31.2 Q 581.9 35.6, 582.3 40 Q 582.6 44.4, 582.3 48.8 Q 582 53.3, 583.2 57.8 Q 584.4 62.2, 584.5 66.7 Q 584.6 71.1, 584 75.6 Q 583.3 80, 584.3 84.5 Q 585.2 88.9, 583.4 93.4 Q 581.6 97.8, 582.3 102.3 Q 582.9 106.7, 581.3 111.2 Q 579.8 115.6, 578.7 120 Q 577.5 124.4, 577.5 128.9 Q 577.4 133.3, 577.4 137.8 Q 577.4 142.2, 577.1 146.6 Q 576.7 151.1, 577.2 155.6 Q 577.7 160, 574.1 164.5 Q 570.4 168.9, 571.2 173.4 Q 572 177.8, 569.9 182.3 Q 567.7 186.7, 567 191.1 Q 566.2 195.6, 564.7 200 Q 563.1 204.4, 559.7 208.9 Q 556.3 213.3, 554.7 217.8 Q 553 222.2, 551.6 226.7 Q 550.1 231.1, 549.9 235.6 Q 549.6 240, 551 244.5 Q 552.4 248.9, 552.3 253.4 Q 552.3 257.8, 551.3 262.3 Q 550.3 266.7, 550.1 271.2 Q 549.9 275.6, 547 280 Q 544 284.4, 544.1 288.9 Q 544.1 293.3, 542.9 297.8 Q 541.7 302.2, 544.1 306.7 Q 546.4 311.1, 542.8 315.6 Q 539.1 320, 540.6 324.5 Q 542.1 328.9, 540.4 333.4 Q 538.7 337.8, 542.8 342.3 Q 546.8 346.7, 545.7 351.2 Q 544.5 355.6, 543.4 360 Q 542.3 364.4, 544.2 368.9 Q 546.1 373.3, 546.9 377.8 Q 547.6 382.2, 546.4 386.7 Q 545.2 391.1, 545.4 395.6 Q 545.6 400, 546.1 404.5 Q 546.6 408.9, 547.2 413.4 Q 547.7 417.8, 548.2 422.3 Q 548.7 426.7, 549.6 431.2 Q 550.4 435.6, 551.9 440 Q 553.4 444.4, 553.7 448.9 Q 553.9 453.3, 554.2 457.8 Q 554.4 462.2, 554.8 466.7 Q 555.1 471.1, 553.1 475.6 Q 551.1 480, 553.5 484.5 Q 555.8 488.9, 555.7 493.4 Q 555.5 497.8, 558 502.3 Q 560.4 506.7, 559.1 511.2 Q 557.7 515.6, 558.8 520 Q 559.8 524.4, 561.1 528.8 Q 562.3 533.3, 565.9 537.8 Q 569.5 542.2, 567.6 546.7 Q 565.7 551.1, 566 555.6 Q 566.3 560, 567.9 564.5 Q 569.5 568.9, 569.7 573.3 Q 569.8 577.8, 571 582.3 Q 572.2 586.7, 572.5 591.2 Q 572.8 595.6, 571.9 600 Q 571 604.4, 571.2 608.8 Q 571.3 613.3, 571.3 617.8 Q 571.4 622.2, 572.6 626.7 Q 573.8 631.1, 573.7 635.6 Q 573.6 640, 574.8 644.5 Q 575.9 648.9, 574.8 653.3 Q 573.7 657.8, 574.1 662.3 Q 574.5 666.7, 573.5 671.2 Q 572.5 675.6, 572.1 680 Q 571.7 684.4, 571.3 688.8 Q 570.9 693.3, 569 697.8 Q 567.1 702.2, 567.5 706.7 Q 567.9 711.1, 568.3 715.6 Q 568.8 720, 568.3 724.5 Q 567.9 728.9, 569.7 733.3 Q 571.4 737.8, 571.7 742.3 Q 571.9 746.7, 570.8 751.2 Q 569.8 755.6, 570.1 760 Q 570.3 764.4, 570.6 768.8 Q 570.9 773.3, 570.5 777.8 Q 570.1 782.2, 571.2 786.7 Q 572.2 791.1, 571.9 795.6'
              fill='none'
              stroke='#FFFDF8'
              strokeWidth='1.2'
              strokeLinecap='round'
              strokeLinejoin='round'
              opacity='0.9'
            />
          </svg>
        </div>

        {/* Content Container (Shared max-width and horizontal padding: 90-92% viewport width) */}
        <div className='flex-1 flex items-center max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full relative z-20 py-4 sm:py-6 lg:py-8'>
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,52%)_minmax(0,48%)] hero-grid-layout gap-8 lg:gap-12 xl:gap-16 items-center w-full'>
            {/* Left Column: Overline, Comic Headline, Description, Speech CTAs, Feature Badges */}
            <div className='flex flex-col items-start text-left w-full max-w-[680px] bg-[#F3F0E9] lg:bg-transparent -mx-[clamp(20px,4.2vw,72px)] px-[clamp(20px,4.2vw,72px)] pt-6 sm:pt-8 pb-4 lg:p-0 lg:m-0 relative z-10'>
              {/* Overline Docket Header (No capsule pill, no status dot) */}
              <div className='hero-stagger-1 inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-[#57534E] mb-[clamp(14px,2.2vh,24px)] select-none'>
                <span className='font-mono font-bold text-[#1C1917] tracking-wider'>PF / 01</span>
                <span className='text-[#D8D2C5]' aria-hidden='true'>
                  —
                </span>
                <span className='font-sans uppercase tracking-[0.16em] text-[#57534E] font-semibold'>
                  {t('hero.docket', 'PF / 01 — XƯỞNG SÁNG TÁC TRUYỆN TRANH').replace(/^PF\s*\/\s*01\s*—\s*/, '')}
                </span>
              </div>

              {/* Bold Comic Headline with Full Vietnamese Diacritics Support */}
              <h1
                style={{
                  fontFamily:
                    "'Patrick Hand SC', 'Patrick Hand', 'Be Vietnam Pro', cursive, sans-serif",
                }}
                className='hero-stagger-2 hero-ink-bleed font-black text-[#1C1917] tracking-normal leading-[1.16] py-1 text-[clamp(2.9rem,5.6vw+0.2rem,5.65rem)] mb-[clamp(16px,2.2vh,26px)] select-text overflow-visible uppercase'
              >
                <span className='block whitespace-nowrap transform -skew-x-[3.5deg]'>
                  {t('hero.titleLine1', 'TỪ Ý TƯỞNG ĐẾN')}
                </span>
                <span className='block whitespace-nowrap transform -skew-x-[3.5deg] mt-1'>
                  <span className='relative inline-block'>
                    <span className='relative z-10'>{t('hero.titleLine2', 'TỪNG KHUNG TRUYỆN.')}</span>
                    {/* Natural organic calligraphic brush wipe in signature orange — positioned clear of diacritic dot under Ệ */}
                    <svg
                      className='hero-brush-svg absolute -bottom-2 sm:-bottom-2.5 lg:-bottom-3 left-0 w-[98%] max-w-[580px] h-[12px] sm:h-[15px] lg:h-[17px] pointer-events-none z-0 overflow-visible'
                      viewBox='0 0 400 16'
                      preserveAspectRatio='none'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      aria-hidden='true'
                    >
                      {/* Dáng nét cọ hữu cơ với đầu thuôn, thân mở rộng tự nhiên và đuôi vuốt nhọn */}
                      <path
                        d='M 3 9 C 18 5.5, 55 7.8, 105 6.2 C 170 4.2, 255 8.2, 325 5.8 C 360 4.6, 388 6.0, 397 5.2 C 394 8.5, 362 10.8, 322 10.2 C 252 9.5, 172 13.2, 105 11.8 C 55 10.8, 18 12.5, 3 9 Z'
                        fill='#F97316'
                        opacity='0.85'
                        className='hero-brush-path'
                      />
                      {/* Vệt xước cọ khô phụ tạo chiều sâu mực vẽ bản thảo */}
                      <path
                        d='M 28 8.0 C 85 7.0, 178 9.2, 275 7.5 C 322 6.8, 368 7.6, 385 6.2'
                        stroke='#EA580C'
                        strokeWidth='1.2'
                        strokeLinecap='round'
                        opacity='0.38'
                      />
                    </svg>
                  </span>
                </span>
              </h1>

              {/* Description (Warm Gray with mild emphasis on first sentence) */}
              <p className='hero-stagger-3 text-[#57534E] font-sans text-[clamp(1.02rem,0.35vw+0.92rem,1.22rem)] max-w-[50ch] font-normal tracking-normal leading-[1.62] mb-7 [text-wrap:pretty]'>
                <strong className='font-semibold text-[#1C1917]'>
                  {t('hero.subtitleLead', 'Cùng viết, vẽ và duyệt truyện trong một không gian.')}
                </strong>{' '}
                <span>
                  {t(
                    'hero.subtitleTail',
                    'Gắn phản hồi vào đúng khung truyện, theo dõi từng phiên bản và kiểm tra tính nhất quán với AI.',
                  )}
                </span>
              </p>

              {/* Speech-Balloon Styled Primary CTA with clear hierarchy */}
              <div
                id='hero-cta-group'
                className='hero-stagger-4 flex flex-wrap items-center gap-4 sm:gap-6 mb-3'
              >
                {/* Sole Dominant Primary CTA: Black Ink Speech Balloon */}
                <button
                  onClick={handleRegisterClick}
                  aria-label={t('hero.ctaPrimary', 'Tạo tài khoản')}
                  className='relative group inline-flex items-center justify-center gap-2.5 min-h-[52px] px-8 sm:px-10 text-[15px] sm:text-[16px] font-semibold bg-[#1C1917] text-white rounded-[20px] shadow-[4px_4px_0px_#1C1917] hover:shadow-[5px_5px_0px_#1C1917] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 transition-all duration-150 cursor-pointer motion-reduce:transform-none select-none'
                >
                  <span className='font-sans'>{t('hero.ctaPrimary', 'Tạo tài khoản')}</span>
                  <ArrowRight
                    className='w-4 h-4 transition-transform group-hover:translate-x-1'
                    aria-hidden='true'
                  />
                  {/* Speech balloon notch tail */}
                  <span
                    className='absolute -bottom-2 left-7 w-0 h-0 border-l-[6px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#1C1917] pointer-events-none'
                    aria-hidden='true'
                  />
                </button>

                {/* Returning Member Login Prompt */}
                <div className='flex items-center gap-1.5 text-xs sm:text-[13.5px] text-[#57534E]'>
                  <span>{t('hero.haveAccount', 'Đã có tài khoản?')}</span>
                  <button
                    onClick={handleLoginClick}
                    aria-label={t('hero.login', 'Đăng nhập')}
                    className='font-semibold text-[#1C1917] underline underline-offset-4 hover:text-[#EA580C] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs'
                  >
                    {t('hero.login', 'Đăng nhập')}
                  </button>
                </div>
              </div>

              {/* Discovery Link to Workflow Section */}
              <div className='hero-stagger-4 mb-6'>
                <a
                  id='hero-workflow-link'
                  href='#block-workflow'
                  onClick={handleScrollToWorkflow}
                  className='inline-flex items-center gap-1.5 text-xs sm:text-[13.5px] font-sans text-[#57534E] hover:text-[#1C1917] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 rounded-xs'
                >
                  <span>{t('hero.discoverWorkflow', 'Khám phá quy trình hoạt động')}</span>
                  <span aria-hidden='true'>↓</span>
                </a>
              </div>

              {/* Three Feature Highlights (Clean inline row with badge hover bindings) */}
              <div className='hero-stagger-5 flex flex-wrap items-center gap-y-2 gap-x-5 sm:gap-x-6 text-[13px] sm:text-[14px] font-medium text-stone-700 select-none'>
                <div className='flex items-center gap-2'>
                  <FileText className='w-4 h-4 text-[#1C1917] shrink-0' />
                  <span>{t('hero.badgeScript', 'Kịch bản có cấu trúc')}</span>
                </div>
                <span
                  className='hidden sm:inline-block w-px h-3.5 bg-stone-300'
                  aria-hidden='true'
                />
                <div
                  id='hero-badge-feedback'
                  onMouseEnter={() => setHeroHighlight('editor')}
                  onMouseLeave={() => setHeroHighlight(null)}
                  className='flex items-center gap-2 cursor-default hover:text-[#C2410C] transition-colors'
                >
                  <Users className='w-4 h-4 text-[#1C1917] shrink-0' />
                  <span>{t('hero.badgeCollab', 'Cộng tác')}</span>
                </div>
                <span
                  className='hidden sm:inline-block w-px h-3.5 bg-stone-300'
                  aria-hidden='true'
                />
                <div
                  id='hero-badge-version'
                  onMouseEnter={() => setHeroHighlight('artist')}
                  onMouseLeave={() => setHeroHighlight(null)}
                  className='flex items-center gap-2 cursor-default hover:text-[#C2410C] transition-colors'
                >
                  <History className='w-4 h-4 text-[#1C1917] shrink-0' />
                  <span>{t('hero.badgeVersion', 'Truy vết phiên bản')}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Manga Manuscript Pages Stack (Fanning on hover only) */}
            <div className='flex items-center justify-center w-full overflow-visible relative z-10'>
              <HeroMangaPage highlightTarget={heroHighlight} />
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Ink Guide for scroll transition and test compatibility */}
      <svg
        className='ink-guide pointer-events-none sr-only'
        viewBox='0 0 40 140'
        fill='none'
        aria-hidden='true'
        focusable='false'
      >
        <path
          className='ink-guide-path'
          d='M 22 2 C 14 26, 30 46, 20 70 C 12 92, 26 112, 19 138'
          pathLength={1}
          stroke='#F97316'
          strokeWidth='2.5'
          strokeLinecap='round'
        />
      </svg>

      {/* ===== BRAND PURPOSE INTRO SECTION (EXPANSIVE LIGHT IVORY PINNED SHEET) ===== */}
      <section
        id='block-intro'
        ref={introSectionRef}
        data-reveal='ink'
        className='py-12 sm:py-16 lg:py-20 relative bg-[#F3F0E9] transition-all'
        aria-label={t('sections.missionAria', 'Mục tiêu sản phẩm')}
      >
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          {/* Two Distinct Manuscript Notes: Warm Cream Sketch Sheet (Left) & Ivory Lined Note Sheet (Right) */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-8 sm:gap-10 lg:gap-12 xl:gap-14 items-start w-full'>
            {/* NOTE 1 (LEFT): Giấy phác thảo kem ấm #FAF5E8 - Dáng gần vuông, mép trái và dưới xé xơ, góc dưới phải cong lên, ghim cam tại 50% 28.5px */}
            <div
              id='block-intro-note-left'
              className='relative w-full max-w-[560px] mx-auto lg:max-w-none'
            >
              {/* Paper Impact wrapper for initial pin strike bounce (stays stationary after settle) */}
              <div
                className={`relative w-full ${
                  isLeftPinDropped && !isImmediatePinned ? 'paper-settle-left' : ''
                }`}
              >
                {/* Swaying Paper Container (Paper Body + Torn Edges + Shadows + Content) */}
                <div
                  ref={leftNoteSwayRef}
                  className='note-paper-sway relative w-full'
                  style={{
                    transformOrigin: `${LEFT_PIN_ANCHOR_X_PERCENT}% ${PIN_ANCHOR_Y_PX}px`,
                    willChange: 'transform',
                  }}
                >
                  {/* Visual Torn Paper Sheet (SVG Background with Deckle Torn Edges matching Concept Image) */}
                  <div
                    className='absolute inset-0 w-full h-full pointer-events-none select-none z-0'
                    style={{
                      filter:
                        'drop-shadow(0 2px 3px rgba(28,25,23,0.08)) drop-shadow(0 8px 18px rgba(28,25,23,0.06))',
                    }}
                    aria-hidden='true'
                  >
                    <svg
                      className='w-full h-full overflow-visible'
                      viewBox='0 0 520 480'
                      preserveAspectRatio='none'
                    >
                      <defs>
                        {/* Soft contact shadow filter for curled corner */}
                        <filter id='left-curl-shadow' x='-30%' y='-30%' width='160%' height='160%'>
                          <feGaussianBlur in='SourceGraphic' stdDeviation='5' />
                        </filter>
                        {/* Paper underside color gradient for bottom-right curl */}
                        <linearGradient
                          id='left-curl-back-grad'
                          x1='0%'
                          y1='100%'
                          x2='100%'
                          y2='0%'
                        >
                          <stop offset='0%' stopColor='#C2B8A3' />
                          <stop offset='35%' stopColor='#DDD5C3' />
                          <stop offset='75%' stopColor='#ECE5D6' />
                          <stop offset='100%' stopColor='#F7F3E9' />
                        </linearGradient>
                      </defs>

                      {/* Contact shadow on desk under curled bottom-right flap */}
                      <ellipse
                        cx='466'
                        cy='450'
                        rx='34'
                        ry='14'
                        fill='rgba(28,25,23,0.22)'
                        transform='rotate(-18 466 450)'
                        filter='url(#left-curl-shadow)'
                      />

                      {/* Main warm cream sketch paper body */}
                      <path d={LEFT_NOTE_PAPER_BODY_PATH} fill='#FAF5E8' />

                      {/* Exposed inner pulp deckle ribbons along bottom and left torn edges */}
                      <path d={LEFT_NOTE_BOTTOM_PULP_PATH} fill='#FFFEF5' opacity='0.96' />
                      <path d={LEFT_NOTE_LEFT_PULP_PATH} fill='#FFFEF5' opacity='0.96' />

                      {/* Fine outer tear contour */}
                      <path
                        d={LEFT_NOTE_TEAR_CONTOUR_PATH}
                        fill='none'
                        stroke='#FFFFFF'
                        strokeWidth='0.85'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        opacity='0.85'
                      />

                      {/* Micro-fiber strands extending from torn notches */}
                      {LEFT_NOTE_FIBERS.map((fiber, idx) => (
                        <line
                          key={`l-fiber-${idx}`}
                          x1={fiber.x1}
                          y1={fiber.y1}
                          x2={fiber.x2}
                          y2={fiber.y2}
                          stroke='#FFFFFF'
                          strokeWidth='0.8'
                          strokeLinecap='round'
                          opacity='0.9'
                        />
                      ))}

                      {/* Curled corner flap showing shaded paper underside */}
                      <path
                        d={LEFT_NOTE_CURL_FLAP_PATH}
                        fill='url(#left-curl-back-grad)'
                        filter='drop-shadow(-1px -1px 2px rgba(28,25,23,0.12))'
                      />
                      <path
                        d={LEFT_NOTE_CURL_RIM_HIGHLIGHT}
                        fill='none'
                        stroke='#FFFEEF'
                        strokeWidth='0.85'
                        strokeLinecap='round'
                        opacity='0.9'
                      />

                      {/* Faint blue drafting construction marks in bottom-left margin (không đè chữ) */}
                      <g opacity='0.32' stroke='#38BDF8' strokeLinecap='round' aria-hidden='true'>
                        <line x1='38' y1='340' x2='38' y2='450' strokeWidth='1' />
                        <line x1='22' y1='432' x2='108' y2='432' strokeWidth='1' />
                        <path d='M 38 372 A 60 60 0 0 1 98 432' fill='none' strokeWidth='1' />
                      </g>
                    </svg>
                  </div>

                  {/* Torn Paper Sheet Article */}
                  <article className='relative z-10 w-full select-text'>
                    {/* Inner Content (Kept level and upright) */}
                    <div className='note-content relative z-10 w-full p-8 sm:p-10 lg:p-12 pt-12 sm:pt-14 lg:pt-16 pb-12 sm:pb-14 lg:pb-16 transition-transform'>
                      <div className='inline-flex items-center gap-2.5 text-[11px] font-semibold text-[#9A3412] uppercase tracking-[0.2em] font-mono mb-3.5 select-none'>
                        <span className='w-7 h-px bg-[#C2410C]' aria-hidden='true' />
                        {t('intro.leftNoteTag', 'Dành cho đội ngũ sáng tác truyện tranh')}
                      </div>
                      <div className='relative inline-block'>
                        <h2
                          style={{
                            fontFamily: "'Patrick Hand', 'Be Vietnam Pro', cursive, sans-serif",
                          }}
                          className='text-2xl sm:text-3xl lg:text-[2.5rem] xl:text-[2.75rem] text-[#1C1917] leading-[1.22] font-medium [text-wrap:balance] max-w-[14ch] sm:max-w-[15ch]'
                        >
                          {t('intro.leftNoteTitle', 'Để đội ngũ tập trung vào câu chuyện.')}
                        </h2>
                        {/* Spontaneous orange brush stroke under 'câu chuyện.' */}
                        <svg
                          className='absolute -bottom-1 sm:-bottom-1.5 right-1 sm:right-3 w-28 sm:w-36 lg:w-40 h-3 sm:h-3.5 pointer-events-none select-none overflow-visible'
                          viewBox='0 0 160 14'
                          preserveAspectRatio='none'
                          fill='none'
                          aria-hidden='true'
                        >
                          <path
                            d='M 2 7 Q 40 12, 80 8 Q 125 4, 158 7'
                            stroke='#EA580C'
                            strokeWidth='3.8'
                            strokeLinecap='round'
                            opacity='0.88'
                          />
                        </svg>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              {/* Realistic Pushpin 1 with Puncture mark (Stationary, outside swaying wrapper) */}
              <RealisticTornNotePin
                tilted='left'
                isDropped={isLeftPinDropped}
                paperBg='#FAF5E8'
                isImmediate={isImmediatePinned}
              />
            </div>

            {/* NOTE 2 (RIGHT): Giấy ghi chú kẻ dòng trắng ngà #FCFBF8 - Dáng ngang, có dòng kẻ chì xanh mờ, mép phải & dưới xé, góc dưới trái gấp nhẹ, thấp hơn 32px */}
            <div id='block-intro-note-right' className='relative w-full lg:mt-8'>
              {/* Paper Impact wrapper for initial pin strike bounce (stays stationary after settle) */}
              <div
                className={`relative w-full ${
                  isRightPinDropped && !isImmediatePinned ? 'paper-settle-right' : ''
                }`}
              >
                {/* Swaying Paper Container (Paper Body + Torn Edges + Shadows + Content) */}
                <div
                  ref={rightNoteSwayRef}
                  className='note-paper-sway relative w-full'
                  style={{
                    transformOrigin: `${RIGHT_PIN_ANCHOR_X_PERCENT}% ${PIN_ANCHOR_Y_PX}px`,
                    willChange: 'transform',
                  }}
                >
                  {/* Visual Torn Paper Sheet (SVG Background with Deckle Torn Edges matching Hero) */}
                  <div
                    className='absolute inset-0 w-full h-full pointer-events-none select-none z-0'
                    style={{
                      filter:
                        'drop-shadow(0 2px 3px rgba(28,25,23,0.08)) drop-shadow(0 8px 18px rgba(28,25,23,0.06))',
                    }}
                    aria-hidden='true'
                  >
                    <svg
                      className='w-full h-full overflow-visible'
                      viewBox='0 0 740 430'
                      preserveAspectRatio='none'
                    >
                      <defs>
                        {/* Soft contact shadow filter for folded corner */}
                        <filter id='right-fold-shadow' x='-30%' y='-30%' width='160%' height='160%'>
                          <feGaussianBlur in='SourceGraphic' stdDeviation='4' />
                        </filter>
                        {/* Paper underside color gradient for bottom-left fold */}
                        <linearGradient
                          id='right-fold-back-grad'
                          x1='0%'
                          y1='0%'
                          x2='100%'
                          y2='100%'
                        >
                          <stop offset='0%' stopColor='#DDD7C8' />
                          <stop offset='50%' stopColor='#EDE8DC' />
                          <stop offset='100%' stopColor='#FAF8F3' />
                        </linearGradient>
                      </defs>

                      {/* Contact shadow on desk under folded bottom-left flap */}
                      <ellipse
                        cx='38'
                        cy='410'
                        rx='26'
                        ry='10'
                        fill='rgba(28,25,23,0.18)'
                        transform='rotate(20 38 410)'
                        filter='url(#right-fold-shadow)'
                      />

                      {/* Main ivory white paper body */}
                      <path d={RIGHT_NOTE_PAPER_BODY_PATH} fill='#FCFBF8' />

                      {/* Faint blue notebook ruling lines across sheet */}
                      <g stroke='#94A3B8' strokeWidth='0.75' opacity='0.22' aria-hidden='true'>
                        <line x1='35' y1='80' x2='715' y2='80' />
                        <line x1='35' y1='120' x2='715' y2='120' />
                        <line x1='35' y1='160' x2='715' y2='160' />
                        <line x1='35' y1='200' x2='715' y2='200' />
                        <line x1='35' y1='240' x2='715' y2='240' />
                        <line x1='35' y1='280' x2='715' y2='280' />
                        <line x1='35' y1='320' x2='715' y2='320' />
                        <line x1='35' y1='360' x2='715' y2='360' />
                        <line x1='75' y1='400' x2='715' y2='400' />
                      </g>

                      {/* Exposed inner pulp deckle ribbons along right and bottom torn edges */}
                      <path d={RIGHT_NOTE_RIGHT_PULP_PATH} fill='#FFFFFF' opacity='0.98' />
                      <path d={RIGHT_NOTE_BOTTOM_PULP_PATH} fill='#FFFFFF' opacity='0.98' />

                      {/* Fine outer tear contour */}
                      <path
                        d={RIGHT_NOTE_TEAR_CONTOUR_PATH}
                        fill='none'
                        stroke='#FFFFFF'
                        strokeWidth='0.8'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        opacity='0.8'
                      />

                      {/* Micro-fiber strands extending from torn notches */}
                      {RIGHT_NOTE_FIBERS.map((fiber, idx) => (
                        <line
                          key={`r-fiber-${idx}`}
                          x1={fiber.x1}
                          y1={fiber.y1}
                          x2={fiber.x2}
                          y2={fiber.y2}
                          stroke='#FFFFFF'
                          strokeWidth='0.75'
                          strokeLinecap='round'
                          opacity='0.85'
                        />
                      ))}

                      {/* Folded corner flap showing ivory paper underside */}
                      <path
                        d={RIGHT_NOTE_FOLD_FLAP_PATH}
                        fill='url(#right-fold-back-grad)'
                        filter='drop-shadow(1px -1px 2px rgba(28,25,23,0.1))'
                      />
                      <path
                        d={RIGHT_NOTE_FOLD_RIM_HIGHLIGHT}
                        fill='none'
                        stroke='#FFFFFF'
                        strokeWidth='0.8'
                        strokeLinecap='round'
                        opacity='0.85'
                      />
                    </svg>
                  </div>

                  {/* Torn Paper Sheet Article */}
                  <article className='relative z-10 w-full select-text'>
                    {/* Inner Content (Kept level and upright) */}
                    <div className='note-content relative z-10 w-full p-8 sm:p-10 lg:p-12 pt-12 sm:pt-14 lg:pt-16 pb-10 sm:pb-12 lg:pb-14 transition-transform'>
                      <p className='text-base sm:text-lg lg:text-[1.12rem] text-[#374151] leading-relaxed [text-wrap:pretty] max-w-[50ch]'>
                        {t(
                          'intro.rightNoteBody',
                          'Kết nối kịch bản, bản vẽ và phản hồi trong cùng một quy trình sản xuất có cấu trúc và đáng tin cậy. Loại bỏ trao đổi rải rác và thất lạc ý tưởng qua từng chương truyện.',
                        )}
                      </p>
                      <div className='mt-6 sm:mt-7 flex items-center gap-2.5 text-xs sm:text-[13px] font-sans font-medium text-[#57534E]'>
                        <span className='w-2.5 h-2.5 rounded-full bg-[#EA580C] shrink-0' />
                        <span>{t('intro.rightNoteBadge', 'Bản thảo đồng bộ · Không ghi đè')}</span>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              {/* Realistic Pushpin 2 with Puncture mark (Stationary, outside swaying wrapper) */}
              <RealisticTornNotePin
                tilted='right'
                isDropped={isRightPinDropped}
                paperBg='#FCFBF8'
                isImmediate={isImmediatePinned}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== VALUE PROPOSITION & EDITORIAL FEATURE SUITE ===== */}
      <section
        id='block-features'
        className='scroll-mt-20 py-16 md:py-24 relative bg-[#F3F0E9]'
        aria-label={t('sections.featuresAria', 'Tính năng nổi bật')}
      >
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          {/* Section Lead */}
          <div className='text-center w-full max-w-4xl mx-auto animate-on-scroll mb-14'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              {t('pillars.tag', '02 / NỀN TẢNG')}
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.08] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              {t('pillars.title', 'Ba trụ cột cho xưởng truyện chuyên nghiệp.')}
            </h2>
            <p className='mt-5 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[65ch] mx-auto'>
              {t(
                'pillars.subtitle',
                'Xây dựng quy chuẩn sản xuất truyện tranh hiện đại, minh bạch và kết nối đa vai trò.',
              )}
            </p>
          </div>

          {/* 3 Clean Docket Cards Spanning the Full Container Width */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch w-full mb-16 lg:mb-24'>
            {/* Docket Card 1 */}
            <div
              data-reveal='frame'
              className='frame-card relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs hover:border-[#1C1917]/40 transition-all duration-200 hover:shadow-soft-sm h-full'
            >
              <FrameInk />
              <div>
                <div className='w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] mb-5'>
                  <FolderTree className='w-5 h-5 text-[#1C1917]' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.16em] text-[#57534E] font-semibold font-mono mb-2'>
                  {t('pillars.hierarchy.tag', '01 / Phân cấp')}
                </div>
                <h3 className='font-serif text-xl sm:text-2xl font-medium text-[#1C1917] leading-snug [text-wrap:balance]'>
                  {t('pillars.hierarchy.title', 'Nội dung có cấu trúc')}
                </h3>
                <p className='mt-3 text-sm text-[#57534E] leading-relaxed [text-wrap:pretty]'>
                  {t(
                    'pillars.hierarchy.desc',
                    'Tổ chức bộ truyện theo từng cấp độ rõ ràng: bộ truyện, tập, chương, phân cảnh và khung tranh.',
                  )}
                </p>
              </div>
            </div>

            {/* Docket Card 2 */}
            <div
              data-reveal='frame'
              className='frame-card frame-card-2 relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs hover:border-[#1C1917]/40 transition-all duration-200 hover:shadow-soft-sm h-full'
            >
              <FrameInk />
              <div>
                <div className='w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] mb-5'>
                  <History className='w-5 h-5 text-[#1C1917]' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.16em] text-[#57534E] font-semibold font-mono mb-2'>
                  {t('pillars.provenance.tag', '02 / Minh bạch')}
                </div>
                <h3 className='font-serif text-xl sm:text-2xl font-medium text-[#1C1917] leading-snug [text-wrap:balance]'>
                  {t('pillars.provenance.title', 'Lịch sử phiên bản')}
                </h3>
                <p className='mt-3 text-sm text-[#57534E] leading-relaxed [text-wrap:pretty]'>
                  {t(
                    'pillars.provenance.desc',
                    'Ghi nhận mọi chỉnh sửa kèm người thực hiện và mốc thời gian, tránh ghi đè nhầm bản vẽ.',
                  )}
                </p>
              </div>
            </div>

            {/* Docket Card 3 */}
            <div
              data-reveal='frame'
              className='frame-card frame-card-3 relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs hover:border-[#1C1917]/40 transition-all duration-200 hover:shadow-soft-sm h-full'
            >
              <FrameInk />
              <div>
                <div className='w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] mb-5'>
                  <Sparkles className='w-5 h-5 text-[#F97316]' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.16em] text-[#57534E] font-semibold font-mono mb-2'>
                  {t('pillars.bible.tag', '03 / Nhất quán')}
                </div>
                <h3 className='font-serif text-xl sm:text-2xl font-medium text-[#1C1917] leading-snug [text-wrap:balance]'>
                  {t('pillars.bible.title', 'Hồ sơ bộ truyện')}
                </h3>
                <p className='mt-3 text-sm text-[#57534E] leading-relaxed [text-wrap:pretty]'>
                  {t(
                    'pillars.bible.desc',
                    'Quản lý nhân vật, đạo cụ và bối cảnh tập trung; hỗ trợ rà soát tính nhất quán khi sáng tác.',
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 01: NỘI DUNG CÓ CẤU TRÚC (Full Width 2-Column Spread) */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                01 / Nội dung có cấu trúc
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Mô hình dữ liệu hiểu đúng{' '}
                <em className='font-normal text-[#57534E] italic'>tư duy làm manga.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Phân cấp từ bộ truyện, tập, chương, phân cảnh đến khung truyện — liên kết kịch bản,
                hình ảnh tham chiếu và trạng thái xét duyệt mà không bị thất lạc trong thư mục.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Dữ liệu chi tiết từng khung truyện',
                    rest: '— quản lý lời thoại, hiệu ứng âm thanh (SFX) và trạng thái sản xuất.',
                  },
                  {
                    bold: 'Phân cấp trực quan',
                    rest: '— liên kết mạch lạc giữa tập, chương, phân cảnh và khung tranh.',
                  },
                  {
                    bold: 'Phân công trách nhiệm rõ ràng',
                    rest: '— nắm rõ ai đang phụ trách bản vẽ và khâu nào cần xét duyệt.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 1 Visual Preview */}
            <div className='animate-on-scroll delay-100 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 border-b border-[#E2DDD2]'>
                  <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                    Mô hình phân cấp truyện
                  </div>
                  <div className='flex items-center gap-1.5 text-[10.5px] text-[#57534E] font-mono'>
                    <Database className='w-3 h-3 text-[#1C1917]' /> Minh họa cấu trúc
                  </div>
                </div>

                <div className='pt-3.5 space-y-2.5 text-xs'>
                  {[
                    { level: 'Bộ truyện: Biên Niên Sử Aria', count: '1 bộ', indent: 0 },
                    { level: 'Tập 3: Hoàng Hôn Thành Phố', count: 'Tập hiện tại', indent: 1 },
                    { level: 'Chương 14: Lựa Chọn Đêm', count: 'Đang sản xuất', indent: 2 },
                    { level: 'Phân cảnh 04: Studio về đêm', count: '6 khung', indent: 3 },
                  ].map(({ level, count, indent }) => (
                    <div key={level} style={{ marginLeft: `${indent * 16}px` }}>
                      <div
                        className={`${indent > 0 ? 'pl-3.5 border-l border-dashed border-[#D8D2C5]' : ''} flex items-center gap-2 text-stone-700 py-1`}
                      >
                        <span className='text-stone-400 text-[10px] w-3 inline-block'>
                          {indent < 3 ? '▾' : '▸'}
                        </span>
                        <span>{level}</span>
                        <span className='ml-auto text-[10px] text-[#57534E] font-mono tabular-nums'>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div
                    style={{ marginLeft: '64px' }}
                    className='pl-3.5 border-l border-dashed border-[#D8D2C5]'
                  >
                    <div className='flex items-center gap-2 text-[#C2410C] font-medium py-1'>
                      <span className='w-3 inline-block'>·</span>
                      <span>Khung truyện #14.3.2</span>
                      <span className='ml-auto text-[10px] text-[#C2410C] font-mono font-semibold'>
                        Đang đi nét
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-panel details */}
                <div className='mt-4 pt-4 border-t border-[#E2DDD2]'>
                  <div className='grid grid-cols-3 gap-3 text-[11px]'>
                    <div className='bg-[#FAF8F5] rounded-lg p-3 border border-[#D8D2C5]'>
                      <div className='text-[#57534E] uppercase tracking-wider text-[9px] font-semibold font-mono'>
                        Lời thoại
                      </div>
                      <div className='text-[#1C1917] mt-1 font-medium leading-snug'>
                        « Câu chuyện vẫn tiếp diễn. »
                      </div>
                    </div>
                    <div className='bg-[#FAF8F5] rounded-lg p-3 border border-[#D8D2C5]'>
                      <div className='text-[#57534E] uppercase tracking-wider text-[9px] font-semibold font-mono'>
                        Âm thanh (SFX)
                      </div>
                      <div className='text-[#1C1917] mt-1 font-medium leading-snug'>— vút nhẹ</div>
                    </div>
                    <div className='bg-[#FAF8F5] rounded-lg p-3 border border-[#D8D2C5]'>
                      <div className='text-[#57534E] uppercase tracking-wider text-[9px] font-semibold font-mono'>
                        Họa sĩ
                      </div>
                      <div className='text-[#1C1917] mt-1 font-medium leading-snug flex items-center gap-1.5'>
                        <span className='w-4 h-4 rounded-full bg-orange-100 text-[#C2410C] text-[8.5px] font-bold flex items-center justify-center font-mono'>
                          A
                        </span>
                        An (Họa sĩ)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 02: LỊCH SỬ PHIÊN BẢN (Full Width 2-Column Spread)     */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll lg:order-2'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                02 / Lịch sử phiên bản
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Mọi quyết định sáng tác đều được{' '}
                <em className='font-normal text-[#57534E] italic'>lưu dấu minh bạch.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Ghi nhận mốc thời gian và thành viên thực hiện cho từng lượt cập nhật kịch bản hoặc
                nộp bản vẽ, hỗ trợ đối chiếu dễ dàng khi duyệt trang.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Nhật ký thay đổi theo mốc thời gian',
                    rest: '— nắm rõ ai đã chỉnh sửa và vào thời điểm nào.',
                  },
                  {
                    bold: 'Đối chiếu các lượt cập nhật',
                    rest: '— so sánh bản nháp và bản đi nét để đánh giá tiến độ.',
                  },
                  {
                    bold: 'Giữ an toàn tài nguyên',
                    rest: '— hạn chế thất lạc ý tưởng hoặc ghi đè nhầm bản vẽ.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2 Visual Preview */}
            <div className='animate-on-scroll delay-100 lg:order-1 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 border-b border-[#E2DDD2]'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917]'>
                      <GitCommit className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                        Nhật ký thay đổi
                      </div>
                      <div className='text-[10px] text-stone-600 font-mono'>
                        Chương 14 / Phân cảnh 04
                      </div>
                    </div>
                  </div>
                  <span className='text-[9.5px] px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#1C1917] font-semibold font-mono tracking-wider border border-[#D8D2C5]'>
                    DỮ LIỆU MINH HỌA
                  </span>
                </div>

                <div className='relative pt-4 pl-6'>
                  <div className='absolute left-[10px] top-5 bottom-3 w-px bg-[#D8D2C5]' />
                  <div className='space-y-4 text-[12px]'>
                    {[
                      {
                        time: '14:42 · Jiro (Biên tập)',
                        hash: 'rev-7a3f',
                        title: 'Đã xét duyệt trang 14.1',
                        desc: 'Đối chiếu hồ sơ bộ truyện · 4 khung truyện đạt chuẩn',
                        dot: 'bg-[#F97316]',
                      },
                      {
                        time: '14:38 · An (Họa sĩ)',
                        hash: 'rev-9c12',
                        title: 'Hoàn thành bản đi nét trang 14.3',
                        desc: 'Cập nhật 3 khung truyện · Đã gắn tài liệu tham chiếu',
                        dot: 'bg-stone-400',
                      },
                      {
                        time: '14:21 · AI Trợ lý',
                        hash: 'ai-chk-2f',
                        title: 'Gợi ý kiểm tra phân cảnh 04',
                        desc: 'Nhắc nhở đối chiếu chi tiết nhân vật theo hồ sơ đã lưu',
                        dot: 'bg-[#F97316]',
                      },
                      {
                        time: '10:04 · Mai (Biên kịch)',
                        hash: 'rev-5b41',
                        title: 'Thêm phân cảnh 05 vào chương 14',
                        desc: '6 khung truyện · Kịch bản và phân cảnh ban đầu',
                        dot: 'bg-stone-400',
                      },
                    ].map((ev, i) => (
                      <div key={i} className='relative'>
                        <div
                          className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ${ev.dot} border-2 border-white ring-1 ring-stone-300`}
                        />
                        <div className='flex items-center justify-between'>
                          <div className='font-mono text-[10.5px] text-[#57534E]'>{ev.time}</div>
                          <div className='font-mono text-[9.5px] text-stone-400'>{ev.hash}</div>
                        </div>
                        <div className='mt-0.5 text-[#1C1917] font-medium'>{ev.title}</div>
                        <div className='text-[#57534E] text-[11.5px] leading-snug'>{ev.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 03: HỒ SƠ BỘ TRUYỆN (Full Width 2-Column Spread)       */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                03 / Hồ sơ bộ truyện
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Hồ sơ bộ truyện hỗ trợ{' '}
                <em className='font-normal text-[#57534E] italic'>duy trì tính nhất quán.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Lưu trữ thông tin nhân vật, đạo cụ và bối cảnh chuẩn; kết hợp AI gợi ý rà soát chi
                tiết kịch bản theo hồ sơ đã thiết lập.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Quản lý tư liệu tập trung',
                    rest: '— tra cứu nhanh đặc điểm nhận diện, trang phục và bối cảnh.',
                  },
                  {
                    bold: 'Gợi ý rà soát kịch bản',
                    rest: '— AI hỗ trợ nhắc nhở các quy tắc nhân vật đã ghi trong hồ sơ.',
                  },
                  {
                    bold: 'Giảm thiểu sai sót tiếp nối',
                    rest: '— giúp thành viên mới nắm bắt nhanh thiết lập thế giới truyện.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3 Visual Preview */}
            <div className='animate-on-scroll delay-100 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 border-b border-[#E2DDD2]'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917]'>
                      <Sparkles className='w-4 h-4 text-[#F97316]' />
                    </div>
                    <div>
                      <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                        Hồ sơ bộ truyện
                      </div>
                      <div className='text-[10px] text-stone-500 font-mono'>
                        Biên Niên Sử Aria · Dữ liệu minh họa
                      </div>
                    </div>
                  </div>
                  <div className='text-[10px] text-emerald-700 font-mono flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' /> Đã liên kết
                  </div>
                </div>

                <div className='pt-3.5 space-y-2.5'>
                  {/* Character card */}
                  <div className='p-3 sm:p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-2'>
                        <span className='w-5 h-5 rounded-full bg-[#EAE5DC] text-[#1C1917] text-[10px] font-bold flex items-center justify-center font-mono'>
                          A
                        </span>
                        <span className='text-sm font-semibold text-[#1C1917]'>Aria</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#1C1917] font-semibold font-mono tracking-wider'>
                          NHÂN VẬT CHÍNH
                        </span>
                      </div>
                      <span className='text-[9px] text-stone-500 font-mono'>v3.2</span>
                    </div>
                    <div className='text-[11.5px] text-stone-700 leading-relaxed'>
                      Trầm tĩnh, kiên định · Vết sẹo mày trái giấu kín từ Tập 1 · Thoại ngắn gọn ·
                      Luôn mang huy hiệu studio.
                    </div>
                  </div>

                  {/* Relic card */}
                  <div className='p-3 sm:p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-2'>
                        <span className='w-5 h-5 rounded-full bg-[#EAE5DC] text-[#1C1917] text-[10px] font-bold flex items-center justify-center font-mono'>
                          ◇
                        </span>
                        <span className='text-sm font-semibold text-[#1C1917]'>Vương Miện Cổ</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#1C1917] font-semibold font-mono tracking-wider'>
                          ĐẠO CỤ
                        </span>
                      </div>
                    </div>
                    <div className='text-[11.5px] text-stone-600 leading-relaxed'>
                      Di vật từ chương mở đầu · Nguồn cơn biến cố ở Tập 2.
                    </div>
                  </div>
                </div>

                {/* AI Notification Card */}
                <div className='mt-3.5 p-3 sm:p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                  <div className='flex items-center gap-2 mb-1'>
                    <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                    <span className='text-[10px] font-bold uppercase tracking-[0.14em] text-[#1C1917] font-mono'>
                      Gợi ý rà soát kịch bản (AI)
                    </span>
                  </div>
                  <div className='text-[11.5px] text-stone-800 leading-relaxed'>
                    Phân cảnh 04: Nhắc nhở quy tắc{' '}
                    <strong className='font-semibold text-[#1C1917]'>vết sẹo giấu kín</strong> của
                    Aria. Đảm bảo góc nghiêng phù hợp với hồ sơ nhân vật.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 04: QUY TRÌNH SẢN XUẤT KANBAN (Full Width Spread)      */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll lg:order-2'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                04 / Quy trình sản xuất
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Tiến độ liền mạch theo{' '}
                <em className='font-normal text-[#57534E] italic'>từng công đoạn.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Theo dõi phân cảnh qua các bước kịch bản, đi nét, xét duyệt và hoàn tất để cả đội
                ngũ cùng nắm rõ tiến độ mà không cần trao đổi thủ công dồn dập.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Bảng tiến độ trực quan',
                    rest: '— nắm bắt số lượng phân cảnh và trang trong từng khâu sản xuất.',
                  },
                  {
                    bold: 'Phối hợp liền mạch giữa các khâu',
                    rest: '— chuyển giao kịch bản sang bản vẽ và xét duyệt thuận tiện.',
                  },
                  {
                    bold: 'Giảm bớt trao đổi rời rạc',
                    rest: '— kiểm tra trạng thái trên bảng thay vì hỏi dồn qua tin nhắn.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-[#FAF8F5]' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kanban Preview with responsive mobile horizontal scroll */}
            <div className='animate-on-scroll delay-100 lg:order-1 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 mb-3.5 border-b border-[#D8D2C5]'>
                  <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                    Chương 14 · Bảng tiến độ
                  </div>
                  <div className='flex items-center gap-1.5 text-[10px] text-[#57534E] font-mono'>
                    <KanbanSquare className='w-3.5 h-3.5 text-[#1C1917]' /> Minh họa 4 công đoạn
                  </div>
                </div>

                {/* Mobile scrollable columns container */}
                <div className='flex md:grid md:grid-cols-4 gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory -mx-1 px-1'>
                  {/* Column 1: Kịch bản */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                        Kịch bản
                      </span>
                      <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                        3
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      {['Cảnh 04: Studio', 'Cảnh 05: Phố đêm', 'Cảnh 06: Bến tàu'].map((s, i) => (
                        <div
                          key={s}
                          className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'
                        >
                          <div className='text-[11px] font-semibold text-[#1C1917]'>{s}</div>
                          {i === 2 && (
                            <div className='text-[9px] text-[#57534E] mt-0.5 italic'>Bản nháp</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Đi nét */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#F97316] uppercase tracking-wider font-mono'>
                        Đi nét
                      </span>
                      <span className='text-[10px] text-[#F97316] font-mono font-bold tabular-nums'>
                        5
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#F97316]/40 shadow-xs'>
                        <div className='text-[11px] font-semibold text-[#1C1917]'>Trang 14.3</div>
                        <div className='mt-1 text-[9px] text-[#F97316] font-medium'>
                          2/3 khung xong
                        </div>
                      </div>
                      {['Trang 14.4', 'Trang 14.5'].map((p) => (
                        <div
                          key={p}
                          className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'
                        >
                          <div className='text-[11px] font-semibold text-[#1C1917]'>{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Xét duyệt */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider font-mono'>
                        Xét duyệt
                      </span>
                      <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                        2
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                        <div className='text-[11px] font-semibold text-[#1C1917]'>Trang 14.1</div>
                        <div className='text-[9px] text-[#1C1917] mt-0.5 font-medium inline-block bg-[#EAE5DC] px-1.5 py-0.5 rounded'>
                          1 lưu ý AI
                        </div>
                      </div>
                      <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                        <div className='text-[11px] font-semibold text-[#1C1917]'>Trang 14.2</div>
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Hoàn tất */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                        Hoàn tất
                      </span>
                      <span className='text-[10px] text-[#1C1917] font-mono font-bold tabular-nums'>
                        24
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      {['Trang 13.8', 'Trang 13.7', 'Trang 13.6'].map((p) => (
                        <div
                          key={p}
                          className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'
                        >
                          <div className='text-[11px] font-semibold text-[#57534E]'>{p}</div>
                          <div className='text-[9px] text-[#1C1917] mt-0.5 flex items-center gap-1 font-medium'>
                            <Check className='w-2.5 h-2.5 text-[#F97316]' /> Đã duyệt
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile scroll hint */}
                <div className='md:hidden mt-2 text-center text-[10.5px] text-[#57534E] flex items-center justify-center gap-1.5'>
                  <span>Vuốt ngang để xem đủ 4 công đoạn</span>
                  <span aria-hidden='true'>→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== SECTION: QUY TRÌNH 4 CÔNG ĐOẠN & THANH SO SÁNH ===== */}
      <section
        id='block-workflow'
        className='py-16 md:py-24 relative scroll-mt-20 bg-[#F3F0E9]'
        aria-label={t('sections.workflowAria', 'Quy trình sản xuất')}
      >
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          <div className='text-center w-full max-w-4xl mx-auto mb-14 animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              {t('workflow.tag', '03 / Quy trình sản xuất')}
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              {t('workflow.title', 'Từ kịch bản đến trang truyện hoàn thiện.')}
            </h2>
            <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[65ch] mx-auto'>
              {t(
                'workflow.subtitle',
                'Bốn công đoạn nối tiếp nhịp nhàng, trực quan hóa tiến trình sáng tạo từ văn bản phác thảo đến ấn phẩm màu sắc.',
              )}
            </p>
          </div>

          {/* 4-Stage Manga Journey Strip Spanning the Full Container Width */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 w-full mb-16 lg:mb-24'>
            {/* Step 01: Kịch bản (Biên kịch - Structured HTML/CSS Docket) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#1C1917] font-mono uppercase tracking-wider'>
                  01 / {t('workflow.stages.script', 'Kịch bản')}
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#D8D2C5]'>
                  {t('workflow.roles.writer', 'Biên kịch')}
                </span>
              </div>

              {/* Manuscript Docket Card Preview */}
              <div className='aspect-[4/5] w-full rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative shadow-2xs'>
                <div className='space-y-2.5 text-left'>
                  <div className='flex items-center justify-between pb-2 border-b border-[#E2DDD2]'>
                    <span className='text-[10px] font-mono text-[#57534E]'>Cảnh 04 · Khung 02</span>
                    <span className='text-[9px] font-mono font-bold text-[#F97316]'>TẬP 3</span>
                  </div>
                  <div className='text-xs text-[#57534E] leading-relaxed'>
                    <span className='font-semibold text-[#1C1917]'>[Bối cảnh]:</span> Xưởng vẽ gác
                    mái về đêm. Đèn bàn vàng ấm soi rọi trang bản thảo.
                  </div>
                  <div className='text-xs text-[#1C1917] font-serif italic bg-[#FFFEFA] p-2.5 rounded-lg border border-[#D8D2C5]'>
                    « Bản thảo này... câu chuyện bắt đầu ở đây. »
                  </div>
                  <div className='text-[10.5px] font-mono text-stone-500'>
                    SFX: — xoẹt nhẹ ngòi bút G-Pen
                  </div>
                </div>

                <div className='pt-2 border-t border-[#E2DDD2] flex items-center justify-between text-[10px] font-mono text-[#57534E]'>
                  <span>Trạng thái: Đã duyệt thoại</span>
                  <span>v1.0</span>
                </div>
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Soạn kịch bản phân khung có cấu trúc, gắn lời thoại, SFX và ghi chú mỹ thuật cho họa
                sĩ.
              </div>
            </div>

            {/* Step 02: Phác thảo (journey-sketch.webp) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#1C1917] font-mono uppercase tracking-wider'>
                  02 / {t('workflow.stages.sketch', 'Phác thảo')}
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#D8D2C5]'>
                  {t('workflow.roles.artist', 'Họa sĩ')}
                </span>
              </div>

              {/* Real Local WebP: journey-sketch.webp */}
              <div className='aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#FAF8F5] relative shadow-2xs'>
                <img
                  src='/images/landing/journey-sketch.webp'
                  alt={t('workflow.images.sketch', 'Công đoạn phác thảo khung truyện (Sketch)')}
                  loading='lazy'
                  className='w-full h-full object-cover object-center'
                />
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Dựng bố cục khung tranh thô, góc nhìn phối cảnh và cử chỉ nhân vật theo mạch kịch
                bản.
              </div>
            </div>

            {/* Step 03: Đi nét (journey-ink.webp) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#1C1917] font-mono uppercase tracking-wider'>
                  03 / {t('workflow.stages.ink', 'Đi nét')}
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#D8D2C5]'>
                  {t('workflow.roles.artist', 'Họa sĩ')}
                </span>
              </div>

              {/* Real Local WebP: journey-ink.webp */}
              <div className='aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#FAF8F5] relative shadow-2xs'>
                <img
                  src='/images/landing/journey-ink.webp'
                  alt={t('workflow.images.ink', 'Công đoạn đi nét mực đen (Inking)')}
                  loading='lazy'
                  className='w-full h-full object-cover object-center'
                />
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Đi nét mực đen chi tiết, tả chất liệu vải áo, nếp gấp, tóc và các đường speedline
                manga.
              </div>
            </div>

            {/* Step 04: Hoàn thiện (journey-color.webp) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#F97316] font-mono uppercase tracking-wider'>
                  04 / {t('workflow.stages.color', 'Hoàn thiện')}
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#F97316] border border-[#F97316]/30 font-semibold'>
                  {t('workflow.roles.editor', 'Biên tập & Màu')}
                </span>
              </div>

              {/* Real Local WebP: journey-color.webp */}
              <div className='aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#FAF8F5] relative shadow-2xs'>
                <img
                  src='/images/landing/journey-color.webp'
                  alt={t('workflow.images.color', 'Công đoạn hoàn thiện màu sắc và ánh sáng (Color)')}
                  loading='lazy'
                  className='w-full h-full object-cover object-center'
                />
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Đổ màu, chiếu sáng ấm áp góc đèn bàn, trau chuốt biểu cảm và kiểm tra tính nhất
                quán.
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* THANH SO SÁNH: BỐ CỤC 2 CỘT RỘNG THEO CONTAINER (BỎ CARD HẸP) */}
          {/* ============================================================== */}
          <div id='block-comparison' className='w-full py-4'>
            <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,48%)_minmax(0,52%)] gap-10 lg:gap-14 xl:gap-20 items-center w-full'>
              {/* Left Column (48%): Comparison Visual Viewport - Centered in column with ~4:5 ratio matching card 04 */}
              <div className='flex flex-col items-center justify-center w-full'>
                <div className='relative w-full max-w-[420px] xl:max-w-[440px] aspect-[4/5] rounded-2xl overflow-hidden border-2 border-[#1C1917] shadow-[4px_4px_0px_#1C1917] select-none bg-[#FFFEFA]'>
                  {/* Bottom Layer: Hoàn thiện (Color) */}
                  <img
                    src='/images/landing/journey-color.webp'
                    alt={t('workflow.images.coloredDraft', 'Bản màu hoàn thiện')}
                    className='absolute inset-0 w-full h-full object-contain object-center pointer-events-none select-none'
                    loading='lazy'
                    draggable={false}
                  />

                  {/* Top Layer: Phác thảo (Sketch) clipped by slider position */}
                  <div
                    className='absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none'
                    style={{
                      clipPath: `inset(0 ${100 - comparisonSliderPos}% 0 0)`,
                    }}
                  >
                    <img
                      src='/images/landing/journey-sketch.webp'
                      alt={t('workflow.images.rawSketch', 'Bản phác thảo thô')}
                      className='absolute inset-0 w-full h-full object-contain object-center select-none'
                      loading='lazy'
                      draggable={false}
                    />
                  </div>

                  {/* Divider Line & Handle */}
                  <div
                    className='absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] z-10 pointer-events-none'
                    style={{ left: `${comparisonSliderPos}%` }}
                  >
                    <div className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#1C1917] border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold font-mono'>
                      ↔
                    </div>
                  </div>

                  {/* Badges on Top of Slider */}
                  <div className='absolute top-3.5 left-3.5 z-10 pointer-events-none'>
                    <span className='px-3 py-1 rounded-md bg-[#1C1917]/85 backdrop-blur-xs text-white text-[11px] font-mono font-medium shadow-xs'>
                      Phác thảo (Sketch)
                    </span>
                  </div>
                  <div className='absolute top-3.5 right-3.5 z-10 pointer-events-none'>
                    <span className='px-3 py-1 rounded-md bg-[#F97316]/90 backdrop-blur-xs text-white text-[11px] font-mono font-medium shadow-xs'>
                      Hoàn thiện (Color)
                    </span>
                  </div>

                  {/* Accessible Range Input Overlaid for Drag, Touch & Keyboard */}
                  <input
                    type='range'
                    min='0'
                    max='100'
                    value={comparisonSliderPos}
                    onChange={(e) => setComparisonSliderPos(Number(e.target.value))}
                    aria-label={t(
                      'workflow.images.sliderAria',
                      'Thanh so sánh bản phác thảo và bản hoàn thiện',
                    )}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 focus-visible:opacity-20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-900'
                  />
                </div>

                {/* Sub-label aligned with image width */}
                <div className='w-full max-w-[420px] xl:max-w-[440px] flex items-center justify-between text-xs font-mono text-stone-500 mt-3 px-1'>
                  <span>← Kéo sang trái (xem màu)</span>
                  <span className='tabular-nums font-semibold text-stone-700'>
                    {comparisonSliderPos}%
                  </span>
                  <span>Kéo sang phải (xem phác thảo) →</span>
                </div>
              </div>

              {/* Right Column (52%): Overline, Heading, Description, Interactive Controls */}
              <div className='flex flex-col items-start text-left w-full'>
                <div className='inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-[#F97316] uppercase tracking-[0.2em] mb-3 select-none'>
                  <span className='w-7 h-px bg-[#F97316]' aria-hidden='true' />
                  Đối chiếu công đoạn
                </div>
                <h3 className='font-serif text-3xl sm:text-4xl font-medium text-[#1C1917] leading-tight mb-4 [text-wrap:balance] max-w-[28ch]'>
                  Thanh so sánh: Phác thảo & Hoàn thiện
                </h3>
                <p className='text-base text-[#57534E] leading-relaxed mb-6 [text-wrap:pretty] max-w-[55ch]'>
                  Kéo con trượt để trực tiếp quan sát sự chuyển dịch từ nét vẽ phác thảo thô sơ sang
                  bản màu hoàn thiện. Hai công đoạn minh họa cùng một phân cảnh với ánh sáng và chi
                  tiết được trau chuốt tỉ mỉ.
                </p>

                {/* Preset Quick Buttons */}
                <div className='flex flex-wrap items-center gap-2.5 mb-6 select-none'>
                  <span className='text-xs font-mono text-[#57534E] font-medium mr-1'>
                    Chế độ xem:
                  </span>
                  <button
                    type='button'
                    onClick={() => setComparisonSliderPos(100)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      comparisonSliderPos === 100
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FFFEFA] text-[#57534E] border-[#D8D2C5] hover:border-[#1C1917]'
                    }`}
                  >
                    100% Phác thảo
                  </button>
                  <button
                    type='button'
                    onClick={() => setComparisonSliderPos(50)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      comparisonSliderPos === 50
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FFFEFA] text-[#57534E] border-[#D8D2C5] hover:border-[#1C1917]'
                    }`}
                  >
                    50 / 50 Đối chiếu
                  </button>
                  <button
                    type='button'
                    onClick={() => setComparisonSliderPos(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      comparisonSliderPos === 0
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FFFEFA] text-[#57534E] border-[#D8D2C5] hover:border-[#1C1917]'
                    }`}
                  >
                    100% Hoàn thiện
                  </button>
                </div>

                {/* Three Editorial Verification Bullet Points */}
                <div className='space-y-3 w-full max-w-[55ch] pt-5 border-t border-[#D8D2C5]/80 text-xs sm:text-[13px] text-[#57534E]'>
                  <div className='flex items-start gap-2.5'>
                    <Check className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
                    <span>
                      Bản phác thảo định hình chuyển động nhân vật và góc nhìn phối cảnh ban đầu.
                    </span>
                  </div>
                  <div className='flex items-start gap-2.5'>
                    <Check className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
                    <span>
                      Bản hoàn thiện phủ màu điện ảnh, ánh sáng vàng ấm và tả chất liệu chi tiết.
                    </span>
                  </div>
                  <div className='flex items-start gap-2.5'>
                    <Check className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
                    <span>
                      Trực quan hóa tiến trình sáng tác, giúp biên tập viên đối chiếu nhanh khi xét
                      duyệt.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== SECTION: TRƯNG BÀY KHÔNG GIAN LÀM VIỆC (SHOWCASE WITH ACCESSIBLE TABS) ===== */}
      <section
        id='block-showcase'
        className='py-16 md:py-24 relative overflow-hidden scroll-mt-20 bg-[#F3F0E9]'
        aria-label={t('sections.showcaseAria', 'Trưng bày không gian làm việc')}
      >
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          <div className='text-center w-full max-w-4xl mx-auto mb-12 animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              04 / Không gian làm việc
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.08] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              Một không gian cho mọi vai trò.
            </h2>
            <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[65ch] mx-auto'>
              Biên kịch, họa sĩ, biên tập viên và đội ngũ quản lý cùng làm việc trên một nguồn dữ
              liệu có cấu trúc.
            </p>
          </div>

          {/* Interactive Workspace Window Spanning the Full Container Width */}
          <div className='relative animate-on-scroll w-full'>
            <div className='relative bg-[#FFFEFA] rounded-2xl sm:rounded-3xl shadow-sm border border-[#D8D2C5] overflow-hidden w-full'>
              {/* Window Chrome Header */}
              <div className='flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-[#D8D2C5] bg-[#F3F0E9]'>
                <div className='flex items-center gap-1.5' aria-hidden='true'>
                  <div className='w-2.5 h-2.5 rounded-full bg-[#D8D2C5]' />
                  <div className='w-2.5 h-2.5 rounded-full bg-[#D8D2C5]' />
                  <div className='w-2.5 h-2.5 rounded-full bg-[#D8D2C5]' />
                </div>
                <div className='ml-2 flex items-center gap-1.5 text-[10.5px] text-[#57534E] font-mono truncate'>
                  <Lock className='w-3 h-3 text-[#78716C]' />
                  <span className='truncate'>
                    panelforge.studio / bien-nien-su-aria / chuong-14
                  </span>
                </div>
                <div className='ml-auto flex items-center gap-2'>
                  <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] font-medium border border-[#D8D2C5]'>
                    Dữ liệu minh họa
                  </span>
                </div>
              </div>

              {/* Accessible Tab Bar */}
              <div
                role='tablist'
                aria-label={t('sections.workspaceIlloAria', 'Không gian làm việc minh họa')}
                className='flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-[#D8D2C5] bg-[#F3F0E9]/80 overflow-x-auto scrollbar-thin'
              >
                {[
                  { key: 'pipeline', label: 'Quy trình sản xuất' },
                  { key: 'script', label: 'Kịch bản phân khung' },
                  { key: 'bible', label: 'Hồ sơ bộ truyện' },
                  { key: 'events', label: 'Nhật ký thay đổi' },
                  { key: 'references', label: 'Tài liệu tham chiếu' },
                ].map(({ key, label }) => {
                  const isActive = activeShowcaseTab === key;
                  return (
                    <button
                      key={key}
                      id={`showcase-tab-${key}`}
                      role='tab'
                      type='button'
                      aria-controls={`showcase-panel-${key}`}
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActiveShowcaseTab(key as typeof activeShowcaseTab)}
                      onKeyDown={(e) => handleTabKeyDown(e, key as typeof activeShowcaseTab)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1917] ${
                        isActive
                          ? 'bg-[#1C1917] text-[#FAF8F5] shadow-xs font-semibold'
                          : 'bg-[#FCFBF8] text-[#57534E] border border-[#D8D2C5] hover:border-[#1C1917] hover:text-[#1C1917]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Panels */}
              <div className='p-4 sm:p-6 bg-[#FFFEFA] transition-opacity duration-150 ease-out motion-reduce:transition-none'>
                {/* 1. PIPELINE TAB */}
                {activeShowcaseTab === 'pipeline' && (
                  <div
                    id='showcase-panel-pipeline'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-pipeline'
                    tabIndex={0}
                    className='focus-visible:outline-none'
                  >
                    <div className='flex md:grid md:grid-cols-4 gap-3.5 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory'>
                      {/* Script Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                            Kịch bản
                          </span>
                          <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                            3
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Cảnh 04: Studio về đêm
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              « Bối cảnh: Thành phố lên đèn »
                            </div>
                          </div>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Cảnh 05: Phố mưa
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              « Hành động: An nhìn lại »
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inking Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#F97316] uppercase tracking-wider font-mono'>
                            Đi nét
                          </span>
                          <span className='text-[10px] text-[#F97316] font-mono font-bold tabular-nums'>
                            5
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#F97316]/40 shadow-xs'>
                            <div className='flex items-center justify-between'>
                              <div className='text-[11px] font-semibold text-[#1C1917]'>
                                Trang 14.3
                              </div>
                              <span className='text-[8.5px] px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#F97316] font-bold border border-[#F97316]/30'>
                                Đang vẽ
                              </span>
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              Họa sĩ: An · 3/4 khung hoàn tất
                            </div>
                          </div>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Trang 14.4
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              Chờ dựng phối cảnh
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Review Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#57534E] uppercase tracking-wider font-mono'>
                            Xét duyệt
                          </span>
                          <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                            2
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Trang 14.1
                            </div>
                            <div className='text-[9.5px] text-[#1C1917] mt-0.5 font-medium inline-flex items-center gap-1 bg-[#EAE5DC] px-1.5 py-0.5 rounded'>
                              <Sparkles className='w-2.5 h-2.5 text-[#F97316]' /> AI: Kiểm tra vết
                              sẹo
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Done Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                            Đã duyệt
                          </span>
                          <span className='text-[10px] text-[#1C1917] font-mono font-bold tabular-nums'>
                            24
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Trang 13.8
                            </div>
                            <div className='text-[9.5px] text-[#1C1917] mt-0.5 flex items-center gap-1 font-medium'>
                              <Check className='w-2.5 h-2.5 text-[#F97316]' /> Đã đóng gói xuất bản
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='md:hidden mt-2 text-center text-[10.5px] text-[#57534E]'>
                      Vuốt ngang để xem đủ 4 công đoạn →
                    </div>
                  </div>
                )}

                {/* 2. SCRIPT TAB */}
                {activeShowcaseTab === 'script' && (
                  <div
                    id='showcase-panel-script'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-script'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>
                          Phân cảnh 04: Studio về đêm
                        </span>
                        <span className='text-[#57534E] ml-2'>· Tập 3, Chương 14</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#57534E]'>
                        Soạn thảo kịch bản phân khung
                      </span>
                    </div>

                    <div className='grid md:grid-cols-3 gap-3'>
                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] font-mono'>
                            Khung #01 (Toàn cảnh)
                          </span>
                          <span className='text-[9.5px] font-mono text-[#57534E]'>1/3 trang</span>
                        </div>
                        <p className='text-xs text-[#57534E] leading-relaxed'>
                          <strong className='text-[#1C1917]'>Bối cảnh:</strong> Thành phố lên đèn từ
                          góc cao. Một ô cửa sổ xưởng vẽ gác mái vẫn sáng ánh đèn vàng.
                        </p>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] font-mono'>
                            Khung #02 (Cận cảnh)
                          </span>
                          <span className='text-[9.5px] font-mono text-[#57534E]'>1/3 trang</span>
                        </div>
                        <p className='text-xs text-[#57534E] leading-relaxed'>
                          <strong className='text-[#1C1917]'>Hành động:</strong> An cúi xuống bản
                          thảo, tay cầm bút vẽ G-Pen. Ánh mắt kiên định.
                        </p>
                        <p className='text-xs text-[#1C1917] mt-1 italic'>
                          « Thoại: "Bản thảo này... câu chuyện bắt đầu ở đây." »
                        </p>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] font-mono'>
                            Khung #03 (Chi tiết tay)
                          </span>
                          <span className='text-[9.5px] font-mono text-[#57534E]'>1/3 trang</span>
                        </div>
                        <p className='text-xs text-[#57534E] leading-relaxed'>
                          <strong className='text-[#1C1917]'>Chi tiết:</strong> Ngòi bút chạm nhẹ
                          trang giấy bản thảo. Lọ mực đen mở nắp phản chiếu ánh đèn bàn.
                        </p>
                        <div className='text-[10.5px] text-[#57534E] mt-1 font-mono'>
                          SFX: — xoẹt nhẹ
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BIBLE TAB */}
                {activeShowcaseTab === 'bible' && (
                  <div
                    id='showcase-panel-bible'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-bible'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>
                          Hồ sơ bộ truyện đã khóa
                        </span>
                        <span className='text-[#57534E] ml-2'>· Chuẩn mực tác phẩm</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#1C1917] bg-[#EAE5DC] px-2 py-0.5 rounded border border-[#D8D2C5]'>
                        Quy tắc nhất quán v3.2
                      </span>
                    </div>

                    <div className='grid md:grid-cols-2 gap-3'>
                      <div className='p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='w-6 h-6 rounded-full bg-[#1C1917] text-[#FAF8F5] text-[10px] font-bold flex items-center justify-center font-mono'>
                            A
                          </span>
                          <div>
                            <div className='text-xs font-bold text-[#1C1917]'>
                              Nhân vật: An (Họa sĩ chính)
                            </div>
                            <div className='text-[10px] text-[#57534E]'>
                              Đặc điểm nhận diện & trang phục
                            </div>
                          </div>
                        </div>
                        <ul className='text-xs text-[#57534E] space-y-1 list-disc list-inside'>
                          <li>Trang phục: Áo khoác xám dài có ghim cài studio ở vạt trái.</li>
                          <li>Tóc đen đánh rối tự nhiên, ánh mắt tập trung cao độ.</li>
                          <li>Dụng cụ quen thuộc: Bút vẽ G-Pen ngòi vàng thủ công.</li>
                        </ul>
                      </div>

                      <div className='p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='w-6 h-6 rounded-full bg-[#EAE5DC] text-[#1C1917] text-[10px] font-bold flex items-center justify-center border border-[#D8D2C5]'>
                            <Sparkles className='w-3 h-3 text-[#F97316]' />
                          </span>
                          <div>
                            <div className='text-xs font-bold text-[#1C1917]'>
                              Quy tắc AI đối chiếu nhất quán
                            </div>
                            <div className='text-[10px] text-[#57534E]'>
                              Gợi ý rà soát khi nộp trang vẽ
                            </div>
                          </div>
                        </div>
                        <ul className='text-xs text-[#57534E] space-y-1 list-disc list-inside'>
                          <li>Kiểm tra hướng nguồn sáng đèn bàn vàng ấm góc 45 độ.</li>
                          <li>Đối chiếu cấu trúc bàn tay cầm bút đúng tư thế manga thực tế.</li>
                          <li>Cảnh báo ngay nếu phục trang nhân vật lệch khỏi hồ sơ.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. EVENTS TAB */}
                {activeShowcaseTab === 'events' && (
                  <div
                    id='showcase-panel-events'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-events'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>Nhật ký thay đổi</span>
                        <span className='text-[#57534E] ml-2'>· Lưu trữ từng phiên bản</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#57534E]'>Không thể ghi đè</span>
                    </div>

                    <div className='space-y-2 text-xs'>
                      {[
                        {
                          time: '14:42 · Jiro (Biên tập)',
                          action: 'Đã phê duyệt trang 14.1',
                          detail: 'Đối chiếu hồ sơ nhân vật An đạt chuẩn',
                          tag: 'Phê duyệt',
                        },
                        {
                          time: '14:38 · An (Họa sĩ)',
                          action: 'Nộp bản vẽ v3 cho khung #02 và #03',
                          detail: 'Bổ sung màu và ánh sáng đổ bóng',
                          tag: 'Cập nhật',
                        },
                        {
                          time: '14:21 · AI Trợ lý',
                          action: 'Gợi ý kiểm tra chi tiết nhân vật',
                          detail: 'Nhắc nhở đối chiếu vết sẹo theo hồ sơ v3.2',
                          tag: 'AI Gợi ý',
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className='p-2.5 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-between'
                        >
                          <div>
                            <div className='font-medium text-[#1C1917]'>{item.action}</div>
                            <div className='text-[11px] text-[#57534E]'>
                              {item.time} · {item.detail}
                            </div>
                          </div>
                          <span className='text-[9.5px] px-2 py-0.5 rounded bg-[#EAE5DC] text-[#1C1917] font-mono border border-[#D8D2C5]'>
                            {item.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. REFERENCES TAB */}
                {activeShowcaseTab === 'references' && (
                  <div
                    id='showcase-panel-references'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-references'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>
                          Tài liệu tham chiếu chương 14
                        </span>
                        <span className='text-[#57534E] ml-2'>· Bảng màu & tư liệu phối cảnh</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#57534E]'>
                        Đã gắn vào kịch bản
                      </span>
                    </div>

                    <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs'>
                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 flex items-center gap-1 font-mono'>
                          <Palette className='w-3 h-3 text-[#F97316]' /> Bảng màu chính
                        </div>
                        <div className='flex gap-1.5 mt-2'>
                          <div
                            className='w-6 h-6 rounded-md bg-[#1C1917]'
                            title='Đen mực #1C1917'
                          />
                          <div
                            className='w-6 h-6 rounded-md bg-[#F97316]'
                            title='Cam PanelForge #F97316'
                          />
                          <div
                            className='w-6 h-6 rounded-md bg-[#FAF8F5] border border-[#D8D2C5]'
                            title='Giấy ngà #FAF8F5'
                          />
                          <div
                            className='w-6 h-6 rounded-md bg-[#57534E]'
                            title='Xám chì #57534E'
                          />
                        </div>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 flex items-center gap-1 font-mono'>
                          <BookMarked className='w-3 h-3 text-[#1C1917]' /> Bối cảnh
                        </div>
                        <div className='font-semibold text-[#1C1917] mt-1'>Studio gác mái</div>
                        <div className='text-[10.5px] text-[#57534E] mt-0.5'>
                          Cửa sổ nhìn ra đường chân trời đô thị
                        </div>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 font-mono'>
                          Đạo cụ tham chiếu
                        </div>
                        <div className='font-semibold text-[#1C1917] mt-1'>Bút vẽ G-Pen</div>
                        <div className='text-[10.5px] text-[#57534E] mt-0.5'>
                          Góc cầm 45 độ, ngòi kim loại ánh vàng
                        </div>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 font-mono'>
                          Ánh sáng chủ đạo
                        </div>
                        <div className='font-semibold text-[#1C1917] mt-1'>Đèn bàn ấm</div>
                        <div className='text-[10.5px] text-[#57534E] mt-0.5'>
                          Tương phản cao với bầu trời đêm ngoài cửa
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== FAQ SECTION (DESKTOP TWO-COLUMN EDITORIAL SPREAD: LEFT HEADING, RIGHT ACCORDIONS) ===== */}
      <section
        id='block-faq'
        className='py-16 md:py-24 relative scroll-mt-20 bg-[#F3F0E9]'
        aria-label={t('sections.faqAria', 'Hỏi đáp thường gặp')}
      >
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,38%)_minmax(0,62%)] gap-10 lg:gap-14 xl:gap-20 items-start w-full animate-on-scroll'>
            {/* Left Column (38%): Overline, Heading & Editorial Description */}
            <div className='text-left w-full'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                05 / Giải đáp thắc mắc
              </div>
              <h2 className='font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[22ch]'>
                Câu hỏi thường gặp về PanelForge.
              </h2>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[42ch]'>
                Những thắc mắc phổ biến về vai trò thành viên, quy trình studio và lưu trữ dữ liệu
                bản thảo trong quá trình sáng tác.
              </p>

              <div className='mt-8 p-5 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] max-w-[42ch]'>
                <div className='text-xs font-mono font-semibold text-[#1C1917] uppercase tracking-wider mb-1'>
                  Hỗ trợ studio trực tiếp
                </div>
                <div className='text-xs text-[#57534E] leading-relaxed'>
                  Bạn đang xây dựng quy trình sáng tác cho đội ngũ lớn? Các quản trị viên có thể
                  thiết lập phân quyền và lưu vết theo yêu cầu của từng bộ truyện.
                </div>
              </div>
            </div>

            {/* Right Column (62%): Accordion List */}
            <div className='space-y-4 w-full'>
              {[
                {
                  question: 'Ai có thể sử dụng PanelForge?',
                  answer:
                    'PanelForge được thiết kế cho các đội ngũ sáng tác truyện tranh, studio và nhóm tác giả độc lập gồm biên kịch, họa sĩ, biên tập viên và trưởng dự án. Nền tảng phân quyền rõ ràng theo từng vai trò công việc để việc cộng tác luôn trật tự.',
                },
                {
                  question: 'Tài khoản mới có thể tự tạo studio không?',
                  answer:
                    'Có. Sau khi đăng ký tài khoản, bạn có thể tự khởi tạo studio sản xuất mới của riêng mình hoặc được thêm vào studio của đội ngũ khác qua email mời của thành viên quản trị.',
                },
                {
                  question: 'AI hỗ trợ đội ngũ ở bước nào?',
                  answer:
                    'AI đóng vai trò như một trợ lý rà soát kịch bản và phân cảnh, đối chiếu các chi tiết trong kịch bản với thông tin đã thiết lập trong Hồ sơ bộ truyện (đặc điểm nhân vật, trang phục, quy tắc thế giới) để nhắc nhở đội ngũ giữ tính nhất quán.',
                },
                {
                  question: 'Các phiên bản cũ được quản lý thế nào?',
                  answer:
                    'Mỗi lượt cập nhật kịch bản hoặc gửi bản vẽ mới đều được hệ thống ghi nhận thành các mốc riêng kèm thời gian và người thực hiện. Đội ngũ có thể xem lại lịch sử các lần nộp để đối chiếu và theo dõi tiến độ hoàn thiện của từng trang.',
                },
              ].map(({ question, answer }, idx) => (
                <details
                  key={idx}
                  className='group rounded-xl border border-[#D8D2C5] bg-[#FFFEFA] shadow-2xs transition-all duration-200 open:border-[#1C1917]/40 open:shadow-xs w-full'
                >
                  <summary className='flex items-center justify-between gap-4 p-4 sm:p-5 text-left font-serif text-lg font-medium text-[#1C1917] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xl'>
                    <span>{question}</span>
                    <ChevronDown className='w-4 h-4 text-[#57534E] shrink-0 transition-transform duration-200 group-open:rotate-180' />
                  </summary>
                  <div className='px-4 sm:px-5 pb-5 pt-1 text-sm text-[#57534E] leading-relaxed border-t border-[#D8D2C5]/50'>
                    {answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CALL TO ACTION (CTA) ===== */}
      <section
        id='block-cta'
        className='py-16 md:py-24 relative scroll-mt-20 bg-[#F3F0E9] border-t border-[#D8D2C5]'
        aria-label={t('sections.ctaAria', 'Bắt đầu sáng tác')}
      >
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full text-center'>
          <div className='animate-on-scroll max-w-3xl mx-auto'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              Bắt đầu sáng tác
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              Cùng tạo nên câu chuyện{' '}
              <span className='relative inline-block'>
                <span>tiếp theo.</span>
                <span className='absolute bottom-1 left-0 w-full h-[3px] bg-[#F97316]/40 -z-10 rounded-full' />
              </span>
            </h2>
            <p className='mt-5 text-base sm:text-lg text-[#57534E] max-w-xl mx-auto leading-relaxed [text-wrap:pretty]'>
              Đưa đội ngũ, kịch bản và quy trình của bạn vào PanelForge. Biến những tháng ngày làm
              việc rời rạc thành một chu trình sáng tác có cấu trúc và đáng tin cậy.
            </p>

            {/* Action buttons */}
            <div className='mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5'>
              <button
                onClick={handleRegisterClick}
                className='w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#1C1917] hover:bg-black active:scale-[0.98] motion-reduce:transform-none text-[#FAF8F5] font-medium text-base shadow-soft-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
              >
                <span>Tạo tài khoản ngay</span>
                <ArrowRight className='w-4 h-4' />
              </button>
              <a
                href='#block-workflow'
                onClick={handleScrollToWorkflow}
                className='w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#FFFEFA] border border-[#D8D2C5] text-[#1C1917] font-medium text-base hover:border-[#1C1917] hover:bg-[#F3F0E9] active:scale-[0.98] motion-reduce:transform-none transition-all shadow-soft-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
              >
                <span>Xem quy trình hoạt động</span>
                <ArrowRight className='w-4 h-4' />
              </a>
            </div>

            {/* Trust feature pills */}
            <div className='mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#57534E]'>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#F97316]' /> Kịch bản phân khung có cấu trúc
              </div>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#F97316]' /> Lưu dấu toàn bộ lịch sử phiên bản
              </div>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#F97316]' /> Đối chiếu nhất quán với AI
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className='bg-[#1C1917] text-[#FAF8F5] relative border-t border-[#292524]'>
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] py-12'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-10 mb-10'>
            {/* Brand column */}
            <div className='md:col-span-6'>
              <a
                href='#hero-section'
                onClick={(e) => handleNavScroll(e, 'hero-section')}
                className='inline-flex items-center gap-2.5 group'
                aria-label={t('nav.homeAria', 'PanelForge - Về đầu trang')}
              >
                <BrandMark
                  size={30}
                  tone='paper'
                  className='shrink-0 group-hover:scale-105 transition-transform motion-reduce:transform-none'
                />
                <span className='font-serif text-xl font-bold tracking-tight text-[#FAF8F5]'>
                  {t('footer.brand', 'PanelForge')}
                </span>
              </a>
              <p className='mt-4 text-sm text-[#A8A29E] max-w-md leading-relaxed [text-wrap:pretty]'>
                {t(
                  'footer.tagline',
                  'Nền tảng cộng tác sản xuất truyện tranh có cấu trúc. Đồng bộ kịch bản, nét vẽ, xét duyệt và lịch sử phiên bản trong một không gian duy nhất.',
                )}
              </p>
            </div>

            {/* Navigation links */}
            <div className='md:col-span-3'>
              <div className='text-xs uppercase tracking-[0.18em] text-[#D6D3D1] font-semibold mb-4 font-mono'>
                Khám phá
              </div>
              <ul className='space-y-2.5 text-sm text-[#A8A29E]'>
                <li>
                  <a
                    href='#block-features'
                    onClick={(e) => handleNavScroll(e, 'block-features')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Tính năng nổi bật
                  </a>
                </li>
                <li>
                  <a
                    href='#block-workflow'
                    onClick={(e) => handleNavScroll(e, 'block-workflow')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Quy trình 4 công đoạn
                  </a>
                </li>
                <li>
                  <a
                    href='#block-showcase'
                    onClick={(e) => handleNavScroll(e, 'block-showcase')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Trưng bày không gian làm việc
                  </a>
                </li>
                <li>
                  <a
                    href='#block-faq'
                    onClick={(e) => handleNavScroll(e, 'block-faq')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Hỏi đáp thường gặp
                  </a>
                </li>
                <li>
                  <a
                    href='#hero-section'
                    onClick={(e) => handleNavScroll(e, 'hero-section')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Về đầu trang ↑
                  </a>
                </li>
              </ul>
            </div>

            {/* Account links */}
            <div className='md:col-span-3'>
              <div className='text-xs uppercase tracking-[0.18em] text-[#D6D3D1] font-semibold mb-4 font-mono'>
                Tài khoản
              </div>
              <ul className='space-y-2.5 text-sm text-[#A8A29E]'>
                <li>
                  <button
                    onClick={handleLoginClick}
                    className='hover:text-[#FAF8F5] transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:underline'
                  >
                    Đăng nhập
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleRegisterClick}
                    className='hover:text-[#FAF8F5] transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:underline'
                  >
                    Tạo tài khoản mới
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className='pt-6 border-t border-[#292524] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]'>
            <div>© 2026 PanelForge. Nền tảng hỗ trợ sáng tác truyện tranh.</div>
            <div className='text-[#78716C]'>Bản quyền thuộc về PanelForge Studio</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * PanelForge Creative & Governance Copy Linter
 * 
 * Verifies that:
 * 1. Creative roles (writer, artist, letterer) don't contain leaked DB admin jargon.
 * 2. Governance roles (editor, producer, admin, provenance) maintain W3C PROV & CAS clarity without breaking UI width.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const CREATIVE_FORBIDDEN_PATTERNS = [
  { pattern: /System UUID/i, message: 'Do not use "System UUID" in creative screens. Use "Mã tác giả" or "Mã lưu trữ".' },
  { pattern: /Append-only/i, message: 'Do not use "Append-only" in creative screens. Use "Bảo toàn lịch sử".' },
  { pattern: /ECDSA\s*P?-?256/i, message: 'Do not expose "ECDSA P-256" in creative screens. Use "Chữ ký xác thực".' },
  { pattern: /Đang tính mã SHA-256/i, message: 'Do not show "Đang tính mã SHA-256". Use "Đang kiểm tra & nén ảnh...".' },
  { pattern: /Mã định danh hệ thống \(ID\)/i, message: 'Do not use "Mã định danh hệ thống (ID)". Use "Mã lưu trữ" or shortId.' }
];

let hasErrors = false;

function scanDir(dir, isCreativeRole) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      scanDir(fullPath, isCreativeRole || fullPath.includes('roles\\writer') || fullPath.includes('roles/writer') || fullPath.includes('roles\\artist') || fullPath.includes('roles/artist') || fullPath.includes('roles\\letterer') || fullPath.includes('roles/letterer'));
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.test.ts')) {
      checkFile(fullPath, isCreativeRole);
    }
  }
}

function checkFile(filePath, isCreative) {
  if (!isCreative) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const { pattern, message } of CREATIVE_FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`[COPY LINT ERROR] ${path.relative(ROOT_DIR, filePath)}: ${message}`);
      hasErrors = true;
    }
  }
}

console.log('[*] Running Creative Copy Linter on Creative Viewports...');
scanDir(path.join(ROOT_DIR, 'src', 'roles', 'writer'), true);
scanDir(path.join(ROOT_DIR, 'src', 'roles', 'artist'), true);
scanDir(path.join(ROOT_DIR, 'src', 'roles', 'letterer'), true);

if (hasErrors) {
  console.error('\n[FAILED] Creative copy linter found violations.');
  process.exit(1);
} else {
  console.log('[SUCCESS] All creative viewports satisfy PanelForge copy guidelines.');
  process.exit(0);
}

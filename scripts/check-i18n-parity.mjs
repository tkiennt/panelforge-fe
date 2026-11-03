#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tìm thư mục src/locales linh hoạt (chạy từ repo root hoặc từ Frontend/panelforge-fe)
const candidateDirs = [
  path.resolve(__dirname, '../src/locales'),
  path.resolve(__dirname, '../../Frontend/panelforge-fe/src/locales'),
  path.resolve(process.cwd(), 'src/locales'),
  path.resolve(process.cwd(), 'Frontend/panelforge-fe/src/locales'),
];

const localesDir = candidateDirs.find((dir) => fs.existsSync(dir));

if (!localesDir) {
  console.error('❌ Không tìm thấy thư mục locales. Đã quét qua các đường dẫn:', candidateDirs);
  process.exit(1);
}

const viDir = path.join(localesDir, 'vi');
const enDir = path.join(localesDir, 'en');

if (!fs.existsSync(viDir) || !fs.existsSync(enDir)) {
  console.error(`❌ Thư mục ngôn ngữ không hợp lệ: vi (${fs.existsSync(viDir)}), en (${fs.existsSync(enDir)})`);
  process.exit(1);
}

/**
 * Thu thập tất cả key phân cấp đệ quy
 */
function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys.push(...collectKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const viFiles = fs.readdirSync(viDir).filter((f) => f.endsWith('.json'));
const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith('.json'));

let hasError = false;
let totalNamespaces = 0;
let totalKeysVi = 0;
let totalKeysEn = 0;

console.log('='.repeat(70));
console.log(`🌐 KIỂM TRA ĐỐI CHIẾU KEY PARITY (VI ↔ EN)`);
console.log(`📂 Thư mục: ${localesDir}`);
console.log('='.repeat(70));

const allNamespaces = Array.from(new Set([...viFiles, ...enFiles])).sort();

const diffSummary = [];

for (const file of allNamespaces) {
  const viFile = path.join(viDir, file);
  const enFile = path.join(enDir, file);
  const nsName = path.basename(file, '.json');

  if (!fs.existsSync(viFile)) {
    console.error(`❌ [${nsName}] Namespace có ở EN nhưng THIẾU Ở VI: ${file}`);
    hasError = true;
    continue;
  }
  if (!fs.existsSync(enFile)) {
    console.error(`❌ [${nsName}] Namespace có ở VI nhưng THIẾU Ở EN: ${file}`);
    hasError = true;
    continue;
  }

  totalNamespaces++;

  let viData, enData;
  try {
    viData = JSON.parse(fs.readFileSync(viFile, 'utf-8'));
  } catch (err) {
    console.error(`❌ [${nsName}] Lỗi parse JSON file VI: ${err.message}`);
    hasError = true;
    continue;
  }

  try {
    enData = JSON.parse(fs.readFileSync(enFile, 'utf-8'));
  } catch (err) {
    console.error(`❌ [${nsName}] Lỗi parse JSON file EN: ${err.message}`);
    hasError = true;
    continue;
  }

  const viKeys = collectKeys(viData);
  const enKeys = collectKeys(enData);

  totalKeysVi += viKeys.length;
  totalKeysEn += enKeys.length;

  const viKeySet = new Set(viKeys);
  const enKeySet = new Set(enKeys);

  const missingInEn = viKeys.filter((k) => !enKeySet.has(k));
  const missingInVi = enKeys.filter((k) => !viKeySet.has(k));

  if (missingInEn.length > 0 || missingInVi.length > 0) {
    hasError = true;
    diffSummary.push({
      namespace: nsName,
      viCount: viKeys.length,
      enCount: enKeys.length,
      missingInEn,
      missingInVi,
    });
    console.log(`❌ [${nsName}] LỆCH KEY: VI (${viKeys.length}) vs EN (${enKeys.length})`);
  } else {
    console.log(`✅ [${nsName}] Khớp hoàn toàn (${viKeys.length} keys)`);
  }
}

console.log('-'.repeat(70));

if (diffSummary.length > 0) {
  console.log('\n📋 CHI TIẾT CÁC KEY BỊ LỆCH:');
  for (const item of diffSummary) {
    console.log(`\n▶ Namespace: ${item.namespace}`);
    if (item.missingInEn.length > 0) {
      console.log(`  ⚠ Có ở VI nhưng thiếu ở EN (${item.missingInEn.length} keys):`);
      item.missingInEn.forEach((k) => console.log(`    - ${item.namespace}.${k}`));
    }
    if (item.missingInVi.length > 0) {
      console.log(`  ⚠ Có ở EN nhưng thiếu ở VI (${item.missingInVi.length} keys):`);
      item.missingInVi.forEach((k) => console.log(`    - ${item.namespace}.${k}`));
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log(`📊 TỔNG KẾT:`);
console.log(`   - Tổng số Namespaces: ${totalNamespaces}`);
console.log(`   - Tổng số Keys VI   : ${totalKeysVi}`);
console.log(`   - Tổng số Keys EN   : ${totalKeysEn}`);
console.log('='.repeat(70));

if (hasError) {
  console.error('\n❌ KẾT QUẢ: THẤT BẠI! Có sự bất đối xứng giữa từ điển VI và EN.\n');
  process.exit(1);
} else {
  console.log('\n✨ KẾT QUẢ: THÀNH CÔNG! Độ phủ key song ngữ đạt 100% (Parity Perfect).\n');
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/views/WorkspaceListView.tsx',
  'src/views/producer/ProducerWorkspaceView.tsx',
  'src/views/series/SeriesMembersView.tsx',
  'src/views/producer/SeriesDashboardView.tsx',
  'src/components/modals/CreateWorkspaceModal.tsx',
  'src/components/modals/CreateProjectModal.tsx'
];

const replacements = [
  { regex: /bg-\[#F8F6F0\]/g, replace: 'bg-zinc-50' },
  { regex: /bg-\[#FAF8F4\]/g, replace: 'bg-zinc-50' },
  { regex: /text-\[#171717\]/g, replace: 'text-zinc-900' },
  { regex: /bg-\[#171717\]/g, replace: 'bg-zinc-900' },
  { regex: /border-\[#171717\]/g, replace: 'border-zinc-900' },
  { regex: /bg-\[#2A2A2A\]/g, replace: 'bg-zinc-800' },
  { regex: /border-\[#E7E7E7\]/g, replace: 'border-zinc-200' },
  { regex: /bg-\[#E7E7E7\]/g, replace: 'bg-zinc-200' },
  { regex: /border-\[#E5E5E5\]/g, replace: 'border-zinc-200' },
  { regex: /bg-\[#E5E5E5\]/g, replace: 'bg-zinc-200' },
  { regex: /border-\[#D4D4D4\]/g, replace: 'border-zinc-300' },
  { regex: /text-\[#888888\]/g, replace: 'text-zinc-500' },
  { regex: /text-\[#666666\]/g, replace: 'text-zinc-500' },
  { regex: /text-\[#555555\]/g, replace: 'text-zinc-500' },
  { regex: /text-\[#EA580C\]/g, replace: 'text-orange-600' },
  { regex: /bg-\[#EA580C\]/g, replace: 'bg-orange-600' },
  { regex: /from-\[#EA580C\]/g, replace: 'from-orange-600' },
  { regex: /text-\[#F97316\]/g, replace: 'text-orange-500' },
  { regex: /bg-\[#F97316\]/g, replace: 'bg-orange-500' },
  { regex: /border-\[#F97316\]/g, replace: 'border-orange-500' },
  { regex: /to-\[#F97316\]/g, replace: 'to-orange-500' },
  { regex: /to-\[#F59E0B\]/g, replace: 'to-amber-500' },
  { regex: /shadow-2xs/g, replace: 'shadow-sm' },
  { regex: /shadow-xs/g, replace: 'shadow-sm' }
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const r of replacements) {
      content = content.replace(r.regex, r.replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
}

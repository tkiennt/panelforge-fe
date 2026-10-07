const fs = require('fs');
const path = require('path');

const filesToProcess = [
  path.join(__dirname, '../src/components/CharacterImagePipeline.tsx'),
  path.join(__dirname, '../src/views/PanelCanvasEditor.tsx'),
  path.join(__dirname, '../src/test-integrated.tsx'),
];

const replacements = [
  [/bg-gray-950/g, 'bg-[#FAF8F5]'],
  [/bg-gray-900\/80/g, 'bg-zinc-50/80'],
  [/bg-gray-900\/50/g, 'bg-zinc-50/50'],
  [/bg-gray-900/g, 'bg-white'],
  [/bg-gray-800\/50/g, 'bg-zinc-50'],
  [/bg-gray-800/g, 'bg-zinc-100'],
  [/hover:bg-gray-800/g, 'hover:bg-zinc-100'],
  [/bg-gray-700/g, 'bg-zinc-200'],
  [/hover:bg-gray-700/g, 'hover:bg-zinc-200'],
  [/border-gray-800/g, 'border-zinc-200'],
  [/border-gray-700/g, 'border-zinc-300'],
  [/border-gray-600/g, 'border-zinc-400'],
  [/text-gray-100/g, 'text-zinc-900'],
  [/text-gray-200/g, 'text-zinc-800'],
  [/text-gray-300/g, 'text-zinc-700'],
  [/text-gray-400/g, 'text-zinc-500'],
  [/text-gray-500/g, 'text-zinc-400'],
  [/text-gray-600/g, 'text-zinc-300'],
  [/bg-blue-600\/10/g, 'bg-orange-500/10'],
  [/bg-blue-600\/20/g, 'bg-orange-500/10'],
  [/bg-blue-600\/30/g, 'bg-orange-500/10'],
  [/bg-blue-500\/10/g, 'bg-orange-500/10'],
  [/bg-blue-500\/20/g, 'bg-orange-500/10'],
  [/bg-blue-500\/30/g, 'bg-orange-500/10'],
  [/bg-indigo-600\/10/g, 'bg-orange-500/10'],
  [/text-blue-400/g, 'text-orange-600'],
  [/text-blue-300/g, 'text-orange-500'],
  [/text-indigo-400/g, 'text-orange-600'],
  [/text-indigo-500/g, 'text-orange-500'],
  [/border-blue-500\/30/g, 'border-orange-500/30'],
  [/border-indigo-500\/30/g, 'border-orange-500/30'],
  [/border-blue-500/g, 'border-orange-500'],
  [/border-indigo-500/g, 'border-orange-500'],
  [/bg-blue-500/g, 'bg-orange-500'],
  [/bg-blue-600/g, 'bg-orange-500'],
  [/bg-indigo-600/g, 'bg-orange-500'],
  [/hover:bg-blue-700/g, 'hover:bg-orange-600'],
  [/hover:bg-indigo-700/g, 'hover:bg-orange-600'],
  [/border-t-blue-500/g, 'border-t-orange-500'],
  [/ring-blue-500/g, 'ring-orange-500'],
  [/shadow-black\/50/g, 'shadow-zinc-200/50'],
];

filesToProcess.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [regex, replacement] of replacements) {
      content = content.replace(regex, replacement);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Applied theme to ${filePath}`);
  }
});

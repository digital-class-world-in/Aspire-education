const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

const excludeFiles = [
  'sidebar.tsx', 
  'top-nav.tsx', 
  'branch-sidebar.tsx', 
  'staff-sidebar.tsx', 
  'student-sidebar.tsx',
  'navbar.tsx', // user mentioned navbar
];

function walk(directory) {
  let results = [];
  try {
      const list = fs.readdirSync(directory);
      list.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else {
          // exclude matching filenames
          if (fullPath.endsWith('.tsx') && !excludeFiles.some(ex => fullPath.endsWith(ex))) {
            results.push(fullPath);
          }
        }
      });
  } catch(e) {}
  return results;
}

const files = walk(dir);
console.log(`Found ${files.length} .tsx files to process.`);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Remove uppercase and capitalize
  content = content.replace(/\buppercase\b/g, '');
  content = content.replace(/\bcapitalize\b/g, '');

  // 2. Change font colors (text-zinc-* etc) to text-black
  // Only target 400-900 to avoid making white text black on dark backgrounds
  content = content.replace(/\btext-(zinc|gray|slate)-(400|500|600|700|800|900)\b/g, 'text-black');
  
  // Also any other common grey text overriding
  content = content.replace(/\btext-muted-foreground\b/g, 'text-black');

  // 3. Force font-family: Public Sans
  content = content.replace(/\bfont-(headline|body|sans|mono)\b/g, 'font-public-sans');
  
  // ensure everything with text styling has font-public-sans if not already
  // We'll trust that the global CSS is also doing some heavy lifting if needed.

  // 4. Change font size to 14px (text-sm is 14px in tailwind, or we can use text-[14px])
  content = content.replace(/\btext-(xs|sm|base)\b/g, 'text-[14px]');
  content = content.replace(/\btext-\[(10|11|12|13|15)px\]\b/g, 'text-[14px]');

  if (content !== original) {
    // clean up multiple spaces in classnames
    content = content.replace(/className="([^"]*)"/g, (match, p1) => {
      let cleaned = p1.replace(/\s+/g, ' ').trim();
      return `className="${cleaned}"`;
    });
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Update Complete. Modified ${modifiedCount} files.`);

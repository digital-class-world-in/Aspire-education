const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) results = results.concat(walk(filePath));
        else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) results.push(filePath);
    });
    return results;
}

const files = walk(path.join('c:\\Users\\Digital Class\\Downloads\\vcec-master\\src'));
let totalReplaced = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace(/<DialogClose[^>]*>\s*<X[^>]*\/>\s*<\/DialogClose>/g, '');
    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        totalReplaced++;
        console.log(`Updated ${file}`);
    }
});
console.log(`Replaced in ${totalReplaced} files.`);

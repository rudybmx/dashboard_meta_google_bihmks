import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const replacements = [
    { from: /from ['"]\.\.\/\.\.\/lib\//g, to: 'from \'@/src/shared/lib/' },
    { from: /from ['"]\.\.\/lib\//g, to: 'from \'@/src/shared/lib/' },
];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(rootDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    replacements.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated imports in ${file}`);
    }
});

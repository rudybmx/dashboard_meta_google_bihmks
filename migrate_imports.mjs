import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const replacements = [
    // ui
    { from: /@\/components\/ui\//g, to: '@/src/shared/ui/' },
    { from: /from ['"]\.\.\/ui\//g, to: 'from \'@/src/shared/ui/' }, // in components/some-folder this might happen
    { from: /from ['"]\.\/ui\//g, to: 'from \'@/src/shared/ui/' }, // in components/ this might happen
    { from: /from ['"]\.\.\/components\/ui\//g, to: 'from \'@/src/shared/ui/' },

    // lib
    { from: /@\/lib\//g, to: '@/src/shared/lib/' },
    { from: /from ['"]\.\.\/lib\//g, to: 'from \'@/src/shared/lib/' },
    { from: /from ['"]\.\/lib\//g, to: 'from \'@/src/shared/lib/' },

    // supabase
    { from: /@\/supabase\//g, to: '@/src/shared/api/' },
    { from: /from ['"]\.\.\/supabase\//g, to: 'from \'@/src/shared/api/' },
    { from: /from ['"]\.\/supabase\//g, to: 'from \'@/src/shared/api/' },
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
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(rootDir);

let modifiedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    replacements.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Updated imports in ${file}`);
    }
});

console.log(`Finished. Modified ${modifiedCount} files.`);

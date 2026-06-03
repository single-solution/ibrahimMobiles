import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(f)) {
        walkDir(dirPath, callback);
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // Fix double aliases: e.g. "Brand as BrandModel as BrandModel" -> "Brand as BrandModel"
  newContent = newContent.replace(/as (\w+Model) as \1/g, 'as $1');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

console.log('Fixing double aliases in apps/web/src...');
walkDir(path.join(rootDir, 'apps/web/src'), processFile);
console.log('Done.');

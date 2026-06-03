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
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
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

  // We are only concerned with apps/web/src files for these conflicts since apps/admin doesn't use `Product` from shared for public data (it uses AdminProduct).
  // In apps/web/src, the Mongoose models from @store/db should be aliased.
  
  // We can do standard regex replacements for `@store/db` imports:
  if (content.includes('@store/db')) {
    // Replace imports
    newContent = newContent.replace(/\bBrand\b(.*?from\s+['"]@store\/db['"])/g, 'Brand as BrandModel$1');
    newContent = newContent.replace(/\bCategory\b(.*?from\s+['"]@store\/db['"])/g, 'Category as CategoryModel$1');
    newContent = newContent.replace(/\bAttribute\b(.*?from\s+['"]@store\/db['"])/g, 'Attribute as AttributeModel$1');
    newContent = newContent.replace(/\bGrade\b(.*?from\s+['"]@store\/db['"])/g, 'Grade as GradeModel$1');
    newContent = newContent.replace(/\bOffer\b(.*?from\s+['"]@store\/db['"])/g, 'Offer as OfferModel$1');
    newContent = newContent.replace(/\bProduct\b(.*?from\s+['"]@store\/db['"])/g, 'Product as ProductModel$1');
    newContent = newContent.replace(/\bOrder\b(.*?from\s+['"]@store\/db['"])/g, 'Order as OrderModel$1');
    newContent = newContent.replace(/\bInquiry\b(.*?from\s+['"]@store\/db['"])/g, 'Inquiry as InquiryModel$1');

    // Replace usage of models
    // Since we know the context (apps/web/src), these models are usually called like `Product.find()`, `Brand.aggregate()`, etc.
    newContent = newContent.replace(/\bBrand\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'BrandModel.$1');
    newContent = newContent.replace(/\bCategory\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'CategoryModel.$1');
    newContent = newContent.replace(/\bAttribute\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'AttributeModel.$1');
    newContent = newContent.replace(/\bGrade\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'GradeModel.$1');
    newContent = newContent.replace(/\bOffer\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'OfferModel.$1');
    newContent = newContent.replace(/\bProduct\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'ProductModel.$1');
    newContent = newContent.replace(/\bOrder\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'OrderModel.$1');
    newContent = newContent.replace(/\bInquiry\.(find|aggregate|findOne|countDocuments|findById|updateOne|updateMany|create)/g, 'InquiryModel.$1');
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

console.log('Fixing model conflicts in apps/web/src...');
walkDir(path.join(rootDir, 'apps/web/src'), processFile);
console.log('Done.');

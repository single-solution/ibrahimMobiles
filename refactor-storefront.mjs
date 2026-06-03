import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname); // Workspace root

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      // Avoid node_modules, .next, etc
      if (!['node_modules', '.next', '.git'].includes(f)) {
        walkDir(dirPath, callback);
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css') || f.endsWith('.md')) {
      callback(dirPath);
    }
  });
}

const replacements = [
  // Remove "as StorefrontX" imports
  ['Product as StorefrontProduct', 'Product'],
  ['Brand as StorefrontBrand', 'Brand'],
  ['Offer as StorefrontOffer', 'Offer'],
  ['type Product as StorefrontProductType', 'type Product'],

  // Core type renames
  ['StorefrontVariant', 'Variant'],
  ['StorefrontOrder', 'Order'],
  ['StorefrontOrderItem', 'OrderItem'],
  ['StorefrontOrderTotals', 'OrderTotals'],
  ['StorefrontOrderTimelineEntry', 'OrderTimelineEntry'],
  ['StorefrontAttributeFacet', 'AttributeFacet'],
  ['StorefrontFacetOption', 'FacetOption'],
  ['StorefrontSort', 'SortOption'],
  ['StorefrontProductPage', 'ProductPage'],
  
  // Wait, if we replace "StorefrontProduct", but already replaced "Product as StorefrontProduct", we might have leftover references
  ['StorefrontProduct', 'Product'],
  ['StorefrontBrand', 'Brand'],
  ['StorefrontOffer', 'Offer'],
  ['StorefrontProductType', 'Product'],

  // Function renames
  ['toStorefrontBrand', 'toBrand'],
  ['toStorefrontAttribute', 'toAttribute'],
  ['toStorefrontVariant', 'toVariant'],
  ['toStorefrontProduct', 'toProduct'],
  ['toStorefrontOffer', 'toOffer'],
  ['toStorefrontGrade', 'toGrade'],
  ['toStorefrontOrder', 'toOrder'],
  ['toStorefrontThread', 'toThread'],
  ['summariseStorefrontThread', 'summariseThread'],
  ['fetchStorefrontProductLiveCommerce', 'fetchProductLiveCommerce'],
  ['getStorefrontProductById', 'getProductById'],
  ['loadStorefrontProductBySlug', 'loadProductBySlug'],
  ['loadStorefrontBrandBySlug', 'loadBrandBySlug'],
  ['getStorefrontOffersCached', 'getOffersCached'],
  ['getStorefrontFacets', 'getFacets'],
  ['getStorefrontBrands', 'getBrands'],
  ['getStorefrontBrandBySlug', 'getBrandBySlug'],
  ['getStorefrontProductBySlug', 'getProductBySlug'],
  ['getStorefrontOffers', 'getOffers'],
  ['getStorefrontCategories', 'getCategories'],
  ['getStorefrontGrades', 'getGrades'],
  ['getStorefrontGradeCounts', 'getGradeCounts'],
  ['getStorefrontAttributes', 'getAttributes'],

  // Other contextual ones
  ['isStorefrontSort', 'isSortOption'],
  ['ProductStorefrontToggle', 'ProductVisibilityToggle'],
  ['storefrontUrl', 'publicSiteUrl'],
  ['Storefront login', 'Customer login'], // Customer detail panel context
  ['storefront-main', 'app-main'],
  ['StorefrontReferenceContext', 'ReferenceContext'],
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const [search, replace] of replacements) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    newContent = newContent.replace(regex, replace);
  }

  // Also replace some case-insensitive exact word matches for "storefront" in comments if we want, but let's be safe and only do exact tokens.

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

console.log('Replacing strings across workspace...');
walkDir(path.join(rootDir, 'apps/admin/src'), processFile);
walkDir(path.join(rootDir, 'apps/web/src'), processFile);
walkDir(path.join(rootDir, 'packages/shared/src'), processFile);
walkDir(path.join(rootDir, 'packages/db/src'), processFile);

console.log('Done.');

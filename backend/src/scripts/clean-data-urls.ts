/**
 * Migration script: Remove base64 data URL images from product documents.
 * Data URLs (starting with "data:") are massive strings that bloat MongoDB
 * documents, slow down queries, and cannot be served as real URLs.
 *
 * This script strips them from:
 *   - product.images[]
 *   - product.variants[].images[]
 *   - product.variantTypeImages.{material,color,size/unit}[]
 *
 * Usage:  npx ts-node src/scripts/clean-data-urls.ts [--dry-run]
 */

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/machinichi';
const DRY_RUN = process.argv.includes('--dry-run');

function isDataUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('data:');
}

async function run() {
  console.log(`[clean-data-urls] Connecting to ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[clean-data-urls] Connected.');

  const Product = mongoose.connection.collection('products');

  // Find products that have any data URL images
  const products = await Product.find({
    $or: [
      { 'images.url': { $regex: '^data:' } },
      { 'variants.images.url': { $regex: '^data:' } },
      { 'variantTypeImages.material.url': { $regex: '^data:' } },
      { 'variantTypeImages.color.url': { $regex: '^data:' } },
      { 'variantTypeImages.size.url': { $regex: '^data:' } },
      { 'variantTypeImages.unit.url': { $regex: '^data:' } },
    ],
  }).toArray();

  console.log(`[clean-data-urls] Found ${products.length} products with data URL images.`);

  let cleaned = 0;
  for (const product of products) {
    let changed = false;

    // Clean product.images
    if (Array.isArray(product.images)) {
      const before = product.images.length;
      product.images = product.images.filter((img: any) => !isDataUrl(img.url));
      if (product.images.length !== before) changed = true;
    }

    // Clean variants images
    if (Array.isArray(product.variants)) {
      product.variants = product.variants.map((v: any) => {
        if (Array.isArray(v.images)) {
          const before = v.images.length;
          v.images = v.images.filter((img: any) => !isDataUrl(img.url));
          if (v.images.length !== before) changed = true;
        }
        return v;
      });
    }

    // Clean variantTypeImages
    if (product.variantTypeImages && typeof product.variantTypeImages === 'object') {
      for (const key of ['material', 'color', 'size', 'unit']) {
        const arr = (product.variantTypeImages as any)[key];
        if (Array.isArray(arr)) {
          const before = arr.length;
          (product.variantTypeImages as any)[key] = arr.filter((img: any) => !isDataUrl(img.url));
          if ((product.variantTypeImages as any)[key].length !== before) changed = true;
        }
      }
    }

    if (changed) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would clean: ${product.name || product._id}`);
      } else {
        await Product.updateOne(
          { _id: product._id },
          { $set: { images: product.images, variants: product.variants, variantTypeImages: product.variantTypeImages } }
        );
        console.log(`[cleaned] ${product.name || product._id}`);
      }
      cleaned++;
    }
  }

  console.log(`[clean-data-urls] ${DRY_RUN ? 'Would clean' : 'Cleaned'} ${cleaned} products.`);
  await mongoose.disconnect();
  console.log('[clean-data-urls] Done.');
}

run().catch((err) => {
  console.error('[clean-data-urls] Error:', err);
  process.exit(1);
});

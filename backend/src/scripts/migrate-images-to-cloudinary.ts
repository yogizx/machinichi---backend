/**
 * Enterprise image migration: local /uploads files → Cloudinary.
 *
 * Re-scans every Product, Category and Banner and rewrites any image URL that
 * points at the old local file server (e.g. http://localhost:3000/uploads/…,
 * http://<host>/uploads/…, /uploads/…) to a public Cloudinary CDN URL by
 * uploading the actual file from backend/uploads into Cloudinary.
 *
 * Why: images uploaded before Cloudinary integration were stored on the
 * application server's local disk, which other users/browsers cannot reach.
 *
 * Usage (from backend/):
 *   npm run migrate:cloudinary                    # migrate everything
 *   npm run migrate:cloudinary -- --dry-run        # preview without writing
 *   npm run migrate:cloudinary -- --only=products  # products only
 *   npm run migrate:cloudinary -- --only=categories
 *   npm run migrate:cloudinary -- --only=banners
 *
 * Idempotent: already-migrated assets (public_id exists) are reused.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { cloudinary, isCloudinaryConfigured, CLOUDINARY_FOLDERS } from '../config/cloudinary';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Banner } from '../models/Banner';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1] || 'all';
const only = onlyArg.toLowerCase();

const uploadsDir = path.join(__dirname, '../../uploads');
const skipped: string[] = [];
let uploadedCount = 0;
let lookupCount = 0;

function isLocalUploadUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url) return false;
  if (url.includes('res.cloudinary.com') || url.startsWith('data:')) return false;
  return /\/uploads\/[^/?#\s]+/i.test(url);
}

function extractFilename(url: string): string | null {
  const m = url.match(/\/uploads\/([^/?#\s]+)/i);
  return m ? m[1] : null;
}

async function ensureRemote(filename: string, folder: string): Promise<string | null> {
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    skipped.push(`${filename} (file missing in ${uploadsDir})`);
    return null;
  }
  const fullPublicId = `${folder}/${filename}`;
  try {
    if (dryRun) return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${fullPublicId}`;
    const res = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: filename,
      overwrite: false,
      resource_type: 'auto',
      invalidate: true,
    });
    uploadedCount++;
    return res.secure_url;
  } catch (err: any) {
    // Asset already exists with the same public id → reuse it.
    try {
      const existing = await cloudinary.api.resource(fullPublicId);
      lookupCount++;
      return (existing as any).secure_url;
    } catch {
      skipped.push(`${filename} (upload failed: ${err?.message || err})`);
      return null;
    }
  }
}

async function resolveUrls(urls: string[], folder: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const seen = new Set<string>();
  for (const url of urls) {
    if (!isLocalUploadUrl(url) || seen.has(url)) continue;
    seen.add(url);
    const filename = extractFilename(url);
    if (!filename) continue;
    const remote = await ensureRemote(filename, folder);
    if (remote) map.set(url, remote);
  }
  return map;
}

function collectProductUrls(p: any): string[] {
  const urls = new Set<string>();
  const add = (u: unknown) => {
    if (typeof u === 'string') urls.add(u);
  };
  (p.images || []).forEach((img: any) => add(img?.url));
  (p.images360 || []).forEach((img: any) => add(img?.url));
  add(p.thumbnail);
  (p.variants || []).forEach((v: any) => (v.images || []).forEach((img: any) => add(img?.url)));
  ['material', 'color', 'size', 'unit'].forEach((k) => {
    (p.variantTypeImages?.[k] || []).forEach((img: any) => add(img?.url));
  });
  return [...urls];
}

async function migrateProducts(): Promise<number> {
  const products = await Product.find({});
  const urls = new Set<string>();
  for (const p of products) collectProductUrls(p.toObject()).forEach((u) => urls.add(u));
  const remoteMap = await resolveUrls([...urls], CLOUDINARY_FOLDERS.products);

  let changed = 0;
  for (const p of products) {
    let did = false;
    const rewriteArr = (arr: any[] | undefined) =>
      (arr || []).forEach((img: any) => {
        if (img && img.url) {
          const nu = remoteMap.get(img.url);
          if (nu && nu !== img.url) {
            img.url = nu;
            did = true;
          }
        }
      });

    rewriteArr(p.images);
    if (p.images) p.markModified('images');
    rewriteArr(p.images360);
    if (p.images360) p.markModified('images360');

    if (p.thumbnail) {
      const nu = remoteMap.get(p.thumbnail);
      if (nu && nu !== p.thumbnail) {
        p.thumbnail = nu;
        did = true;
      }
    }

    ['material', 'color', 'size', 'unit'].forEach((k) => {
      if (p.variantTypeImages?.[k]) {
        rewriteArr(p.variantTypeImages[k]);
        p.markModified(`variantTypeImages.${k}`);
      }
    });

    (p.variants || []).forEach((v: any) => rewriteArr(v.images));
    if (p.variants) p.markModified('variants');

    if (did) {
      changed++;
      if (!dryRun) await p.save();
    }
  }
  return changed;
}

async function migrateCategories(): Promise<number> {
  const categories = await Category.find({});
  const urls = new Set<string>();
  for (const c of categories) if (typeof c.image === 'string') urls.add(c.image);
  const remoteMap = await resolveUrls([...urls], CLOUDINARY_FOLDERS.categories);

  let changed = 0;
  for (const c of categories) {
    if (c.image) {
      const nu = remoteMap.get(c.image);
      if (nu && nu !== c.image) {
        c.image = nu;
        changed++;
        if (!dryRun) await c.save();
      }
    }
  }
  return changed;
}

async function migrateBanners(): Promise<number> {
  const banners = await Banner.find({});
  const urls = new Set<string>();
  for (const b of banners) {
    for (const k of ['imageWebp', 'imageFallback', 'image', 'imageUrl']) {
      const v = (b as any)[k];
      if (typeof v === 'string') urls.add(v);
    }
  }
  const remoteMap = await resolveUrls([...urls], CLOUDINARY_FOLDERS.banners);

  let changed = 0;
  for (const b of banners) {
    const doc: any = b;
    let did = false;
    for (const k of ['imageWebp', 'imageFallback', 'image', 'imageUrl']) {
      if (typeof doc[k] === 'string') {
        const nu = remoteMap.get(doc[k]);
        if (nu && nu !== doc[k]) {
          doc[k] = nu;
          did = true;
        }
      }
    }
    if (did) {
      changed++;
      if (!dryRun) await b.save();
    }
  }
  return changed;
}

async function main() {
  if (!isCloudinaryConfigured) {
    console.error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in backend/.env');
    process.exit(1);
  }

  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI missing from backend/.env');
    process.exit(1);
  }

  console.log(`[MIGRATE] mode=${dryRun ? 'DRY-RUN' : 'LIVE'} scope=${only || 'all'} cloud=${process.env.CLOUDINARY_CLOUD_NAME}`);
  mongoose.set('autoIndex', false);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 } as any);

  let totalChanged = 0;
  if (only === 'all' || only === 'products') {
    const n = await migrateProducts();
    console.log(`[MIGRATE] products updated: ${n}`);
    totalChanged += n;
  }
  if (only === 'all' || only === 'categories') {
    const n = await migrateCategories();
    console.log(`[MIGRATE] categories updated: ${n}`);
    totalChanged += n;
  }
  if (only === 'all' || only === 'banners') {
    const n = await migrateBanners();
    console.log(`[MIGRATE] banners updated: ${n}`);
    totalChanged += n;
  }

  console.log(`[MIGRATE] total docs updated: ${totalChanged}`);
  console.log(`[MIGRATE] assets uploaded: ${uploadedCount}, reused existing: ${lookupCount}`);
  if (skipped.length) {
    console.warn(`[MIGRATE] skipped ${skipped.length} file(s):`);
    skipped.forEach((s) => console.warn('  - ' + s));
  }

  await mongoose.disconnect();
  console.log('[MIGRATE] done.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[MIGRATE] fatal error:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
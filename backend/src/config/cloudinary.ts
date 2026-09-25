import dotenv from 'dotenv';
// Ensure env vars are available even when this module is imported before
// server.ts calls dotenv.config() (ES module imports evaluate first).
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';

/**
 * Enterprise Cloudinary media hub.
 *
 * All product, category, banner and inventory images are stored on
 * Cloudinary (not on the application server's local disk), so the stored
 * URLs are public and resolvable from any machine/browser. When Cloudinary
 * credentials are missing (e.g. fresh local dev), we transparently fall back
 * to the legacy local-disk storage so nothing breaks.
 */

export const CLOUDINARY_FOLDERS = {
  products: 'machinichi/products',
  categories: 'machinichi/categories',
  banners: 'machinichi/banners',
  brands: 'machinichi/brands',
  users: 'machinichi/users/avatars',
  reviews: 'machinichi/reviews',
  returns: 'machinichi/returns',
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS] | string;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

cloudinary.config({
  cloud_name: CLOUD_NAME || 'di4nfc7fg',
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const DEFAULT_TRANSFORMATION = [
  { width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
];

/**
 * Build a Cloudinary-backed multer storage engine for a given folder.
 * Uploads are automatically optimised (dimension-capped, auto-quality,
 * auto-format) at ingestion time for a consistent enterprise asset store.
 */
export function createCloudinaryStorage(folder: CloudinaryFolder): CloudinaryStorage {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'],
      transformation: DEFAULT_TRANSFORMATION,
    } as any,
  });
}

// Ready-made storages per content type.
export const productImageStorage = createCloudinaryStorage(CLOUDINARY_FOLDERS.products);
export const categoryImageStorage = createCloudinaryStorage(CLOUDINARY_FOLDERS.categories);
export const bannerImageStorage = createCloudinaryStorage(CLOUDINARY_FOLDERS.banners);

/**
 * Legacy local-disk storage. Kept as the fallback engine so the platform
 * still works when Cloudinary is not configured, and so pipelines that need
 * a real file path on disk (banner sharp processing) are unaffected.
 */
export const diskImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export { cloudinary };
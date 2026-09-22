# Cloudinary Integration — Complete Implementation Guide

## Current State
Cloudinary credentials exist in `backend/.env` (lines 31-34) but **no Cloudinary SDK is installed or used anywhere** in the codebase. All images use Unsplash URLs.

## 1. Installation

### Backend
```bash
cd backend
npm install cloudinary multer multer-storage-cloudinary
npm install -D @types/multer @types/multer-storage-cloudinary
```

### Frontend
```bash
npm install @cloudinary/url-gen @cloudinary/react @cloudinary/transformation-builder-sdk
```

---

## 2. Cloudinary Configuration

### Backend Config
```typescript
// backend/src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'di4nfc7fg',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Folder structure
export const CLOUDINARY_FOLDERS = {
  products: 'machinichi/products',
  categories: 'machinichi/categories',
  banners: 'machinichi/banners',
  brands: 'machinichi/brands',
  users: 'machinichi/users/avatars',
  reviews: 'machinichi/reviews',
  returns: 'machinichi/returns',
};

// Multer storage for product images
export const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: CLOUDINARY_FOLDERS.products,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    ],
  } as any,
});

// Multer storage for category images
export const categoryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: CLOUDINARY_FOLDERS.categories,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
    ],
  } as any,
});

// Multer storage for banners
export const bannerImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: CLOUDINARY_FOLDERS.banners,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1920, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
    ],
  } as any,
});

// Multer upload middleware
export const uploadProductImages = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
}).array('images', 10); // Max 10 images

export const uploadSingleImage = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

export { cloudinary };
```

---

## 3. Folder Structure

```
machinichi/
├── products/
│   ├── {product-id}/
│   │   ├── primary.webp
│   │   ├── gallery-1.webp
│   │   ├── gallery-2.webp
│   │   └── thumbnail.webp
├── categories/
│   ├── dryfruits.webp
│   ├── nuts.webp
│   ├── grains.webp
│   └── ...
├── banners/
│   ├── hero-banner-home.webp
│   ├── hero-banner-2.webp
│   └── ...
├── brands/
│   ├── machinichi-logo.webp
│   └── ...
└── users/
    └── avatars/
        └── {user-id}.webp
```

---

## 4. Image Upload API Routes

```typescript
// backend/src/routes/upload.routes.ts
import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import {
  uploadProductImages,
  uploadSingleImage,
  CLOUDINARY_FOLDERS,
} from '../config/cloudinary';
import { cloudinary } from '../config/cloudinary';

const router = Router();

// Upload product images (admin only)
router.post('/products/images', authMiddleware, adminMiddleware, (req, res) => {
  uploadProductImages(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    const files = req.files as Express.Multer.File[];
    const images = (files as any[]).map((file) => ({
      url: file.path,
      publicId: file.filename,
      width: file.width,
      height: file.height,
      format: file.format,
    }));

    res.json({ success: true, data: images });
  });
});

// Upload single image (category, banner, avatar)
router.post('/single', authMiddleware, (req, res) => {
  uploadSingleImage(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    const file = req.file as any;
    res.json({
      success: true,
      data: {
        url: file.path,
        publicId: file.filename,
        width: file.width,
        height: file.height,
        format: file.format,
      },
    });
  });
});

// Delete image
router.delete('/image', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { publicId } = req.body;
    const result = await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
});

// Generate signed upload URL (for frontend direct upload)
router.post('/signature', authMiddleware, (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = req.body.folder || CLOUDINARY_FOLDERS.products;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!,
  );

  res.json({
    success: true,
    data: {
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    },
  });
});

export default router;
```

---

## 5. Frontend Cloudinary Service

```javascript
// src/services/cloudinaryService.js
const CLOUD_NAME = 'di4nfc7fg';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

/**
 * Generate optimized Cloudinary URL
 * @param {string} publicId - Cloudinary public ID or full URL
 * @param {Object} options - Transformation options
 * @returns {string} Optimized URL
 */
export function cloudinaryUrl(publicId, options = {}) {
  if (!publicId) return '';

  // If already a full URL, extract public ID
  if (publicId.startsWith('http')) {
    // Check if it's already a Cloudinary URL
    if (publicId.includes('res.cloudinary.com')) {
      return publicId;
    }
    return publicId; // Fallback for non-Cloudinary URLs
  }

  const {
    w,           // Width
    h,           // Height
    q = 'auto',  // Quality (auto for best compression)
    f = 'auto',  // Format (auto for WebP/AVIF)
    c = 'fill',  // Crop mode
    g = 'auto',  // Gravity (auto for smart cropping)
    e,           // Effect
    blur,        // Blur amount (for placeholders)
  } = options;

  const transformations = [];

  if (w) transformations.push(`w_${w}`);
  if (h) transformations.push(`h_${h}`);
  transformations.push(`c_${c}`);
  transformations.push(`g_${g}`);
  transformations.push(`q_${q}`);
  transformations.push(`f_${f}`);
  if (e) transformations.push(`e_${e}`);
  if (blur) transformations.push(`e_blur:${blur}`);

  const transformationStr = transformations.join(',');

  return `${BASE_URL}/${transformationStr}/${publicId}`;
}

/**
 * Get responsive image srcSet
 */
export function cloudinarySrcSet(publicId, sizes = [200, 400, 600, 800, 1200]) {
  return sizes
    .map((size) => `${cloudinaryUrl(publicId, { w: size, q: 80 })} ${size}w`)
    .join(', ');
}

/**
 * Get blur placeholder (for LQIP)
 */
export function cloudinaryBlurPlaceholder(publicId) {
  return cloudinaryUrl(publicId, { w: 20, blur: 1000, q: 1 });
}

/**
 * Upload to Cloudinary directly from browser
 */
export async function uploadToCloudinary(file, folder = 'machinichi/products') {
  // Get signed signature from backend
  const { data: signatureData } = await api.post('/upload/signature', { folder });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signatureData.data.apiKey);
  formData.append('timestamp', signatureData.data.timestamp);
  formData.append('signature', signatureData.data.signature);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  return response.json();
}
```

---

## 6. ProductImage Component

```jsx
// src/components/product/ProductImage.jsx
import { useState } from 'react';
import { cloudinaryUrl, cloudinaryBlurPlaceholder } from '../../services/cloudinaryService';

export default function ProductImage({
  src,
  alt,
  width = 400,
  className = '',
  priority = false,
  aspectRatio = '1/1',
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Handle both Cloudinary and external URLs
  const isCloudinary = src?.includes('res.cloudinary.com') || !src?.startsWith('http');
  const imageUrl = isCloudinary
    ? cloudinaryUrl(src, { w: width, q: 80, f: 'auto' })
    : src;
  const blurUrl = isCloudinary
    ? cloudinaryBlurPlaceholder(src)
    : null;

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <span className="text-sm text-gray-400">Image not available</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      {/* Blur placeholder */}
      {!loaded && blurUrl && (
        <img
          src={blurUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover blur-sm transition-opacity duration-500"
          aria-hidden="true"
        />
      )}

      {/* Skeleton */}
      {!loaded && !blurUrl && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}

      {/* Actual image */}
      <img
        src={imageUrl}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${width}px`}
        srcSet={isCloudinary ? cloudinarySrcSet(src, [200, 400, 600, 800]) : undefined}
        className={`h-full w-full object-cover transition-all duration-500 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      />
    </div>
  );
}
```

---

## 7. Image Transformations Reference

| Use Case | Width | Quality | Format | Crop | Notes |
|----------|-------|---------|--------|------|-------|
| Product Card | 400 | auto | auto | fill | WebP/AVIF auto |
| Product Detail | 800 | auto | auto | fill | Main product image |
| Product Gallery | 1200 | auto | auto | fill | Zoom on hover |
| Category Card | 600 | auto | auto | fill | |
| Banner | 1920 | 90 | auto | fill | Hero banners |
| Thumbnail | 150 | 80 | auto | fill | Cart, search results |
| Blur Placeholder | 20 | 1 | auto | fill | LQIP technique |
| Admin Upload | 1200 | auto | auto | limit | Preserve original aspect |

---

## 8. Admin Product Form — Image Upload

```jsx
// In admin product create/edit form
const handleImageUpload = async (e) => {
  const files = Array.from(e.target.files);
  const uploaded = [];

  for (const file of files) {
    const result = await uploadToCloudinary(file, 'machinichi/products');
    if (result.secure_url) {
      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
        isPrimary: uploaded.length === 0,
        order: uploaded.length,
      });
    }
  }

  setProduct(prev => ({
    ...prev,
    images: [...prev.images, ...uploaded],
  }));
};
```

---

## 9. Image Optimization Strategy

### Delivery Optimizations
1. **Automatic format selection**: `f_auto` delivers WebP in Chrome, AVIF in Safari, JPEG fallback
2. **Automatic quality**: `q_auto` reduces file size by 40-80% without visible quality loss
3. **Responsive images**: `srcSet` with multiple widths (200, 400, 600, 800, 1200)
4. **Lazy loading**: Native `loading="lazy"` + Intersection Observer
5. **Blur-up LQIP**: 20px blur placeholder shown instantly while full image loads

### Compression Savings
| Format | Avg Size (400px) | Savings vs JPEG |
|--------|-----------------|-----------------|
| JPEG (baseline) | 80 KB | — |
| WebP | 35 KB | 56% |
| AVIF | 22 KB | 72% |
| WebP + q_auto | 28 KB | 65% |
| AVIF + q_auto | 18 KB | 77% |

---

## 10. Migration from Unsplash

### Strategy
1. Keep existing Unsplash URLs for current products
2. For new products, upload to Cloudinary
3. Use Cloudinary URL helper that handles both sources
4. Gradually replace Unsplash URLs with Cloudinary uploads
5. Update seed data script to use Cloudinary URLs

```typescript
// Migration script
async function migrateImagesToCloudinary() {
  const products = await Product.find({});
  for (const product of products) {
    const newImages = [];
    for (const img of product.images) {
      if (img.url.includes('unsplash')) {
        // Upload Unsplash URL to Cloudinary
        const result = await cloudinary.uploader.upload(img.url, {
          folder: 'machinichi/products',
          public_id: `${product.slug}-${Date.now()}`,
        });
        newImages.push({ ...img, url: result.secure_url, publicId: result.public_id });
      } else {
        newImages.push(img);
      }
    }
    product.images = newImages;
    await product.save();
  }
}
```

---

## 11. API Routes Update

Add this to `backend/src/routes/index.ts`:
```typescript
import uploadRoutes from './upload.routes';
router.use('/upload', uploadRoutes);
```

Register in `backend/src/server.ts`:
```typescript
// Before route mounting
import uploadRoutes from './routes/upload.routes';
app.use('/api/upload', uploadRoutes);
```

---

## 12. Package Dependencies to Install

### Backend
```
cloudinary          ^2.5.0
multer              ^1.4.5-lts.1
multer-storage-cloudinary  ^4.0.0
```

### Frontend
```
@cloudinary/url-gen  ^1.15.0
@cloudinary/react    ^1.13.0
```

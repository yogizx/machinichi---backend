import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from '../controllers/banner.controller';
import upload from '../middlewares/upload.middleware';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const router = Router();

// Public route to fetch only active banners
router.get('/active', getActiveBanners);

// Protected Admin CRUD operations
router.get('/all', authMiddleware, adminMiddleware, getAllBanners);
router.get('/:id', getBannerById);
router.post('/', authMiddleware, adminMiddleware, createBanner);
router.put('/:id', authMiddleware, adminMiddleware, updateBanner);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBanner);

// Secure bulk reorder route
router.patch('/reorder', authMiddleware, adminMiddleware, reorderBanners);

// Secure image uploader that processes uploaded images to WebP and JPEG fallback formats
router.post(
  '/upload',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const uploadsDir = path.join(__dirname, '../../uploads');
      
      // Ensure the uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      
      const webpFilename = `${timestamp}-${random}-optimized.webp`;
      const fallbackFilename = `${timestamp}-${random}-fallback.jpg`;

      const webpPath = path.join(uploadsDir, webpFilename);
      const fallbackPath = path.join(uploadsDir, fallbackFilename);

      // Process and optimize WebP copy using sharp (resizing to recommended 1920x800)
      await sharp(req.file.path)
        .resize({
          width: 1920,
          height: 800,
          fit: 'cover',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(webpPath);

      // Process and optimize JPEG fallback copy using sharp
      await sharp(req.file.path)
        .resize({
          width: 1920,
          height: 800,
          fit: 'cover',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(fallbackPath);

      // Securely delete the original temporary multer upload file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const base = process.env.API_URL || process.env.PUBLIC_URL || 'http://localhost:3000';
      const imageWebp = `${base.replace(/\/$/, '')}/uploads/${webpFilename}`;
      const imageFallback = `${base.replace(/\/$/, '')}/uploads/${fallbackFilename}`;

      return res.json({
        success: true,
        imageWebp,
        imageFallback
      });
    } catch (err: any) {
      console.error(`[UPLOAD PROCESSING ERROR] ${err.message}`);
      
      // Attempt cleanup on failure
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }

      return res.status(500).json({
        success: false,
        message: `Image optimization failed: ${err.message}`
      });
    }
  }
);

export default router;

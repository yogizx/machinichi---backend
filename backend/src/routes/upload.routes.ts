import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import upload from '../middlewares/upload.middleware';
import pdfUpload from '../middlewares/pdfUpload.middleware';
import { isCloudinaryConfigured, CLOUDINARY_FOLDERS } from '../config/cloudinary';

const router = Router();

// Always build the public URL from a fixed, configured origin — never from
// the incoming request's Host header. Using req.get('host') meant an upload
// made while someone's browser/frontend pointed at a dev backend (e.g.
// localhost:5000) would permanently bake that unreachable host into the
// stored URL in MongoDB, breaking the image in every other environment.
const PUBLIC_UPLOAD_ORIGIN = (process.env.API_URL || process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

// When Cloudinary is enabled (enterprise default) the multer file.path is an
// absolute, publicly-accessible res.cloudinary.com URL. Otherwise we fall
// back to the legacy local /uploads static path.
function resolvePublicUrl(file: Express.Multer.File): string {
  if (file && file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }
  return `${PUBLIC_UPLOAD_ORIGIN}/uploads/${file?.filename}`;
}

router.post(
  '/',
  authMiddleware,
  authorize('admin', 'super_admin'),
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const url = resolvePublicUrl(req.file);
    res.json({
      success: true,
      url,
      ...(isCloudinaryConfigured
        ? {
            publicId: (req.file as any).filename,
            provider: 'cloudinary',
            folder: CLOUDINARY_FOLDERS.products,
          }
        : { provider: 'local' }),
    });
  },
);

router.post(
  '/pdf',
  authMiddleware,
  authorize('admin', 'super_admin'),
  pdfUpload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const url = `${PUBLIC_UPLOAD_ORIGIN}/uploads/${req.file.filename}`;
    res.json({
      success: true,
      name: req.file.originalname,
      size: req.file.size,
      url,
      uploadedAt: new Date().toISOString(),
    });
  },
);

export default router;
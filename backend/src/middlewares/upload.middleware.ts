import multer from 'multer';
import path from 'path';
import { isCloudinaryConfigured, productImageStorage, diskImageStorage } from '../config/cloudinary';

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg|avif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split('/')[1]);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Only image files (jpg, png, gif, webp, svg, avif) are allowed'));
};

// Enterprise image storage: store on Cloudinary when configured, otherwise
// fall back to the legacy local-disk uploads folder.
const imageStorage = isCloudinaryConfigured ? productImageStorage : diskImageStorage;

const upload = multer({
  storage: imageStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Disk-only variant (banner route needs a real local path for sharp).
const uploadDisk = multer({
  storage: diskImageStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
export { uploadDisk };
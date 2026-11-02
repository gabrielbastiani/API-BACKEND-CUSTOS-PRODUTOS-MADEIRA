import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { uploadDirPath } from './storage';

const allowedExtensions: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirPath);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const extension = path.extname(file.originalname).toLowerCase();
  const extensionsForMime = allowedExtensions[file.mimetype];

  if (!extensionsForMime || !extensionsForMime.includes(extension)) {
    cb(new Error('Tipo de arquivo não permitido. Envie imagens JPEG, PNG, WEBP ou GIF.'));
    return;
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
});

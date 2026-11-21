import { unlink } from 'node:fs/promises';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { requireAdmin } from './accounts.js';
import { config } from './config.js';
import { rows, transaction } from './db.js';
import { conflict, HttpError, invalid, notFound } from './http.js';
import { imageFilename, imagePath, imagePrefix, maxImageBytes, saveImage } from './image-storage.js';

export const publicImages = Router();
publicImages.get('/:filename', (req, res, next) => {
  if (!imageFilename.test(req.params.filename)) notFound();
  res.sendFile(imagePath(req.params.filename), { dotfiles: 'deny', maxAge: 0, headers: {
    'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff',
  } }, error => {
    if (error) next(error);
  });
});

const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: maxImageBytes, files: 1, fields: 0, parts: 1,
} }).single('file');

export const adminImages = Router();
adminImages.use(requireAdmin);
adminImages.post('/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Túl sok képfeltöltés. Próbáld később.' } },
}), (req, res, next) => {
  upload(req, res, error => {
    if (error instanceof multer.MulterError) {
      return next(new HttpError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 422,
        error.code === 'LIMIT_FILE_SIZE' ? 'image_too_large' : 'invalid_upload',
        error.code === 'LIMIT_FILE_SIZE' ? 'A kép legfeljebb 10 MiB lehet.' : 'Egyetlen kép küldhető a file mezőben.'));
    }
    if (error) return next(new HttpError(422, 'invalid_upload', 'A képfeltöltés nem dolgozható fel.'));
    next();
  });
}, async (req, res) => {
  if (!req.file) invalid('Adj meg egy képfájlt a file mezőben.');
  const image = await saveImage(req.file.buffer);
  res.status(201).location(image.url).json(image);
});

adminImages.delete('/:filename', async (req, res) => {
  const filename = String(req.params.filename);
  const path = imagePath(filename);
  const url = imagePrefix + filename;
  await transaction(async db => {
    const [reference] = await rows(db, 'SELECT id FROM product_images WHERE url IN (?, ?) LIMIT 1',
      [url, config.origin + url]);
    if (reference) conflict('A képet még termék használja. Előbb távolítsd el a termék galériájából.');
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') notFound();
      throw error;
    }
  }, { mediaLock: true });
  res.sendStatus(204);
});

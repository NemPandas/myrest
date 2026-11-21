import { randomUUID } from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { config } from './config.js';
import { HttpError, invalid, notFound } from './http.js';

export const imagePrefix = '/api/media/images/';
export const imageFilename = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;
export const maxImageBytes = 10 * 1024 * 1024;

export function imagePath(filename: string) {
  if (!imageFilename.test(filename)) notFound();
  return join(config.uploadDir, filename);
}

// Called while holding the same database lock used by image deletion.
export async function validateStoredImages(images: { url: string }[]) {
  for (const { url } of images) {
    const parsed = new URL(url, config.origin);
    if (parsed.origin !== config.origin || !parsed.pathname.startsWith(imagePrefix)) continue;
    const filename = parsed.pathname.slice(imagePrefix.length);
    if (!imageFilename.test(filename) || parsed.search || parsed.hash ||
        ![imagePrefix + filename, config.origin + imagePrefix + filename].includes(url)) {
      invalid('Érvénytelen feltöltöttkép-URL.');
    }
    try {
      await access(imagePath(filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      invalid('A feltöltött kép már nem található.');
    }
  }
}

export async function saveImage(buffer: Buffer) {
  if (buffer.length > maxImageBytes) throw new HttpError(413, 'image_too_large', 'A kép legfeljebb 10 MiB lehet.');
  let output;
  try {
    const image = sharp(buffer, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
      throw new Error('Unsupported image');
    }
    output = await image.rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  } catch {
    throw new HttpError(422, 'invalid_image', 'Érvényes, nem animált JPEG, PNG vagy WebP kép szükséges, legfeljebb 40 megapixel méretben.');
  }
  const filename = randomUUID() + '.webp';
  await mkdir(config.uploadDir, { recursive: true });
  const path = imagePath(filename);
  try {
    await writeFile(path, output.data, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') await unlink(path).catch(() => {});
    throw error;
  }
  return { filename, url: imagePrefix + filename, width: output.info.width, height: output.info.height,
    size: output.info.size, mime_type: 'image/webp' };
}

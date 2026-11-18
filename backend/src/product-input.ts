import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const unsigned = z.number().int().min(0).max(4294967295);
const webUrl = z.url({ protocol: /^https?$/ }).max(2048);
const imageUrl = z.union([webUrl, z.string().max(2048).regex(/^\/(?!\/)[^\\\s]+$/)]);

export const slugSchema = z.string().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const productState = z.enum(['draft', 'published']);
export const versionBody = z.strictObject({ version: unsigned.min(1) });

const image = z.strictObject({
  url: imageUrl,
  alt_text: text(255),
  sort_order: unsigned.optional(),
});

const variant = z.strictObject({
  code: text(80).regex(/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/).toUpperCase(),
  color_name: text(100),
  color_hex: z.string().regex(/^#[a-fA-F0-9]{6}$/).nullable().default(null),
  sort_order: unsigned.optional(),
  active: z.boolean().default(true),
});

const variantList = z.array(variant).max(100).refine(
  values => new Set(values.map(value => value.code)).size === values.length,
  'A változatkódoknak egyedieknek kell lenniük.',
);

const productFields = z.strictObject({
  name: text(180),
  model_code: text(80),
  slug: slugSchema,
  massage_level: text(40).nullable().optional(),
  summary: text(500).nullable().optional(),
  description: text(16000).nullable().optional(),
  features: z.array(text(250)).max(100).nullable().optional(),
  specifications: z.array(z.strictObject({ name: text(120), value: text(500) })).max(100).nullable().optional(),
  source_url: webUrl.nullable().optional(),
  seo_title: text(180).nullable().optional(),
  seo_description: text(320).nullable().optional(),
  gross_price_huf: unsigned.min(1).nullable().optional(),
  sort_order: unsigned.optional(),
  images: z.array(image).max(100).optional(),
  variants: variantList.optional(),
});

export const createProductBody = productFields;
export const updateProductBody = productFields.partial().extend(versionBody.shape)
  .refine(value => Object.keys(value).length > 1, 'Adj meg legalább egy módosítandó mezőt.');

export type ProductInput = z.infer<typeof createProductBody> | Omit<z.infer<typeof updateProductBody>, 'version'>;

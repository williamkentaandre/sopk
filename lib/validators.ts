import { z } from 'zod';

export const settingsSchema = z.object({
  hl: z.string().min(1).max(5).nullable().optional(),
  gl: z.string().min(1).max(5).nullable().optional(),
});

export const pairSchema = z.object({
  keyword: z.string().min(1).max(500),
  url: z.string().min(1).max(2000), // Supprimer .url() pour être plus permissif
});

export const createPairsSchema = z.object({
  pairs: z.array(pairSchema).min(1).max(100),
});

export const updatePairSchema = z.object({
  keyword: z.string().min(1).max(500).optional(),
  url: z.string().url().max(2000).optional(),
}).refine(data => data.keyword || data.url, {
  message: "At least one field must be provided",
});

export const trackSchema = z.object({
  hl: z.string().min(2).max(5).optional(),
  gl: z.string().min(2).max(5).optional(),
  /** When true, API returns `diagnostic` with organic rows per page (not saved in DB). */
  diagnostic: z.boolean().optional(),
});

export const batchTrackSchema = z.object({
  pair_ids: z.array(z.string()).optional(),
  hl: z.string().min(2).max(5).optional(),
  gl: z.string().min(2).max(5).optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
  order: z.enum(['asc', 'desc']).nullable().optional().default('desc'),
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).optional().default('csv'),
  pair_ids: z.string().nullable().optional(),
  max_points: z.coerce.number().int().min(1).max(500).optional().default(100),
});


import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(100),
  priceCents: z.number().int().min(1).max(100000000),
  stock: z.number().int().min(0).max(1000000),
}).strict();

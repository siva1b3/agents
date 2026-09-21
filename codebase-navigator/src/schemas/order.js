import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  }).strict()).min(1).max(20),
}).strict().superRefine(({ items }, ctx) => {
  const seen = new Set();
  items.forEach((item, index) => {
    if (seen.has(item.productId)) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'productId'], message: 'Duplicate product' });
    }
    seen.add(item.productId);
  });
});

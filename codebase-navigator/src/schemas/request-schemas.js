import { z } from 'zod';

const emailAddress = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(128);
const displayName = z.string().trim().min(1).max(100);
export const identifierParametersSchema = z.object({ identifier: z.string().uuid() }).strict();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const registrationSchema = z.object({
  displayName, email: emailAddress, password,
}).strict();
export const loginSchema = z.object({ email: emailAddress, password }).strict();
export const profileUpdateSchema = z.object({ displayName }).strict();
export const passwordChangeSchema = z.object({
  currentPassword: password,
  newPassword: password,
}).strict().refine(value => value.currentPassword !== value.newPassword, {
  path: ['newPassword'], message: 'New password must differ from the current password',
});
export const accountDeactivationSchema = z.object({ password }).strict();

export const productCreationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(''),
  category: z.string().trim().toLowerCase().min(1).max(50),
  priceCents: z.number().int().min(1).max(100000000),
  stockQuantity: z.number().int().min(0).max(1000000),
}).strict();
export const productUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().toLowerCase().min(1).max(50).optional(),
  priceCents: z.number().int().min(1).max(100000000).optional(),
  expectedVersion: z.number().int().min(1),
}).strict().refine(value => Object.keys(value).length > 1, { message: 'At least one product field is required' });
export const stockAdjustmentSchema = z.object({
  adjustmentQuantity: z.number().int().min(-1000000).max(1000000).refine(value => value !== 0),
  reason: z.string().trim().min(1).max(200),
  expectedVersion: z.number().int().min(1),
}).strict();
export const versionSchema = z.object({ expectedVersion: z.number().int().min(1) }).strict();
export const productQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().toLowerCase().max(50).optional(),
  sort: z.enum(['name', 'priceCents', 'createdAt']).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

export const orderCreationSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  }).strict()).min(1).max(20),
}).strict().superRefine(({ items }, context) => {
  const productIdentifiers = new Set();
  items.forEach((item, index) => {
    if (productIdentifiers.has(item.productId)) {
      context.addIssue({
        code: 'custom', path: ['items', index, 'productId'],
        message: 'Each product may appear only once',
      });
    }
    productIdentifiers.add(item.productId);
  });
});
export const orderStatusSchema = z.object({
  status: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled']),
}).strict();
export const orderQuerySchema = paginationSchema.extend({
  status: z.enum(['placed', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
});

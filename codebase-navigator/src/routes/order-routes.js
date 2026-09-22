import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request.js';
import { requirePermission } from '../middleware/require-permission.js';
import { requireIdempotencyKey } from '../middleware/require-idempotency-key.js';
import {
  identifierParametersSchema, orderCreationSchema, orderQuerySchema, orderStatusSchema,
} from '../schemas/request-schemas.js';

export function createOrderRouter({ controller, authenticateRequest }) {
  const router = Router();
  router.use(authenticateRequest);
  router.get('/', requirePermission('orders:read-own'), validateRequest(orderQuerySchema, 'query'), controller.listOrders);
  router.post('/', requirePermission('orders:create'), requireIdempotencyKey,
    validateRequest(orderCreationSchema), controller.createOrder);
  router.get('/:identifier', requirePermission('orders:read-own'),
    validateRequest(identifierParametersSchema, 'params'), controller.getOrder);
  router.post('/:identifier/cancel', requirePermission('orders:cancel-own'),
    validateRequest(identifierParametersSchema, 'params'), controller.cancelOrder);
  router.patch('/:identifier/status', requirePermission('orders:manage'),
    validateRequest(identifierParametersSchema, 'params'), validateRequest(orderStatusSchema), controller.updateOrderStatus);
  return router;
}

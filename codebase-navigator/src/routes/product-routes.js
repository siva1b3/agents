import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request.js';
import { requirePermission } from '../middleware/require-permission.js';
import {
  identifierParametersSchema, productQuerySchema, productCreationSchema,
  productUpdateSchema, stockAdjustmentSchema, versionSchema,
} from '../schemas/request-schemas.js';

export function createProductRouter({ controller, authenticateRequest }) {
  const router = Router();
  router.get('/', validateRequest(productQuerySchema, 'query'), controller.listProducts);
  router.get('/:identifier', validateRequest(identifierParametersSchema, 'params'), controller.getProduct);
  router.use(authenticateRequest, requirePermission('products:manage'));
  router.post('/', validateRequest(productCreationSchema), controller.createProduct);
  router.patch('/:identifier', validateRequest(identifierParametersSchema, 'params'),
    validateRequest(productUpdateSchema), controller.updateProduct);
  router.post('/:identifier/stock-adjustments', validateRequest(identifierParametersSchema, 'params'),
    validateRequest(stockAdjustmentSchema), controller.adjustStock);
  router.delete('/:identifier', validateRequest(identifierParametersSchema, 'params'),
    validateRequest(versionSchema), controller.archiveProduct);
  return router;
}

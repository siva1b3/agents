import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request.js';
import { requirePermission } from '../middleware/require-permission.js';
import { paginationSchema } from '../schemas/request-schemas.js';

export function createAdministrationRouter({ controller, authenticateRequest }) {
  const router = Router();
  router.use(authenticateRequest);
  router.get('/users', requirePermission('users:read-all'), validateRequest(paginationSchema, 'query'), controller.listUsers);
  router.get('/audit-events', requirePermission('audit:read'), validateRequest(paginationSchema, 'query'), controller.listAuditEvents);
  router.get('/metrics', requirePermission('audit:read'), controller.getMetrics);
  return router;
}

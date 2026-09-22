import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request.js';
import { profileUpdateSchema, passwordChangeSchema, accountDeactivationSchema } from '../schemas/request-schemas.js';

export function createUserRouter({ controller, authenticateRequest, authenticationRateLimiter }) {
  const router = Router();
  router.use(authenticateRequest);
  router.get('/me', controller.getProfile);
  router.patch('/me', validateRequest(profileUpdateSchema), controller.updateProfile);
  router.post('/me/password', authenticationRateLimiter, validateRequest(passwordChangeSchema), controller.changePassword);
  router.post('/me/deactivate', authenticationRateLimiter, validateRequest(accountDeactivationSchema), controller.deactivateAccount);
  return router;
}

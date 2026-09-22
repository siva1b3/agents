import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request.js';
import { registrationSchema, loginSchema } from '../schemas/request-schemas.js';

export function createAuthenticationRouter({ controller, authenticateRequest, authenticationRateLimiter }) {
  const router = Router();
  router.post('/register', authenticationRateLimiter, validateRequest(registrationSchema), controller.register);
  router.post('/login', authenticationRateLimiter, validateRequest(loginSchema), controller.login);
  router.post('/logout', authenticateRequest, controller.logout);
  router.post('/logout-all', authenticateRequest, controller.logoutAll);
  return router;
}

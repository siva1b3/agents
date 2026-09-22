import express from 'express';
import { readConfiguration } from './configuration/environment.js';
import { createMemoryRepositories } from './repositories/memory-repositories.js';
import { createStructuredLogger } from './observability/structured-logger.js';
import { createAuditService } from './services/audit-service.js';
import { createUserService } from './services/user-service.js';
import { createAuthenticationService } from './services/authentication-service.js';
import { createProductService } from './services/product-service.js';
import { createOrderService } from './services/order-service.js';
import { createAuthenticationController } from './controllers/authentication-controller.js';
import { createUserController } from './controllers/user-controller.js';
import { createProductController } from './controllers/product-controller.js';
import { createOrderController } from './controllers/order-controller.js';
import { createAdministrationController } from './controllers/administration-controller.js';
import { createAuthenticationRouter } from './routes/authentication-routes.js';
import { createUserRouter } from './routes/user-routes.js';
import { createProductRouter } from './routes/product-routes.js';
import { createOrderRouter } from './routes/order-routes.js';
import { createAdministrationRouter } from './routes/administration-routes.js';
import { createAuthenticateRequest } from './middleware/authenticate-request.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createRequestContext } from './middleware/request-context.js';
import { createHttpSecurity } from './middleware/http-security.js';
import { createErrorHandler, handleRouteNotFound } from './middleware/error-handler.js';
import { seedDemonstrationData } from './data/seed-demonstration-data.js';
import { ApplicationError } from './errors/application-error.js';

export async function createApplication({
  configuration = readConfiguration(), logger = createStructuredLogger(), clock = Date.now,
} = {}) {
  const repositories = createMemoryRepositories(configuration);
  const metrics = { startedAt: clock(), completedRequests: 0, serverErrors: 0 };
  const lifecycle = { ready: false };
  const auditService = createAuditService({ repositories, clock });
  const userService = createUserService({ repositories, auditService, clock });
  const authenticationService = await createAuthenticationService({ repositories, auditService, configuration, clock });
  const productService = createProductService({ repositories, auditService, clock });
  const orderService = createOrderService({ repositories, productService, auditService, configuration, clock });
  const services = { auditService, userService, authenticationService, productService, orderService };

  if (configuration.seedDemoData) await seedDemonstrationData(services);
  const authenticateRequest = createAuthenticateRequest(authenticationService);
  const authenticationRateLimiter = createRateLimiter({ maximumRequests: configuration.authenticationLimitPerMinute, clock });
  const application = express();
  application.disable('x-powered-by');
  application.set('trust proxy', false);
  application.set('query parser', 'simple');
  application.locals.context = { repositories, services, lifecycle, metrics };
  application.use(createRequestContext({ logger, metrics, clock }));
  application.use(createHttpSecurity(configuration));
  application.get('/health/live', (request, response) => response.json({ status: 'alive' }));
  application.get('/health/ready', (request, response) => {
    response.status(lifecycle.ready ? 200 : 503).json({ status: lifecycle.ready ? 'ready' : 'draining' });
  });
  application.use((request, response, next) => {
    if (!lifecycle.ready) throw new ApplicationError(503, 'SERVER_DRAINING', 'Server is shutting down');
    next();
  });
  application.use(createRateLimiter({ maximumRequests: configuration.requestLimitPerMinute, clock }));
  application.use(express.json({ limit: configuration.bodySizeLimit }));
  application.use('/api/v1/auth', createAuthenticationRouter({
    controller: createAuthenticationController(services), authenticateRequest, authenticationRateLimiter,
  }));
  application.use('/api/v1/users', createUserRouter({
    controller: createUserController(services), authenticateRequest, authenticationRateLimiter,
  }));
  application.use('/api/v1/products', createProductRouter({
    controller: createProductController(services), authenticateRequest,
  }));
  application.use('/api/v1/orders', createOrderRouter({
    controller: createOrderController(services), authenticateRequest,
  }));
  application.use('/api/v1/admin', createAdministrationRouter({
    controller: createAdministrationController({ ...services, metrics, clock }), authenticateRequest,
  }));
  application.use(handleRouteNotFound);
  application.use(createErrorHandler(logger));
  lifecycle.ready = true;
  return application;
}

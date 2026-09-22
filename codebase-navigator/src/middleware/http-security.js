import { ApplicationError } from '../errors/application-error.js';

export function createHttpSecurity(configuration) {
  const allowedMethods = 'GET, POST, PATCH, DELETE, OPTIONS';
  const allowedHeaders = 'Content-Type, Authorization, Idempotency-Key';

  return function applyHttpSecurity(request, response, next) {
    response.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    const origin = request.get('origin');
    response.vary('Origin');
    if (origin) {
      if (!configuration.allowedOrigins.includes(origin)) {
        throw new ApplicationError(403, 'ORIGIN_NOT_ALLOWED', 'This browser origin is not allowed');
      }
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Access-Control-Expose-Headers', 'X-Request-Id, Idempotency-Replayed, Retry-After');
    }
    if (request.method === 'OPTIONS') {
      response.set('Access-Control-Allow-Methods', allowedMethods);
      response.set('Access-Control-Allow-Headers', allowedHeaders);
      return response.sendStatus(204);
    }
    if (['POST', 'PATCH', 'PUT'].includes(request.method) &&
        (request.get('content-length') !== undefined || request.get('transfer-encoding')) &&
        request.get('content-length') !== '0' && !request.is('application/json')) {
      throw new ApplicationError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Request bodies must use application/json');
    }
    next();
  };
}

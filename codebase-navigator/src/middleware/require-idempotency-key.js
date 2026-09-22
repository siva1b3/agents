import { ApplicationError } from '../errors/application-error.js';

export function requireIdempotencyKey(request, response, next) {
  const idempotencyKey = request.get('idempotency-key');
  if (!idempotencyKey || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) {
    throw new ApplicationError(400, 'INVALID_IDEMPOTENCY_KEY',
      'Idempotency-Key must contain 8 to 128 letters, digits, underscores, or hyphens');
  }
  request.idempotencyKey = idempotencyKey;
  next();
}

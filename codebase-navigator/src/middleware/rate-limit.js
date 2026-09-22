import { ApplicationError } from '../errors/application-error.js';

export function createRateLimiter({ maximumRequests, clock, windowMilliseconds = 60000 }) {
  const requestWindows = new Map();
  const maximumTrackedAddresses = 10000;
  return function limitRequests(request, response, next) {
    const now = clock();
    for (const [address, window] of requestWindows) {
      if (window.resetAt <= now) requestWindows.delete(address);
    }
    // trust proxy remains false: callers cannot bypass limits using forwarded headers.
    const address = request.ip;
    let window = requestWindows.get(address);
    if (!window) {
      if (requestWindows.size >= maximumTrackedAddresses) {
        throw new ApplicationError(503, 'RATE_LIMIT_CAPACITY_REACHED', 'Request admission is temporarily unavailable');
      }
      window = { count: 0, resetAt: now + windowMilliseconds };
      requestWindows.set(address, window);
    }
    window.count += 1;
    response.set('X-RateLimit-Limit', String(maximumRequests));
    response.set('X-RateLimit-Remaining', String(Math.max(0, maximumRequests - window.count)));
    if (window.count > maximumRequests) {
      response.set('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
      throw new ApplicationError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests; retry later');
    }
    next();
  };
}

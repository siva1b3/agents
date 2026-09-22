import { randomUUID } from 'node:crypto';

export function createRequestContext({ logger, metrics, clock }) {
  return function attachRequestContext(request, response, next) {
    // Generate our own identifier rather than logging arbitrary client input.
    request.requestId = randomUUID();
    response.set('X-Request-Id', request.requestId);
    const startedAt = clock();
    response.on('finish', () => {
      metrics.completedRequests += 1;
      if (response.statusCode >= 500) metrics.serverErrors += 1;
      logger.info({
        event: 'http.request_completed', requestId: request.requestId,
        method: request.method,
        route: request.route ? request.baseUrl + request.route.path : 'unmatched',
        statusCode: response.statusCode, durationMilliseconds: Math.max(0, clock() - startedAt),
      });
    });
    next();
  };
}

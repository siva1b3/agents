import { ApplicationError } from '../errors/application-error.js';

export function handleRouteNotFound(request, response, next) {
  next(new ApplicationError(404, 'ROUTE_NOT_FOUND', 'Route not found'));
}

export function createErrorHandler(logger) {
  // All four arguments are required for Express to recognize error middleware.
  return function handleApplicationError(error, request, response, next) {
    if (response.headersSent) return next(error);
    let applicationError = error;
    if (error.type === 'entity.parse.failed') {
      applicationError = new ApplicationError(400, 'INVALID_JSON', 'Request body contains invalid JSON');
    } else if (error.type === 'entity.too.large') {
      applicationError = new ApplicationError(413, 'BODY_TOO_LARGE', 'Request body exceeds the size limit');
    } else if (error.status === 415) {
      applicationError = new ApplicationError(415, 'UNSUPPORTED_ENCODING', 'Request body encoding is unsupported');
    } else if (error instanceof URIError) {
      applicationError = new ApplicationError(400, 'INVALID_URL', 'URL contains invalid encoding');
    }
    if (!(applicationError instanceof ApplicationError)) {
      // Avoid leaking request contents, credentials or internal exception messages.
      logger.error({ event: 'http.unexpected_error', requestId: request.requestId, errorType: error.name });
      applicationError = new ApplicationError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
    if (applicationError.statusCode === 401) response.set('WWW-Authenticate', 'Bearer');
    response.status(applicationError.statusCode).json({
      error: {
        code: applicationError.code, message: applicationError.message,
        ...(applicationError.details ? { details: applicationError.details } : {}),
      },
      requestId: request.requestId,
    });
  };
}

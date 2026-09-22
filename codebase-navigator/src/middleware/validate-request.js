import { ApplicationError } from '../errors/application-error.js';

export function validateRequest(schema, source = 'body') {
  return function validateSelectedRequestPart(request, response, next) {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      throw new ApplicationError(400, 'VALIDATION_FAILED', 'Request validation failed',
        result.error.issues.map(issue => ({ source, field: issue.path.join('.'), message: issue.message })));
    }
    // Express 5 query is a getter; validated/coerced input has its own namespace.
    request.validated ??= {};
    request.validated[source] = result.data;
    next();
  };
}

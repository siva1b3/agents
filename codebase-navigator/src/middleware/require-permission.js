import { ApplicationError } from '../errors/application-error.js';
import { hasPermission } from '../security/role-permissions.js';

export function requirePermission(permission) {
  return function authorizeRequest(request, response, next) {
    if (!request.authenticatedUser || !hasPermission(request.authenticatedUser, permission)) {
      throw new ApplicationError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this operation');
    }
    next();
  };
}

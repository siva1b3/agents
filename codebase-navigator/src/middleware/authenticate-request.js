import { ApplicationError } from '../errors/application-error.js';

export function createAuthenticateRequest(authenticationService) {
  return function authenticateRequest(request, response, next) {
    const authorizationHeader = request.get('authorization') ?? '';
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorizationHeader);
    if (!match) {
      throw new ApplicationError(401, 'AUTHENTICATION_REQUIRED', 'A bearer session token is required');
    }
    const authentication = authenticationService.authenticateToken(match[1]);
    request.authenticatedUser = authentication.user;
    request.sessionTokenHash = authentication.tokenHash;
    next();
  };
}

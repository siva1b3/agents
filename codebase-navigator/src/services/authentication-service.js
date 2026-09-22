import { ApplicationError } from '../errors/application-error.js';
import { hashPassword, verifyPassword } from '../security/password-hasher.js';
import { createSessionToken, hashSessionToken } from '../security/session-token.js';
import { serializeUser } from './user-service.js';

export async function createAuthenticationService({ repositories, auditService, configuration, clock }) {
  // Unknown accounts still perform a password derivation to reduce timing differences.
  const dummyPasswordHash = await hashPassword(createSessionToken());

  function rejectCredentials() {
    throw new ApplicationError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  return {
    async login(input, requestId) {
      const initialUser = repositories.users.findByEmail(input.email);
      const passwordMatches = await verifyPassword(input.password, initialUser?.passwordHash ?? dummyPasswordHash);
      const currentUser = initialUser && repositories.users.findById(initialUser.id);
      if (!passwordMatches || !currentUser || currentUser.status !== 'active' ||
          currentUser.passwordHash !== initialUser.passwordHash) {
        auditService.recordEvent('authentication.failed', null, null, requestId);
        rejectCredentials();
      }
      const token = createSessionToken();
      const expiresAt = clock() + configuration.sessionLifetimeMilliseconds;
      repositories.sessions.deleteExpired(clock());
      repositories.sessions.save({ tokenHash: hashSessionToken(token), userId: currentUser.id, expiresAt });
      auditService.recordEvent('authentication.succeeded', currentUser.id, currentUser.id, requestId);
      return { accessToken: token, tokenType: 'Bearer', expiresAt: new Date(expiresAt).toISOString(), user: serializeUser(currentUser) };
    },
    authenticateToken(token) {
      const tokenHash = hashSessionToken(token);
      const session = repositories.sessions.findByTokenHash(tokenHash);
      const user = session && repositories.users.findById(session.userId);
      if (!session || session.expiresAt <= clock() || !user || user.status !== 'active') {
        repositories.sessions.deleteByTokenHash(tokenHash);
        throw new ApplicationError(401, 'AUTHENTICATION_REQUIRED', 'A valid, unexpired bearer token is required');
      }
      return { user: serializeUser(user), tokenHash };
    },
    logout(tokenHash, userId, requestId) {
      repositories.sessions.deleteByTokenHash(tokenHash);
      auditService.recordEvent('authentication.logged_out', userId, userId, requestId);
    },
    logoutAll(userId, requestId) {
      repositories.sessions.deleteByUserId(userId);
      auditService.recordEvent('authentication.all_sessions_revoked', userId, userId, requestId);
    },
  };
}

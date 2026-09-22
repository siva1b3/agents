import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../errors/application-error.js';
import { hashPassword, verifyPassword } from '../security/password-hasher.js';

// An explicit allowlist keeps credentials out of every HTTP response.
export function serializeUser(user) {
  return {
    id: user.id, displayName: user.displayName, email: user.email,
    role: user.role, status: user.status, createdAt: user.createdAt,
  };
}

export function createUserService({ repositories, auditService, clock }) {
  function requireUser(userId) {
    const user = repositories.users.findById(userId);
    if (!user) throw new ApplicationError(404, 'USER_NOT_FOUND', 'User not found');
    return user;
  }

  async function verifyCurrentPassword(userId, password) {
    const user = requireUser(userId);
    const verified = await verifyPassword(password, user.passwordHash);
    const currentUser = requireUser(userId);
    if (!verified || currentUser.status !== 'active' || currentUser.passwordHash !== user.passwordHash) {
      throw new ApplicationError(401, 'INVALID_CREDENTIALS', 'Current credentials are invalid');
    }
    return currentUser;
  }

  return {
    requireUser,
    async registerUser(input, requestId, role = 'customer') {
      const passwordHash = await hashPassword(input.password);
      // Recheck after awaiting hashing so concurrent registration cannot duplicate an email.
      if (repositories.users.findByEmail(input.email)) {
        throw new ApplicationError(409, 'EMAIL_ALREADY_REGISTERED', 'Email already registered');
      }
      const user = repositories.users.save({
        id: randomUUID(), displayName: input.displayName, email: input.email,
        passwordHash, role, status: 'active', createdAt: new Date(clock()).toISOString(),
      });
      auditService.recordEvent('user.registered', user.id, user.id, requestId);
      return serializeUser(user);
    },
    updateProfile(userId, input, requestId) {
      const user = requireUser(userId);
      user.displayName = input.displayName;
      repositories.users.save(user);
      auditService.recordEvent('user.profile_updated', userId, userId, requestId);
      return serializeUser(user);
    },
    async changePassword(userId, input, requestId) {
      const verifiedUser = await verifyCurrentPassword(userId, input.currentPassword);
      const newPasswordHash = await hashPassword(input.newPassword);
      const currentUser = requireUser(userId);
      if (currentUser.status !== 'active' || currentUser.passwordHash !== verifiedUser.passwordHash) {
        throw new ApplicationError(409, 'ACCOUNT_CHANGED', 'Account changed; authenticate again');
      }
      currentUser.passwordHash = newPasswordHash;
      repositories.users.save(currentUser);
      repositories.sessions.deleteByUserId(userId);
      auditService.recordEvent('user.password_changed', userId, userId, requestId);
    },
    async deactivateAccount(userId, password, requestId) {
      const user = await verifyCurrentPassword(userId, password);
      user.status = 'inactive';
      repositories.users.save(user);
      repositories.sessions.deleteByUserId(userId);
      auditService.recordEvent('user.deactivated', userId, userId, requestId);
    },
    listUsers() { return repositories.users.findAll().map(serializeUser); },
  };
}

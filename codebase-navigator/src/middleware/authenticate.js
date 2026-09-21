import { userRepository } from '../repositories/users.js';
import { AppError } from '../errors/app-error.js';

// Learning fixture: a user ID acts as a token. This is mock authentication.
export function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer (\S+)$/.exec(authorization);
  const user = match && userRepository.findById(match[1]);
  if (!user) throw new AppError(401, 'Valid Bearer user ID required');
  req.user = user;
  next();
}

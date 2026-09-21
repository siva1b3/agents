import { randomUUID } from 'node:crypto';
import { userRepository } from '../repositories/users.js';
import { AppError } from '../errors/app-error.js';

export function createUser(data) {
  const email = data.email.toLowerCase();
  if (userRepository.findByEmail(email)) {
    throw new AppError(409, 'Email already registered');
  }
  return userRepository.save({ id: randomUUID(), ...data, email });
}

export function findUser(id) {
  const user = userRepository.findById(id);
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

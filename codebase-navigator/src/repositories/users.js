import { store } from '../data/store.js';

export const userRepository = {
  save(user) { store.users.set(user.id, user); return user; },
  findById(id) { return store.users.get(id); },
  findByEmail(email) {
    return [...store.users.values()].find(user => user.email === email);
  },
};

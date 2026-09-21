import { store } from '../data/store.js';

export const orderRepository = {
  save(order) { store.orders.set(order.id, order); return order; },
  findById(id) { return store.orders.get(id); },
  listByUser(userId) {
    return [...store.orders.values()].filter(order => order.userId === userId);
  },
};

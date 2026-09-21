import { store } from '../data/store.js';

export const productRepository = {
  save(product) { store.products.set(product.id, product); return product; },
  findById(id) { return store.products.get(id); },
  list() { return [...store.products.values()]; },
};

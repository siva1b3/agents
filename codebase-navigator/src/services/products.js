import { randomUUID } from 'node:crypto';
import { productRepository } from '../repositories/products.js';
import { AppError } from '../errors/app-error.js';

export function createProduct(data) {
  return productRepository.save({ id: randomUUID(), ...data });
}

export function getProduct(id) {
  const product = productRepository.findById(id);
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export function listProducts() {
  return productRepository.list();
}

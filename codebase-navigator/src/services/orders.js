import { randomUUID } from 'node:crypto';
import { orderRepository } from '../repositories/orders.js';
import { getProduct } from './products.js';
import { AppError } from '../errors/app-error.js';

export function createOrder(userId, { items }) {
  // Validate all inventory before changing any stock.
  const lines = items.map(({ productId, quantity }) => {
    const product = getProduct(productId);
    if (product.stock < quantity) throw new AppError(409, 'Insufficient stock');
    return { product, quantity };
  });
  const orderItems = lines.map(({ product, quantity }) => ({
    productId: product.id, name: product.name, unitPriceCents: product.priceCents, quantity,
  }));
  const order = {
    id: randomUUID(), userId, status: 'placed', items: orderItems,
    totalCents: orderItems.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0),
    createdAt: new Date().toISOString(),
  };
  // Synchronous in-memory operations; no awaits between validation and mutation.
  lines.forEach(({ product, quantity }) => { product.stock -= quantity; });
  return orderRepository.save(order);
}

export function getOrder(id, userId) {
  const order = orderRepository.findById(id);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.userId !== userId) throw new AppError(403, 'Order belongs to another user');
  return order;
}

export function listOrders(userId) {
  return orderRepository.listByUser(userId);
}

export function cancelOrder(id, userId) {
  const order = getOrder(id, userId);
  if (order.status === 'cancelled') throw new AppError(409, 'Order already cancelled');
  order.items.forEach(item => { getProduct(item.productId).stock += item.quantity; });
  order.status = 'cancelled';
  return orderRepository.save(order);
}

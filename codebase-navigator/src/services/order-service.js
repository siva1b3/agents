import { createHash, randomUUID } from 'node:crypto';
import { ApplicationError } from '../errors/application-error.js';
import { hasPermission } from '../security/role-permissions.js';
import { paginateRecords } from './pagination.js';

export const allowedOrderTransitions = Object.freeze({
  placed: Object.freeze(['confirmed', 'cancelled']),
  confirmed: Object.freeze(['shipped', 'cancelled']),
  shipped: Object.freeze(['delivered']),
  delivered: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export function createOrderService({ repositories, productService, auditService, configuration, clock }) {
  function requireAccessibleOrder(orderId, actor) {
    const order = repositories.orders.findById(orderId);
    if (!order) throw new ApplicationError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.customerId !== actor.id && !hasPermission(actor, 'orders:read-all')) {
      throw new ApplicationError(403, 'ORDER_ACCESS_DENIED', 'This order belongs to another customer');
    }
    return order;
  }

  function transitionOrder(order, nextStatus, actor, requestId) {
    if (!allowedOrderTransitions[order.status].includes(nextStatus)) {
      throw new ApplicationError(409, 'INVALID_ORDER_TRANSITION',
        'Cannot transition an order from ' + order.status + ' to ' + nextStatus);
    }
    const timestamp = new Date(clock()).toISOString();
    if (nextStatus === 'cancelled') {
      // Archived products still exist so their reserved inventory can be restored.
      const restoredProducts = order.items.map(item => {
        const product = productService.requireProduct(item.productId, true);
        product.stockQuantity += item.quantity;
        if (product.stockQuantity > 1000000) {
          throw new ApplicationError(409, 'STOCK_CAPACITY_EXCEEDED',
            'Cancellation would exceed inventory capacity; adjust inventory first');
        }
        product.version += 1;
        product.updatedAt = timestamp;
        return product;
      });
      restoredProducts.forEach(product => repositories.products.save(product));
    }
    order.status = nextStatus;
    order.updatedAt = timestamp;
    order.statusHistory.push({ status: nextStatus, changedAt: timestamp, actorId: actor.id });
    const savedOrder = repositories.orders.save(order);
    auditService.recordEvent('order.status_changed', actor.id, order.id, requestId, { status: nextStatus });
    return savedOrder;
  }

  return {
    requireAccessibleOrder,
    createOrder(actor, input, idempotencyKey, requestId) {
      const now = clock();
      repositories.idempotency.deleteExpired(now);
      const scopedKey = actor.id + ':orders:create:' + idempotencyKey;
      // Normalize item order so semantically identical retries have the same fingerprint.
      const canonicalItems = [...input.items].sort((left, right) => left.productId.localeCompare(right.productId));
      const fingerprint = createHash('sha256').update(JSON.stringify(canonicalItems)).digest('hex');
      const previousRequest = repositories.idempotency.findByKey(scopedKey);
      if (previousRequest) {
        if (previousRequest.fingerprint !== fingerprint) {
          throw new ApplicationError(409, 'IDEMPOTENCY_CONFLICT', 'This key was already used for different order items');
        }
        return { order: previousRequest.response, replayed: true };
      }
      if (repositories.idempotency.count() >= configuration.maximumIdempotencyRecords) {
        throw new ApplicationError(503, 'IDEMPOTENCY_CAPACITY_REACHED', 'Order creation is temporarily unavailable');
      }

      // Validate every line BEFORE changing any inventory.
      const inventoryReservations = input.items.map(item => {
        const product = productService.requireProduct(item.productId);
        if (product.stockQuantity < item.quantity) {
          throw new ApplicationError(409, 'INSUFFICIENT_STOCK', 'Insufficient stock for ' + product.name);
        }
        return { product, quantity: item.quantity };
      });
      const orderItems = inventoryReservations.map(({ product, quantity }) => ({
        productId: product.id, productName: product.name,
        unitPriceCents: product.priceCents, quantity,
        lineTotalCents: product.priceCents * quantity,
      }));
      const timestamp = new Date(now).toISOString();
      const order = {
        id: randomUUID(), customerId: actor.id, status: 'placed', items: orderItems,
        totalCents: orderItems.reduce((total, item) => total + item.lineTotalCents, 0),
        createdAt: timestamp, updatedAt: timestamp,
        statusHistory: [{ status: 'placed', changedAt: timestamp, actorId: actor.id }],
      };
      // No await within this critical section: one Node process cannot interleave
      // another request here. A real database needs a transaction and unique key.
      for (const { product, quantity } of inventoryReservations) {
        product.stockQuantity -= quantity;
        product.version += 1;
        product.updatedAt = timestamp;
        repositories.products.save(product);
      }
      repositories.orders.save(order);
      repositories.idempotency.save(scopedKey, {
        fingerprint, response: order, expiresAt: now + configuration.idempotencyLifetimeMilliseconds,
      });
      auditService.recordEvent('order.created', actor.id, order.id, requestId, { totalCents: order.totalCents });
      return { order, replayed: false };
    },
    listOrders(actor, query) {
      const orders = repositories.orders.findAll().filter(order =>
        (order.customerId === actor.id || hasPermission(actor, 'orders:read-all')) &&
        (!query.status || order.status === query.status));
      orders.sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id));
      return paginateRecords(orders, query);
    },
    cancelOrder(orderId, actor, requestId) {
      const order = requireAccessibleOrder(orderId, actor);
      return transitionOrder(order, 'cancelled', actor, requestId);
    },
    updateOrderStatus(orderId, nextStatus, actor, requestId) {
      if (!hasPermission(actor, 'orders:manage')) {
        throw new ApplicationError(403, 'PERMISSION_DENIED', 'Order management permission is required');
      }
      return transitionOrder(requireAccessibleOrder(orderId, actor), nextStatus, actor, requestId);
    },
  };
}

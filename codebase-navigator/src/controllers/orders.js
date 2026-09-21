import * as orders from '../services/orders.js';

export function createOrder(req, res) {
  res.status(201).json(orders.createOrder(req.user.id, req.validatedBody));
}

export function getOrder(req, res) {
  res.json(orders.getOrder(req.params.id, req.user.id));
}

export function listOrders(req, res) {
  res.json(orders.listOrders(req.user.id));
}

export function cancelOrder(req, res) {
  res.json(orders.cancelOrder(req.params.id, req.user.id));
}

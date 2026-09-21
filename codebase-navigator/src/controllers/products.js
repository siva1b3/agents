import * as products from '../services/products.js';

export function createProduct(req, res) {
  res.status(201).json(products.createProduct(req.validatedBody));
}

export function getProduct(req, res) {
  res.json(products.getProduct(req.params.id));
}

export function listProducts(req, res) {
  res.json(products.listProducts());
}

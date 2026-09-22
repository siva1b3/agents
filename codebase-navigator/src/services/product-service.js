import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../errors/application-error.js';
import { paginateRecords } from './pagination.js';

export function createProductService({ repositories, auditService, clock }) {
  function requireProduct(productId, includeArchived = false) {
    const product = repositories.products.findById(productId);
    if (!product || (!includeArchived && product.archivedAt)) {
      throw new ApplicationError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return product;
  }

  function requireCurrentVersion(product, expectedVersion) {
    if (product.version !== expectedVersion) {
      throw new ApplicationError(409, 'VERSION_CONFLICT', 'Product changed; retrieve its latest version');
    }
  }

  function saveUpdatedProduct(product) {
    product.version += 1;
    product.updatedAt = new Date(clock()).toISOString();
    return repositories.products.save(product);
  }

  return {
    requireProduct,
    createProduct(input, actorId, requestId) {
      const timestamp = new Date(clock()).toISOString();
      const product = repositories.products.save({
        ...input, id: randomUUID(), version: 1, archivedAt: null,
        createdAt: timestamp, updatedAt: timestamp,
      });
      auditService.recordEvent('product.created', actorId, product.id, requestId);
      return product;
    },
    listProducts(query) {
      const products = repositories.products.findAll().filter(product =>
        !product.archivedAt &&
        (!query.category || product.category === query.category) &&
        (!query.search || product.name.toLowerCase().includes(query.search.toLowerCase())));
      products.sort((left, right) => {
        const leftValue = left[query.sort];
        const rightValue = right[query.sort];
        const comparison = typeof leftValue === 'number' ?
          leftValue - rightValue : leftValue.localeCompare(rightValue);
        const stableComparison = comparison || left.id.localeCompare(right.id);
        return query.direction === 'desc' ? -stableComparison : stableComparison;
      });
      return paginateRecords(products, query);
    },
    updateProduct(productId, input, actorId, requestId) {
      const product = requireProduct(productId);
      requireCurrentVersion(product, input.expectedVersion);
      const { expectedVersion, ...changes } = input;
      Object.assign(product, changes);
      const updatedProduct = saveUpdatedProduct(product);
      auditService.recordEvent('product.updated', actorId, productId, requestId);
      return updatedProduct;
    },
    adjustStock(productId, input, actorId, requestId) {
      const product = requireProduct(productId);
      requireCurrentVersion(product, input.expectedVersion);
      const resultingQuantity = product.stockQuantity + input.adjustmentQuantity;
      if (resultingQuantity < 0 || resultingQuantity > 1000000) {
        throw new ApplicationError(409, 'INVALID_STOCK_ADJUSTMENT', 'Resulting stock must be between zero and one million');
      }
      product.stockQuantity = resultingQuantity;
      const updatedProduct = saveUpdatedProduct(product);
      auditService.recordEvent('product.stock_adjusted', actorId, productId, requestId, {
        adjustmentQuantity: input.adjustmentQuantity, reason: input.reason,
      });
      return updatedProduct;
    },
    archiveProduct(productId, expectedVersion, actorId, requestId) {
      const product = requireProduct(productId);
      requireCurrentVersion(product, expectedVersion);
      product.archivedAt = new Date(clock()).toISOString();
      saveUpdatedProduct(product);
      auditService.recordEvent('product.archived', actorId, productId, requestId);
    },
  };
}

export function createProductController({ productService }) {
  return {
    listProducts(request, response) {
      response.json(productService.listProducts(request.validated.query));
    },
    getProduct(request, response) {
      response.json({ data: productService.requireProduct(request.validated.params.identifier) });
    },
    createProduct(request, response) {
      const product = productService.createProduct(
        request.validated.body, request.authenticatedUser.id, request.requestId,
      );
      response.location('/api/v1/products/' + product.id).status(201).json({ data: product });
    },
    updateProduct(request, response) {
      response.json({ data: productService.updateProduct(
        request.validated.params.identifier, request.validated.body,
        request.authenticatedUser.id, request.requestId,
      ) });
    },
    adjustStock(request, response) {
      response.json({ data: productService.adjustStock(
        request.validated.params.identifier, request.validated.body,
        request.authenticatedUser.id, request.requestId,
      ) });
    },
    archiveProduct(request, response) {
      productService.archiveProduct(
        request.validated.params.identifier, request.validated.body.expectedVersion,
        request.authenticatedUser.id, request.requestId,
      );
      response.status(204).end();
    },
  };
}

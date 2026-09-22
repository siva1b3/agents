export function createOrderController({ orderService }) {
  return {
    createOrder(request, response) {
      const result = orderService.createOrder(
        request.authenticatedUser, request.validated.body, request.idempotencyKey, request.requestId,
      );
      response.set('Idempotency-Replayed', String(result.replayed));
      response.location('/api/v1/orders/' + result.order.id).status(201).json({ data: result.order });
    },
    listOrders(request, response) {
      response.json(orderService.listOrders(request.authenticatedUser, request.validated.query));
    },
    getOrder(request, response) {
      response.json({ data: orderService.requireAccessibleOrder(
        request.validated.params.identifier, request.authenticatedUser,
      ) });
    },
    cancelOrder(request, response) {
      response.json({ data: orderService.cancelOrder(
        request.validated.params.identifier, request.authenticatedUser, request.requestId,
      ) });
    },
    updateOrderStatus(request, response) {
      response.json({ data: orderService.updateOrderStatus(
        request.validated.params.identifier, request.validated.body.status,
        request.authenticatedUser, request.requestId,
      ) });
    },
  };
}

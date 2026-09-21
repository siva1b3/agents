import { Router } from 'express';
import * as controller from '../controllers/orders.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema } from '../schemas/order.js';

export const ordersRouter = Router();
ordersRouter.use(authenticate);
ordersRouter.get('/', controller.listOrders);
ordersRouter.post('/', validate(createOrderSchema), controller.createOrder);
ordersRouter.get('/:id', controller.getOrder);
ordersRouter.post('/:id/cancel', controller.cancelOrder);

import { Router } from 'express';
import * as controller from '../controllers/products.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema } from '../schemas/product.js';

export const productsRouter = Router();
productsRouter.get('/', controller.listProducts);
productsRouter.get('/:id', controller.getProduct);
productsRouter.post('/', authenticate, validate(createProductSchema), controller.createProduct);

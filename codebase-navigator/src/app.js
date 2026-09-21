import express from 'express';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/error-handler.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { config } from './config.js';

export const app = express();
app.use(express.json({ limit: config.bodyLimit }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

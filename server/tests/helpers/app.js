import express from 'express';
import categoryRoutes from '../../src/routes/category.routes.js';
import itemRoutes from '../../src/routes/item.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/categories', categoryRoutes);
  app.use('/api/items', itemRoutes);
  app.use(errorHandler);
  return app;
}

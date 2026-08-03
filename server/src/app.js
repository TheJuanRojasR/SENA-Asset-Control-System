import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { reservationCleanupService } from './services/reservationCleanup.service.js';

const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

function configureCorsOrigin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origen no permitido por CORS: ${origin}`));
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: configureCorsOrigin,
    credentials: true,
  },
});

app.set('io', io);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SENA Inventario API',
      version: '0.1.0',
      description: 'API del Sistema de Gestión de Inventario del SENA',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(helmet());
app.use(
  cors({
    origin: configureCorsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', routes);

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Cliente conectado a notificaciones:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = env.PORT;

if (env.NODE_ENV !== 'test') {
  reservationCleanupService.startScheduler();

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Documentación disponible en http://localhost:${PORT}/api-docs`);
  });
}

export { app, httpServer };

import cors from 'cors';
import express from 'express';
import { config } from './config/config';
import { errorHandler } from './middlewares/errorMiddleware';
import router from './routes/documentRoutes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/documentos', router);

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar servidor
const PORT = config.port as number;

const startServer = (port: number) => {
  try {
    const server = app.listen(port, () => {
      console.log(`Servidor iniciado na porta ${port}`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Porta ${port} já está em uso, tentando próxima porta...`);
        startServer(port + 1);
      } else {
        console.error('Erro ao iniciar o servidor:', error);
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer(PORT);

export default app;
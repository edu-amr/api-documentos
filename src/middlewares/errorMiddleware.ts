import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errorHandler';

interface MulterError extends Error {
  code?: string;
  field?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Erro:', err);
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }
  
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'JSON inválido no corpo da requisição'
    });
  }
  
  // Erros do Multer
  if (err.name === 'MulterError') {
    let message = 'Erro ao fazer upload do arquivo';
    let status = 400;
    
    if ((err as MulterError).code === 'LIMIT_FILE_SIZE') {
      message = 'Arquivo excede o tamanho máximo permitido';
    } else if ((err as MulterError).code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Campo inválido para upload. Use o campo "document" para enviar o arquivo';
    }
    
    return res.status(status).json({
      status: 'error',
      message
    });
  }
  
  return res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor'
  });
};

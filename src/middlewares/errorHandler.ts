import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import multer from 'multer';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details ?? null,
    });
  }

  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'O arquivo excede o limite de 5 MB.'
      : err.code === 'LIMIT_FILE_COUNT'
        ? 'O limite é de 10 imagens por envio.'
        : 'Não foi possível processar os arquivos enviados.';

    return res.status(statusCode).json({ success: false, message });
  }

  if (err instanceof Error && err.message.startsWith('Tipo de arquivo não permitido')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Violação de restrição única.',
        details: err.meta,
      });
    }
  }

  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor.',
  });
}
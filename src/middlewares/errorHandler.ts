import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

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
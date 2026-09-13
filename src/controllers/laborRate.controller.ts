import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export async function createLaborRate(req: Request, res: Response, next: NextFunction) {
  try {
    const laborRate = await prisma.laborRate.create({ data: req.body });
    res.status(201).json({ success: true, data: laborRate });
  } catch (error) {
    next(error);
  }
}

export async function listLaborRates(_req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await prisma.laborRate.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: rates });
  } catch (error) {
    next(error);
  }
}

export async function getLaborRate(req: Request, res: Response, next: NextFunction) {
  try {
    const rate = await prisma.laborRate.findUnique({ where: { id: req.params.id } });
    if (!rate) throw new ApiError(404, 'Tipo de mão de obra não encontrado.');
    res.json({ success: true, data: rate });
  } catch (error) {
    next(error);
  }
}

export async function updateLaborRate(req: Request, res: Response, next: NextFunction) {
  try {
    const rate = await prisma.laborRate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: rate });
  } catch (error) {
    next(error);
  }
}

export async function deleteLaborRate(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.laborRate.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
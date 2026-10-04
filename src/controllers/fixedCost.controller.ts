import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

function serializeFixedCost(item: {
  id: string;
  name: string;
  monthlyValue: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    monthlyValue: Number(item.monthlyValue),
  };
}

export async function createFixedCost(req: Request, res: Response, next: NextFunction) {
  try {
    const fixedCost = await prisma.fixedCost.create({ data: req.body });
    res.status(201).json({ success: true, data: serializeFixedCost(fixedCost) });
  } catch (error) {
    next(error);
  }
}

export async function listFixedCosts(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.fixedCost.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: items.map(serializeFixedCost) });
  } catch (error) {
    next(error);
  }
}

export async function getFixedCost(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.fixedCost.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, 'Custo fixo não encontrado.');
    res.json({ success: true, data: serializeFixedCost(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateFixedCost(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.fixedCost.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: serializeFixedCost(item) });
  } catch (error) {
    next(error);
  }
}

export async function deleteFixedCost(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.fixedCost.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
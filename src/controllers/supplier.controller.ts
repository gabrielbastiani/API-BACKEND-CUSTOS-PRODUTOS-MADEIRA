import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export async function createSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function listSuppliers(_req: Request, res: Response, next: NextFunction) {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
}

export async function getSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { materials: true },
    });
    if (!supplier) throw new ApiError(404, 'Fornecedor não encontrado.');
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function deleteSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
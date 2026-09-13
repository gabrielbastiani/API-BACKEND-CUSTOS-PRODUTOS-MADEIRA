import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateUnitCost } from '../utils/pricingCalculator';

export async function createRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const material = await prisma.rawMaterial.create({ data: req.body });
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
}

export async function listRawMaterials(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId } = req.query;
    const materials = await prisma.rawMaterial.findMany({
      where: supplierId ? { supplierId: String(supplierId) } : undefined,
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });

    const withUnitCost = materials.map((m) => ({
      ...m,
      unitCost: calculateUnitCost(m),
    }));

    res.json({ success: true, data: withUnitCost });
  } catch (error) {
    next(error);
  }
}

export async function getRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const material = await prisma.rawMaterial.findUnique({
      where: { id: req.params.id },
      include: { supplier: true },
    });
    if (!material) throw new ApiError(404, 'Matéria-prima não encontrada.');
    res.json({
      success: true,
      data: { ...material, unitCost: calculateUnitCost(material) },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const material = await prisma.rawMaterial.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
}

export async function deleteRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.rawMaterial.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
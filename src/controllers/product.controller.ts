import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing } from '../utils/pricingCalculator';

async function loadProductWithRelations(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: true } },
      labors: { include: { laborRate: true } },
    },
  });
  if (!product) throw new ApiError(404, 'Produto não encontrado.');
  return product;
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, marginPercent, overheadPercent, materials, labors } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        marginPercent: marginPercent ?? 0,
        overheadPercent: overheadPercent ?? 0,
        materials: materials
          ? {
              create: materials.map((m: any) => ({
                rawMaterialId: m.rawMaterialId,
                quantityUsed: m.quantityUsed,
                wastePercent: m.wastePercent ?? 0,
              })),
            }
          : undefined,
        labors: labors
          ? {
              create: labors.map((l: any) => ({
                laborRateId: l.laborRateId,
                hoursSpent: l.hoursSpent,
              })),
            }
          : undefined,
      },
      include: {
        materials: { include: { rawMaterial: true } },
        labors: { include: { laborRate: true } },
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { materials: true, labors: true },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await loadProductWithRelations(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addMaterialToProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { rawMaterialId, quantityUsed, wastePercent } = req.body;

    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new ApiError(404, 'Produto não encontrado.');
    });

    const item = await prisma.productMaterial.create({
      data: {
        productId: id,
        rawMaterialId,
        quantityUsed,
        wastePercent: wastePercent ?? 0,
      },
      include: { rawMaterial: true },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function removeMaterialFromProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialItemId } = req.params;
    await prisma.productMaterial.delete({ where: { id: materialItemId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addLaborToProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { laborRateId, hoursSpent } = req.body;

    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new ApiError(404, 'Produto não encontrado.');
    });

    const item = await prisma.productLabor.create({
      data: { productId: id, laborRateId, hoursSpent },
      include: { laborRate: true },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function removeLaborFromProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { laborItemId } = req.params;
    await prisma.productLabor.delete({ where: { id: laborItemId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Calcula o custo do produto em tempo real, sem salvar snapshot.
 */
export async function calculateProductCost(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await loadProductWithRelations(req.params.id);

    const result = calculateProductPricing(
      product.materials,
      product.labors,
      Number(product.overheadPercent),
      Number(product.marginPercent)
    );

    res.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Calcula e persiste um snapshot do custo (histórico de precificação).
 */
export async function saveProductCostSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await loadProductWithRelations(req.params.id);

    const result = calculateProductPricing(
      product.materials,
      product.labors,
      Number(product.overheadPercent),
      Number(product.marginPercent)
    );

    const snapshot = await prisma.productCostSnapshot.create({
      data: {
        productId: product.id,
        materialsCost: result.materialsCost,
        laborCost: result.laborCost,
        overheadCost: result.overheadCost,
        subtotalCost: result.subtotalCost,
        marginValue: result.marginValue,
        finalPrice: result.finalPrice,
        breakdown: result.breakdown as any,
      },
    });

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
}

export async function listProductCostHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const history = await prisma.productCostSnapshot.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}
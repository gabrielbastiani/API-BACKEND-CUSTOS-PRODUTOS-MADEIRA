import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing } from '../utils/pricingCalculator';

async function loadProductWithRelations(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: { include: { suppliers: true } } } },
      labors: { include: { laborRate: true } },
      overheadItems: true,
    },
  });
  if (!product) throw new ApiError(404, 'Produto não encontrado.');
  return product;
}

/**
 * Calcula o custo direto (materiais + mão de obra) de um produto,
 * usado como base para converter a soma dos itens de overhead em percentual.
 */
async function calculateDirectCost(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: { include: { suppliers: true } } } },
      labors: { include: { laborRate: true } },
    },
  });

  if (!product) return 0;

  const result = calculateProductPricing(product.materials, product.labors, 0, 0);
  return result.materialsCost + result.laborCost;
}

function sumOverheadItems(items: { value: number }[]): number {
  return items.reduce((sum, item) => sum + item.value, 0);
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, marginPercent, overheadItems, materials, labors } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        marginPercent: marginPercent ?? 0,
        overheadPercent: 0,
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
        overheadItems:
          overheadItems && overheadItems.length > 0
            ? {
                create: overheadItems.map((item: any) => ({
                  name: item.name,
                  value: item.value,
                })),
              }
            : undefined,
      },
      include: {
        materials: { include: { rawMaterial: true } },
        labors: { include: { laborRate: true } },
        overheadItems: true,
      },
    });

    // Recalcula o overheadPercent com base no custo direto real do produto recém-criado
    if (overheadItems && overheadItems.length > 0) {
      const directCost = await calculateDirectCost(product.id);
      const overheadTotal = sumOverheadItems(overheadItems);
      const overheadPercent = directCost > 0 ? (overheadTotal / directCost) * 100 : 0;

      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { overheadPercent },
        include: {
          materials: { include: { rawMaterial: true } },
          labors: { include: { laborRate: true } },
          overheadItems: true,
        },
      });

      res.status(201).json({ success: true, data: updated });
      return;
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { materials: true, labors: true, overheadItems: true },
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
    const { id } = req.params;
    const { name, description, marginPercent, overheadItems } = req.body;

    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new ApiError(404, 'Produto não encontrado.');
    });

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (marginPercent !== undefined) updateData.marginPercent = marginPercent;

    if (overheadItems !== undefined) {
      // Remove os itens antigos e recria com a lista enviada, garantindo que
      // adições, remoções e edições sejam refletidas em uma única operação.
      await prisma.productOverheadItem.deleteMany({ where: { productId: id } });

      updateData.overheadItems = {
        create: overheadItems.map((item: any) => ({
          name: item.name,
          value: item.value,
        })),
      };

      const directCost = await calculateDirectCost(id);
      const overheadTotal = sumOverheadItems(overheadItems);
      updateData.overheadPercent = directCost > 0 ? (overheadTotal / directCost) * 100 : 0;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        materials: { include: { rawMaterial: true } },
        labors: { include: { laborRate: true } },
        overheadItems: true,
      },
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
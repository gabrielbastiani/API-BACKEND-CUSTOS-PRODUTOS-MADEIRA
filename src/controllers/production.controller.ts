import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing } from '../utils/pricingCalculator';

export async function produceProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { quantityProduced } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        materials: { include: { rawMaterial: true } },
        labors: { include: { laborRate: true } },
      },
    });

    if (!product) throw new ApiError(404, 'Produto não encontrado.');

    const pricing = calculateProductPricing(
      product.materials,
      product.labors,
      Number(product.overheadPercent),
      Number(product.marginPercent)
    );

    const unitCost = pricing.subtotalCost;
    const totalCost = unitCost * quantityProduced;

    // Verifica se há estoque suficiente de todas as matérias-primas antes de
    // descontar qualquer coisa, para não deixar consumo parcial em caso de falta.
    for (const item of pricing.breakdown.materials) {
      const requiredQty = item.effectiveQuantity * quantityProduced;
      const material = product.materials.find(
        (m) => m.rawMaterialId === item.rawMaterialId
      )?.rawMaterial;

      if (material && Number(material.stockQty) < requiredQty) {
        throw new ApiError(
          400,
          `Estoque insuficiente de "${item.name}". Necessário: ${requiredQty.toFixed(4)}, disponível: ${Number(material.stockQty).toFixed(4)}.`
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.productionRecord.create({
        data: {
          productId: id,
          quantityProduced,
          unitCost,
          totalCost,
        },
      });

      for (const item of pricing.breakdown.materials) {
        const requiredQty = item.effectiveQuantity * quantityProduced;

        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: { stockQty: { decrement: requiredQty } },
        });

        await tx.stockMovement.create({
          data: {
            rawMaterialId: item.rawMaterialId,
            type: 'CONSUMPTION',
            quantity: -requiredQty,
            note: `Consumo da produção de ${quantityProduced}x "${product.name}"`,
            productionRecordId: record.id,
          },
        });
      }

      return record;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listProductionHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const records = await prisma.productionRecord.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { stockMovements: { include: { rawMaterial: true } } },
    });
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}
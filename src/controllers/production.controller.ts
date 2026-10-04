import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import {
  calculateProductPricing,
  OverheadInput,
} from '../utils/pricingCalculator';
import { calculateAutomaticOverhead } from '../utils/overheadCalculator';

async function buildOverheadInput(product: {
  overheadMode: 'MANUAL' | 'AUTOMATIC';
  overheadPercent: Prisma.Decimal | number;
  labors: { hoursSpent: Prisma.Decimal | number }[];
}): Promise<OverheadInput> {
  if (product.overheadMode === 'MANUAL') {
    return {
      mode: 'MANUAL',
      overheadPercent: Number(product.overheadPercent),
    };
  }

  const [settings, fixedCosts] = await Promise.all([
    prisma.workshopSettings.findFirst(),
    prisma.fixedCost.findMany({
      where: { isActive: true },
    }),
  ]);

  const monthlyProductiveHours = Number(
    settings?.monthlyProductiveHours ?? 0
  );

  const totalFixedCostMonthly = fixedCosts.reduce(
    (sum, item) => sum + Number(item.monthlyValue),
    0
  );

  const productionTimeHours = product.labors.reduce(
    (sum, labor) => sum + Number(labor.hoursSpent),
    0
  );

  const {
    unitsProducibleMonthly,
    overheadCostPerUnit,
    isConfigured,
  } = calculateAutomaticOverhead({
    monthlyProductiveHours,
    totalFixedCostMonthly,
    productionTimeHours,
  });

  return {
    mode: 'AUTOMATIC',
    overheadCostPerUnit,
    monthlyProductiveHours,
    unitsProducibleMonthly,
    totalFixedCostMonthly,
    isConfigured,
  };
}

export async function produceProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const quantityProduced = Number(req.body.quantityProduced);

    if (!Number.isFinite(quantityProduced) || quantityProduced <= 0) {
      throw new ApiError(
        400,
        'A quantidade produzida deve ser um número maior que zero.'
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        materials: {
          include: {
            rawMaterial: {
              include: {
                suppliers: true,
              },
            },
          },
        },
        labors: {
          include: {
            laborRate: true,
          },
        },
      },
    });

    if (!product) {
      throw new ApiError(404, 'Produto não encontrado.');
    }

    const overheadInput = await buildOverheadInput(product);

    const pricing = calculateProductPricing(
      product.materials,
      product.labors,
      overheadInput,
      Number(product.marginPercent)
    );

    const unitCost = pricing.subtotalCost;
    const totalCost = unitCost * quantityProduced;

    if (!Number.isFinite(unitCost) || !Number.isFinite(totalCost)) {
      throw new ApiError(
        400,
        'Não foi possível registrar a produção porque o cálculo do custo resultou em um valor inválido. Confira os fornecedores padrão, os custos e as configurações de overhead do produto.'
      );
    }

    // Verifica o estoque de todos os materiais antes de iniciar o consumo.
    for (const item of pricing.breakdown.materials) {
      const requiredQty = item.effectiveQuantity * quantityProduced;

      const material = product.materials.find(
        (productMaterial) =>
          productMaterial.rawMaterialId === item.rawMaterialId
      )?.rawMaterial;

      if (!material) {
        throw new ApiError(
          400,
          `Não foi possível localizar a matéria-prima "${item.name}" vinculada ao produto.`
        );
      }

      const availableQty = Number(material.stockQty);

      if (!Number.isFinite(availableQty) || availableQty < requiredQty) {
        throw new ApiError(
          400,
          `Estoque insuficiente de "${item.name}". Necessário: ${requiredQty.toFixed(4)}, disponível: ${Number.isFinite(availableQty) ? availableQty.toFixed(4) : 'valor inválido'}.`
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.productionRecord.create({
        data: {
          product: {
            connect: { id: product.id },
          },
          quantityProduced,
          unitCost,
          totalCost,
        },
      });

      for (const item of pricing.breakdown.materials) {
        const requiredQty = item.effectiveQuantity * quantityProduced;

        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            stockQty: {
              decrement: requiredQty,
            },
          },
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

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listProductionHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const records = await prisma.productionRecord.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        stockMovements: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
}
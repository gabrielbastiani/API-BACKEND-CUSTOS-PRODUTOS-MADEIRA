import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing } from '../utils/pricingCalculator';
import { calculateAutomaticOverhead } from '../utils/overheadCalculator';
import { generateProductLabelsPdf, ProductLabelData, LabelLayout } from '../utils/pdf/productLabelPdf';
import { Prisma } from '@prisma/client';

async function buildOverheadInputForProduct(product: {
  overheadMode: 'MANUAL' | 'AUTOMATIC';
  overheadPercent: Prisma.Decimal | number;
  labors: { hoursSpent: Prisma.Decimal | number }[];
}) {
  if (product.overheadMode === 'MANUAL') {
    return { mode: 'MANUAL' as const, overheadPercent: Number(product.overheadPercent) };
  }

  const [settings, activeFixedCosts] = await Promise.all([
    prisma.workshopSettings.findFirst(),
    prisma.fixedCost.findMany({ where: { isActive: true } }),
  ]);

  const monthlyProductiveHours = Number(settings?.monthlyProductiveHours ?? 0);
  const totalFixedCostMonthly = activeFixedCosts.reduce(
    (sum, item) => sum + Number(item.monthlyValue),
    0
  );
  const productionTimeHours = product.labors.reduce(
    (sum, l) => sum + Number(l.hoursSpent),
    0
  );

  const { unitsProducibleMonthly, overheadCostPerUnit, isConfigured } =
    calculateAutomaticOverhead({
      monthlyProductiveHours,
      totalFixedCostMonthly,
      productionTimeHours,
    });

  return {
    mode: 'AUTOMATIC' as const,
    overheadCostPerUnit,
    monthlyProductiveHours,
    unitsProducibleMonthly,
    totalFixedCostMonthly,
    isConfigured,
  };
}

export async function generateProductLabels(req: Request, res: Response, next: NextFunction) {
  try {
    const { productIds, format } = req.body as {
      productIds: string[];
      format?: LabelLayout;
    };

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError(400, 'Selecione ao menos um produto para gerar etiquetas.');
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        materials: { include: { rawMaterial: { include: { suppliers: true } } } },
        labors: { include: { laborRate: true } },
      },
    });

    if (products.length === 0) {
      throw new ApiError(404, 'Nenhum produto encontrado para os IDs informados.');
    }

    const labelData: ProductLabelData[] = [];

    for (const product of products) {
      const overheadInput = await buildOverheadInputForProduct(product);
      const pricing = calculateProductPricing(
  product.materials,
  product.labors,
  overheadInput,
  Number(product.marginPercent)
);

console.log('DEBUG etiqueta', {
  productId: product.id,
  productName: product.name,
  overheadInput,
  finalPrice: pricing.finalPrice,
  subtotalCost: pricing.subtotalCost,
});

      const image = await prisma.image.findFirst({
        where: { ownerType: 'PRODUCT', ownerId: product.id },
        orderBy: { createdAt: 'asc' },
      });

      labelData.push({
        id: product.id,
        name: product.name,
        finalPrice: pricing.finalPrice,
        imageUrl: image?.url ?? null,
      });
    }

    const pdfBuffer = await generateProductLabelsPdf(labelData, format ?? 'SMALL');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="etiquetas-produtos.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
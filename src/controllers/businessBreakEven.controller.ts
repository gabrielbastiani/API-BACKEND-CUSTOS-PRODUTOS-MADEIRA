import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { calculateProductPricing } from '../utils/pricingCalculator';
import { calculateAutomaticOverhead } from '../utils/overheadCalculator';
import { calculateBusinessBreakEven } from '../utils/businessBreakEvenCalculator';
import { Prisma } from '@prisma/client';

async function buildOverheadInputForProduct(product: {
  overheadMode: 'MANUAL' | 'AUTOMATIC';
  overheadPercent: Prisma.Decimal | number;
  labors: { hoursSpent: Prisma.Decimal | number }[];
  settings: { monthlyProductiveHours: Prisma.Decimal | number } | null;
  activeFixedCosts: { monthlyValue: Prisma.Decimal | number }[];
}) {
  if (product.overheadMode === 'MANUAL') {
    return { mode: 'MANUAL' as const, overheadPercent: Number(product.overheadPercent) };
  }

  const monthlyProductiveHours = Number(product.settings?.monthlyProductiveHours ?? 0);
  const totalFixedCostMonthly = product.activeFixedCosts.reduce(
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

/**
 * Calcula o ponto de equilíbrio consolidado do negócio: cruza o custo fixo
 * mensal total com a margem de contribuição média do mix de produtos
 * efetivamente produzidos nos últimos 30 dias (usado como proxy de vendas),
 * e mostra o progresso do faturamento do mês corrente frente a essa meta.
 */
export async function getBusinessBreakEven(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [settings, activeFixedCosts, products, recentProduction, currentMonthProduction] =
      await Promise.all([
        prisma.workshopSettings.findFirst(),
        prisma.fixedCost.findMany({ where: { isActive: true } }),
        prisma.product.findMany({
          include: {
            materials: { include: { rawMaterial: { include: { suppliers: true } } } },
            labors: { include: { laborRate: true } },
          },
        }),
        prisma.productionRecord.findMany({
          where: { createdAt: { gte: last30Days } },
          select: { productId: true, quantityProduced: true },
        }),
        prisma.productionRecord.findMany({
          where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
          select: { productId: true, quantityProduced: true },
        }),
      ]);

    const totalFixedCostMonthly = activeFixedCosts.reduce(
      (sum, item) => sum + Number(item.monthlyValue),
      0
    );

    // Calcula preço e custo variável de cada produto cadastrado, necessário
    // tanto para o mix real (produtos com produção recente) quanto para a
    // média simples de fallback (quando não há histórico), e também para
    // reconstruir o faturamento do mês corrente a partir do preço vigente.
    const productPricingMap = new Map<
      string,
      { finalPrice: number; variableCostPerUnit: number; name: string }
    >();

    for (const product of products) {
      const overheadInput = await buildOverheadInputForProduct({
        overheadMode: product.overheadMode,
        overheadPercent: product.overheadPercent,
        labors: product.labors,
        settings,
        activeFixedCosts,
      });

      const pricing = calculateProductPricing(
        product.materials,
        product.labors,
        overheadInput,
        Number(product.marginPercent)
      );

      productPricingMap.set(product.id, {
        finalPrice: pricing.finalPrice,
        variableCostPerUnit: pricing.materialsCost + pricing.laborCost,
        name: product.name,
      });
    }

    // Mix de vendas real: agrupa a produção dos últimos 30 dias por produto.
    const unitsByProductLast30Days = new Map<string, number>();
    for (const record of recentProduction) {
      const current = unitsByProductLast30Days.get(record.productId) ?? 0;
      unitsByProductLast30Days.set(
        record.productId,
        current + Number(record.quantityProduced)
      );
    }

    const salesMix = Array.from(unitsByProductLast30Days.entries())
      .map(([productId, units]) => {
        const info = productPricingMap.get(productId);
        if (!info) return null;
        return {
          productId,
          productName: info.name,
          finalPrice: info.finalPrice,
          variableCostPerUnit: info.variableCostPerUnit,
          unitsInPeriod: units,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const allProductsMargins = Array.from(productPricingMap.values()).map((info) => ({
      contributionMarginPercent:
        info.finalPrice > 0
          ? ((info.finalPrice - info.variableCostPerUnit) / info.finalPrice) * 100
          : 0,
    }));

    // Faturamento do mês corrente: agrupa a produção do mês por produto e
    // multiplica cada quantidade pelo preço de venda vigente daquele
    // produto (não pelo custo), para refletir receita de fato, não custo.
    const unitsByProductCurrentMonth = new Map<string, number>();
    for (const record of currentMonthProduction) {
      const current = unitsByProductCurrentMonth.get(record.productId) ?? 0;
      unitsByProductCurrentMonth.set(
        record.productId,
        current + Number(record.quantityProduced)
      );
    }

    let currentMonthRevenue = 0;
    let currentMonthUnits = 0;
    for (const [productId, units] of unitsByProductCurrentMonth.entries()) {
      const info = productPricingMap.get(productId);
      if (!info) continue;
      currentMonthUnits += units;
      currentMonthRevenue += info.finalPrice * units;
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsedInMonth = now.getDate();

    const result = calculateBusinessBreakEven({
      totalFixedCostMonthly,
      salesMix,
      allProductsMargins,
      currentMonthRevenue,
      currentMonthUnits,
      daysElapsedInMonth,
      daysInMonth,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
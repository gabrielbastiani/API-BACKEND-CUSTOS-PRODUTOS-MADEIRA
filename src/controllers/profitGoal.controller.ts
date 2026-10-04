import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { calculateProductPricing } from '../utils/pricingCalculator';
import { calculateAutomaticOverhead } from '../utils/overheadCalculator';
import {
  calculateProfitGoalByProduct,
  calculateProfitGoalByMix,
} from '../utils/profitGoalCalculator';
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
 * Dado um valor de lucro mensal desejado (informado pelo usuário), calcula:
 * (a) quantas unidades de cada produto cadastrado seriam necessárias para
 * atingir essa meta vendendo só aquele produto, e (b) o faturamento total
 * necessário assumindo que o usuário mantém o mix de vendas que já pratica.
 */
export async function calculateProfitGoal(req: Request, res: Response, next: NextFunction) {
  try {
    const desiredProfit = Number(req.body.desiredProfit);

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [settings, activeFixedCosts, products, recentProduction] = await Promise.all([
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
    ]);

    const totalFixedCostMonthly = activeFixedCosts.reduce(
      (sum, item) => sum + Number(item.monthlyValue),
      0
    );

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

    // Resultado por produto: "se eu vendesse só este produto, quanto precisaria vender".
    const byProduct = Array.from(productPricingMap.entries()).map(([productId, info]) =>
      calculateProfitGoalByProduct({
        desiredProfit,
        totalFixedCostMonthly,
        finalPrice: info.finalPrice,
        variableCostPerUnit: info.variableCostPerUnit,
        productId,
        productName: info.name,
      })
    );

    // Margem média ponderada do mix real dos últimos 30 dias (mesma lógica
    // do ponto de equilíbrio consolidado), com fallback para média simples.
    const unitsByProduct = new Map<string, number>();
    for (const record of recentProduction) {
      const current = unitsByProduct.get(record.productId) ?? 0;
      unitsByProduct.set(record.productId, current + Number(record.quantityProduced));
    }

    let totalRevenueInMix = 0;
    let weightedSum = 0;
    for (const [productId, units] of unitsByProduct.entries()) {
      const info = productPricingMap.get(productId);
      if (!info) continue;
      const itemRevenue = info.finalPrice * units;
      totalRevenueInMix += itemRevenue;
      const marginPercent =
        info.finalPrice > 0
          ? ((info.finalPrice - info.variableCostPerUnit) / info.finalPrice) * 100
          : 0;
      weightedSum += itemRevenue * marginPercent;
    }

    let weightedContributionMarginPercent: number;
    let isEstimated: boolean;

    if (totalRevenueInMix > 0) {
      isEstimated = false;
      weightedContributionMarginPercent = weightedSum / totalRevenueInMix;
    } else {
      isEstimated = true;
      const validMargins = byProduct.filter((p) => p.isViable);
      weightedContributionMarginPercent =
        validMargins.length > 0
          ? validMargins.reduce(
              (sum, p) => sum + (p.contributionMarginPerUnit / p.finalPrice) * 100,
              0
            ) / validMargins.length
          : 0;
    }

    const byMix = calculateProfitGoalByMix({
      desiredProfit,
      totalFixedCostMonthly,
      weightedContributionMarginPercent,
      isEstimated,
    });

    res.json({
      success: true,
      data: {
        desiredProfit,
        totalFixedCostMonthly,
        byMix,
        byProduct: byProduct
          .filter((p) => p.isViable)
          .sort((a, b) => a.unitsNeeded - b.unitsNeeded),
      },
    });
  } catch (error) {
    next(error);
  }
}
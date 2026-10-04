function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ProductSalesMixItem {
  productId: string;
  productName: string;
  finalPrice: number;
  variableCostPerUnit: number;
  unitsInPeriod: number;
}

export interface BusinessBreakEvenResult {
  totalFixedCostMonthly: number;
  weightedContributionMarginPercent: number;
  isEstimated: boolean;
  breakEvenRevenueMonthly: number;
  currentMonthRevenue: number;
  currentMonthUnits: number;
  progressPercent: number;
  remainingRevenueToBreakEven: number;
  projectedMonthRevenue: number;
  daysElapsedInMonth: number;
  daysInMonth: number;
  isOnTrack: boolean;
  mix: {
    productId: string;
    productName: string;
    revenueShare: number;
    contributionMarginPercent: number;
  }[];
}

/**
 * Calcula o ponto de equilíbrio consolidado do negócio, cruzando os custos
 * fixos mensais totais com a margem de contribuição média do mix de produtos
 * (ponderada pelo faturamento de cada produto no período de referência).
 *
 * Quando não há histórico de produção suficiente, usa uma média simples da
 * margem de contribuição de todos os produtos cadastrados como estimativa,
 * sinalizando isso em `isEstimated`.
 */
export function calculateBusinessBreakEven(input: {
  totalFixedCostMonthly: number;
  salesMix: ProductSalesMixItem[];
  allProductsMargins: { contributionMarginPercent: number }[];
  currentMonthRevenue: number;
  currentMonthUnits: number;
  daysElapsedInMonth: number;
  daysInMonth: number;
}): BusinessBreakEvenResult {
  const {
    totalFixedCostMonthly,
    salesMix,
    allProductsMargins,
    currentMonthRevenue,
    currentMonthUnits,
    daysElapsedInMonth,
    daysInMonth,
  } = input;

  const totalRevenueInMix = salesMix.reduce(
    (sum, item) => sum + item.finalPrice * item.unitsInPeriod,
    0
  );

  let weightedContributionMarginPercent: number;
  let isEstimated: boolean;
  let mix: BusinessBreakEvenResult['mix'] = [];

  if (totalRevenueInMix > 0) {
    isEstimated = false;
    let weightedSum = 0;

    mix = salesMix.map((item) => {
      const itemRevenue = item.finalPrice * item.unitsInPeriod;
      const revenueShare = totalRevenueInMix > 0 ? itemRevenue / totalRevenueInMix : 0;
      const contributionMarginPercent =
        item.finalPrice > 0
          ? ((item.finalPrice - item.variableCostPerUnit) / item.finalPrice) * 100
          : 0;

      weightedSum += revenueShare * contributionMarginPercent;

      return {
        productId: item.productId,
        productName: item.productName,
        revenueShare: round2(revenueShare * 100),
        contributionMarginPercent: round2(contributionMarginPercent),
      };
    });

    weightedContributionMarginPercent = round2(weightedSum);
  } else {
    isEstimated = true;
    const validMargins = allProductsMargins.filter((m) => m.contributionMarginPercent > 0);
    const avg =
      validMargins.length > 0
        ? validMargins.reduce((sum, m) => sum + m.contributionMarginPercent, 0) /
          validMargins.length
        : 0;
    weightedContributionMarginPercent = round2(avg);
  }

  const breakEvenRevenueMonthly =
    weightedContributionMarginPercent > 0
      ? round2(totalFixedCostMonthly / (weightedContributionMarginPercent / 100))
      : 0;

  const progressPercent =
    breakEvenRevenueMonthly > 0
      ? round2((currentMonthRevenue / breakEvenRevenueMonthly) * 100)
      : 0;

  const remainingRevenueToBreakEven = round2(
    Math.max(breakEvenRevenueMonthly - currentMonthRevenue, 0)
  );

  const projectedMonthRevenue =
    daysElapsedInMonth > 0
      ? round2((currentMonthRevenue / daysElapsedInMonth) * daysInMonth)
      : 0;

  const isOnTrack = projectedMonthRevenue >= breakEvenRevenueMonthly;

  return {
    totalFixedCostMonthly: round2(totalFixedCostMonthly),
    weightedContributionMarginPercent,
    isEstimated,
    breakEvenRevenueMonthly,
    currentMonthRevenue: round2(currentMonthRevenue),
    currentMonthUnits,
    progressPercent,
    remainingRevenueToBreakEven,
    projectedMonthRevenue,
    daysElapsedInMonth,
    daysInMonth,
    isOnTrack,
    mix,
  };
}
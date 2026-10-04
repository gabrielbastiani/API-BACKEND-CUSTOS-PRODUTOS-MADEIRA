function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ProfitGoalByProductResult {
  productId: string;
  productName: string;
  finalPrice: number;
  contributionMarginPerUnit: number;
  unitsNeeded: number;
  revenueNeeded: number;
  isViable: boolean;
}

export interface ProfitGoalByMixResult {
  weightedContributionMarginPercent: number;
  revenueNeeded: number;
  isEstimated: boolean;
  isViable: boolean;
}

/**
 * Calcula quantas unidades de um produto específico precisam ser vendidas
 * para atingir uma meta de lucro líquido mensal definida pelo usuário, após
 * cobrir os custos fixos do negócio.
 *
 * unidades necessárias = (meta de lucro + custo fixo mensal) / margem de contribuição unitária
 */
export function calculateProfitGoalByProduct(input: {
  desiredProfit: number;
  totalFixedCostMonthly: number;
  finalPrice: number;
  variableCostPerUnit: number;
  productId: string;
  productName: string;
}): ProfitGoalByProductResult {
  const { desiredProfit, totalFixedCostMonthly, finalPrice, variableCostPerUnit } = input;

  const contributionMarginPerUnit = round2(finalPrice - variableCostPerUnit);

  if (contributionMarginPerUnit <= 0) {
    return {
      productId: input.productId,
      productName: input.productName,
      finalPrice: round2(finalPrice),
      contributionMarginPerUnit,
      unitsNeeded: 0,
      revenueNeeded: 0,
      isViable: false,
    };
  }

  const totalNeeded = desiredProfit + totalFixedCostMonthly;
  const unitsNeeded = Math.ceil(totalNeeded / contributionMarginPerUnit);
  const revenueNeeded = round2(unitsNeeded * finalPrice);

  return {
    productId: input.productId,
    productName: input.productName,
    finalPrice: round2(finalPrice),
    contributionMarginPerUnit,
    unitsNeeded,
    revenueNeeded,
    isViable: true,
  };
}

/**
 * Calcula o faturamento total necessário para atingir a meta de lucro,
 * assumindo que o usuário mantém a mesma proporção de mix de vendas que já
 * pratica (margem de contribuição média ponderada).
 */
export function calculateProfitGoalByMix(input: {
  desiredProfit: number;
  totalFixedCostMonthly: number;
  weightedContributionMarginPercent: number;
  isEstimated: boolean;
}): ProfitGoalByMixResult {
  const { desiredProfit, totalFixedCostMonthly, weightedContributionMarginPercent, isEstimated } =
    input;

  if (weightedContributionMarginPercent <= 0) {
    return {
      weightedContributionMarginPercent,
      revenueNeeded: 0,
      isEstimated,
      isViable: false,
    };
  }

  const totalNeeded = desiredProfit + totalFixedCostMonthly;
  const revenueNeeded = round2(totalNeeded / (weightedContributionMarginPercent / 100));

  return {
    weightedContributionMarginPercent,
    revenueNeeded,
    isEstimated,
    isViable: true,
  };
}
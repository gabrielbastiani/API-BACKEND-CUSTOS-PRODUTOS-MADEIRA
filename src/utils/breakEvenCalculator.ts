function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface BreakEvenInput {
  finalPrice: number;
  variableCostPerUnit: number;
  totalFixedCostMonthly: number;
}

export interface BreakEvenResult {
  contributionMarginPerUnit: number;
  contributionMarginPercent: number;
  breakEvenUnitsMonthly: number;
  breakEvenRevenueMonthly: number;
  isViable: boolean;
}

/**
 * Calcula o ponto de equilíbrio (break-even) de um produto: quantas unidades
 * precisam ser vendidas por mês para que a margem de contribuição total
 * cubra os custos fixos mensais do negócio.
 *
 * margem de contribuição unitária = preço de venda - custo variável unitário
 * unidades de equilíbrio = custo fixo mensal total / margem de contribuição unitária
 * receita de equilíbrio = unidades de equilíbrio * preço de venda
 *
 * Se a margem de contribuição for zero ou negativa (produto vendido abaixo do
 * custo variável, ou sem preço definido), o ponto de equilíbrio é inatingível
 * e isViable retorna false.
 */
export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const { finalPrice, variableCostPerUnit, totalFixedCostMonthly } = input;

  const contributionMarginPerUnit = round2(finalPrice - variableCostPerUnit);
  const contributionMarginPercent =
    finalPrice > 0 ? round2((contributionMarginPerUnit / finalPrice) * 100) : 0;

  if (contributionMarginPerUnit <= 0) {
    return {
      contributionMarginPerUnit,
      contributionMarginPercent,
      breakEvenUnitsMonthly: 0,
      breakEvenRevenueMonthly: 0,
      isViable: false,
    };
  }

  const breakEvenUnitsMonthly = Math.ceil(
    totalFixedCostMonthly / contributionMarginPerUnit
  );
  const breakEvenRevenueMonthly = round2(breakEvenUnitsMonthly * finalPrice);

  return {
    contributionMarginPerUnit,
    contributionMarginPercent,
    breakEvenUnitsMonthly,
    breakEvenRevenueMonthly,
    isViable: true,
  };
}
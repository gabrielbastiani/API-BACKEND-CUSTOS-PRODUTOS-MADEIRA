export interface AutomaticOverheadInput {
  monthlyProductiveHours: number;
  totalFixedCostMonthly: number;
  productionTimeHours: number;
}

export interface AutomaticOverheadResult {
  unitsProducibleMonthly: number;
  overheadCostPerUnit: number;
  isConfigured: boolean;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o custo indireto rateado por unidade, a partir da capacidade
 * produtiva mensal da oficina e do tempo estimado de produção do produto.
 *
 * unidades produzíveis/mês = capacidade produtiva mensal (h) / tempo de produção do produto (h)
 * overhead por unidade = custo fixo mensal total / unidades produzíveis/mês
 *
 * Quando a capacidade produtiva ou o tempo de produção ainda não estão
 * configurados, retorna overhead zero em vez de lançar exceção, para não
 * quebrar o cálculo de custo do produto. O campo `isConfigured` indica se o
 * rateio automático está de fato ativo ou apenas com valor neutro.
 */
export function calculateAutomaticOverhead(
  input: AutomaticOverheadInput
): AutomaticOverheadResult {
  const { monthlyProductiveHours, totalFixedCostMonthly, productionTimeHours } = input;

  if (productionTimeHours <= 0 || monthlyProductiveHours <= 0) {
    return {
      unitsProducibleMonthly: 0,
      overheadCostPerUnit: 0,
      isConfigured: false,
    };
  }

  const unitsProducibleMonthly = monthlyProductiveHours / productionTimeHours;
  const overheadCostPerUnit =
    unitsProducibleMonthly > 0 ? totalFixedCostMonthly / unitsProducibleMonthly : 0;

  return {
    unitsProducibleMonthly: round2(unitsProducibleMonthly),
    overheadCostPerUnit: round2(overheadCostPerUnit),
    isConfigured: true,
  };
}
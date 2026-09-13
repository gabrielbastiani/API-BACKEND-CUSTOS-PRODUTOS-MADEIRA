import { Prisma } from '@prisma/client';

type MaterialForCalc = {
  id: string;
  quantityUsed: Prisma.Decimal | number;
  wastePercent: Prisma.Decimal | number;
  rawMaterial: {
    id: string;
    name: string;
    purchaseQty: Prisma.Decimal | number;
    purchasePrice: Prisma.Decimal | number;
    conversionFactor: Prisma.Decimal | number;
    usageUnit: string;
  };
};

type LaborForCalc = {
  id: string;
  hoursSpent: Prisma.Decimal | number;
  laborRate: {
    id: string;
    name: string;
    hourlyRate: Prisma.Decimal | number;
  };
};

export interface MaterialBreakdownItem {
  rawMaterialId: string;
  name: string;
  unitCost: number;
  quantityUsed: number;
  wastePercent: number;
  effectiveQuantity: number;
  totalCost: number;
}

export interface LaborBreakdownItem {
  laborRateId: string;
  name: string;
  hourlyRate: number;
  hoursSpent: number;
  totalCost: number;
}

export interface PricingResult {
  materialsCost: number;
  laborCost: number;
  overheadCost: number;
  subtotalCost: number;
  marginValue: number;
  finalPrice: number;
  breakdown: {
    materials: MaterialBreakdownItem[];
    labors: LaborBreakdownItem[];
    overheadPercent: number;
    marginPercent: number;
  };
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o custo unitário na unidade de uso a partir do preço/quantidade de compra.
 * Ex: tábua comprada por R$45 com 3 metros (purchaseQty=3) e conversionFactor=100
 * (100 cm em 1 metro) => custo por cm = 45 / (3 * 100)
 */
export function calculateUnitCost(rawMaterial: {
  purchaseQty: Prisma.Decimal | number;
  purchasePrice: Prisma.Decimal | number;
  conversionFactor: Prisma.Decimal | number;
}): number {
  const purchaseQty = toNumber(rawMaterial.purchaseQty);
  const purchasePrice = toNumber(rawMaterial.purchasePrice);
  const conversionFactor = toNumber(rawMaterial.conversionFactor);

  const totalUsageUnitsInPurchase = purchaseQty * conversionFactor;

  if (totalUsageUnitsInPurchase <= 0) {
    throw new Error('Configuração inválida: quantidade comprada ou fator de conversão inválido.');
  }

  return purchasePrice / totalUsageUnitsInPurchase;
}

export function calculateProductPricing(
  materials: MaterialForCalc[],
  labors: LaborForCalc[],
  overheadPercent: number,
  marginPercent: number
): PricingResult {
  const materialBreakdown: MaterialBreakdownItem[] = materials.map((item) => {
    const unitCost = calculateUnitCost(item.rawMaterial);
    const quantityUsed = toNumber(item.quantityUsed);
    const wastePercent = toNumber(item.wastePercent);
    const effectiveQuantity = quantityUsed * (1 + wastePercent / 100);
    const totalCost = unitCost * effectiveQuantity;

    return {
      rawMaterialId: item.rawMaterial.id,
      name: item.rawMaterial.name,
      unitCost: round2(unitCost),
      quantityUsed,
      wastePercent,
      effectiveQuantity: round2(effectiveQuantity),
      totalCost: round2(totalCost),
    };
  });

  const laborBreakdown: LaborBreakdownItem[] = labors.map((item) => {
    const hourlyRate = toNumber(item.laborRate.hourlyRate);
    const hoursSpent = toNumber(item.hoursSpent);
    const totalCost = hourlyRate * hoursSpent;

    return {
      laborRateId: item.laborRate.id,
      name: item.laborRate.name,
      hourlyRate,
      hoursSpent,
      totalCost: round2(totalCost),
    };
  });

  const materialsCost = round2(materialBreakdown.reduce((sum, m) => sum + m.totalCost, 0));
  const laborCost = round2(laborBreakdown.reduce((sum, l) => sum + l.totalCost, 0));

  const directCost = materialsCost + laborCost;
  const overheadCost = round2(directCost * (overheadPercent / 100));
  const subtotalCost = round2(directCost + overheadCost);
  const marginValue = round2(subtotalCost * (marginPercent / 100));
  const finalPrice = round2(subtotalCost + marginValue);

  return {
    materialsCost,
    laborCost,
    overheadCost,
    subtotalCost,
    marginValue,
    finalPrice,
    breakdown: {
      materials: materialBreakdown,
      labors: laborBreakdown,
      overheadPercent,
      marginPercent,
    },
  };
}
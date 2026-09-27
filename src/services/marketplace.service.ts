import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/slugify';
import {
  CalculateMarketplacePriceInput,
  CreateMarketplaceInput,
  UpdateMarketplaceInput,
} from '../schemas/marketplace.schema';

interface LowValueFeeTier {
  maxValue: number;
  fee: number;
}

interface CalculationBreakdown {
  marketplaceId: string;
  marketplaceName: string;
  productCost: number;
  desiredMarginPercent: number;
  suggestedPrice: number;
  commissionPercent: number;
  commissionValue: number;
  fixedFeeValue: number;
  totalFees: number;
  netReceivedByYou: number;
  effectiveMarginPercent: number;
  effectiveMarginValue: number;
}

function resolveFixedFee(
  price: number,
  fixedFeeValue: number | null,
  lowValueFeeTiers: LowValueFeeTier[] | null
): number {
  if (lowValueFeeTiers && lowValueFeeTiers.length > 0) {
    const sortedTiers = [...lowValueFeeTiers].sort((a, b) => a.maxValue - b.maxValue);
    const matchingTier = sortedTiers.find((tier) => price <= tier.maxValue);
    if (matchingTier) {
      return matchingTier.fee;
    }
  }
  return fixedFeeValue ?? 0;
}

function resolveCommissionValue(
  price: number,
  commissionPercent: number,
  commissionCapValue: number | null
): number {
  const rawCommission = price * (commissionPercent / 100);
  if (commissionCapValue !== null && commissionCapValue !== undefined) {
    return Math.min(rawCommission, commissionCapValue);
  }
  return rawCommission;
}

export async function calculateMarketplacePrice(
  input: CalculateMarketplacePriceInput
): Promise<CalculationBreakdown> {
  const marketplace = await prisma.marketplace.findUnique({
    where: { id: input.marketplaceId },
  });

  if (!marketplace) {
    throw new ApiError(404, 'Marketplace não encontrado.');
  }

  const targetNet = input.productCost * (1 + input.desiredMarginPercent / 100);
  const lowValueFeeTiers =
    (marketplace.lowValueFeeTiers as unknown as LowValueFeeTier[]) ?? null;

  let low = targetNet;
  let high = targetNet * 3 + 1000;
  let bestPrice = high;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const commission = resolveCommissionValue(
      mid,
      marketplace.commissionPercent,
      marketplace.commissionCapValue
    );
    const fixedFee = resolveFixedFee(mid, marketplace.fixedFeeValue, lowValueFeeTiers);
    const net = mid - commission - fixedFee;

    if (Math.abs(net - targetNet) < 0.005) {
      bestPrice = mid;
      break;
    }

    if (net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
    bestPrice = mid;
  }

  const finalCommission = resolveCommissionValue(
    bestPrice,
    marketplace.commissionPercent,
    marketplace.commissionCapValue
  );
  const finalFixedFee = resolveFixedFee(bestPrice, marketplace.fixedFeeValue, lowValueFeeTiers);
  const totalFees = finalCommission + finalFixedFee;
  const netReceived = bestPrice - totalFees;
  const effectiveMarginValue = netReceived - input.productCost;
  const effectiveMarginPercent =
    input.productCost > 0 ? (effectiveMarginValue / input.productCost) * 100 : 0;

  return {
    marketplaceId: marketplace.id,
    marketplaceName: marketplace.name,
    productCost: input.productCost,
    desiredMarginPercent: input.desiredMarginPercent,
    suggestedPrice: Math.round(bestPrice * 100) / 100,
    commissionPercent: marketplace.commissionPercent,
    commissionValue: Math.round(finalCommission * 100) / 100,
    fixedFeeValue: Math.round(finalFixedFee * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    netReceivedByYou: Math.round(netReceived * 100) / 100,
    effectiveMarginPercent: Math.round(effectiveMarginPercent * 100) / 100,
    effectiveMarginValue: Math.round(effectiveMarginValue * 100) / 100,
  };
}

export async function listMarketplaces() {
  return prisma.marketplace.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function createMarketplace(input: CreateMarketplaceInput) {
  const slug = slugify(input.name);

  const existing = await prisma.marketplace.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError(409, 'Já existe um marketplace com esse nome.');
  }

  return prisma.marketplace.create({
    data: {
      name: input.name,
      slug,
      commissionPercent: input.commissionPercent,
      commissionCapValue: input.commissionCapValue ?? null,
      fixedFeeValue: input.fixedFeeValue ?? null,
      lowValueFeeTiers: input.lowValueFeeTiers ?? undefined,
    },
  });
}

export async function updateMarketplace(id: string, input: UpdateMarketplaceInput) {
  const marketplace = await prisma.marketplace.findUnique({ where: { id } });
  if (!marketplace) {
    throw new ApiError(404, 'Marketplace não encontrado.');
  }

  const data: Record<string, unknown> = { ...input };

  if (input.name && input.name !== marketplace.name) {
    const newSlug = slugify(input.name);
    const slugTaken = await prisma.marketplace.findFirst({
      where: { slug: newSlug, NOT: { id } },
    });
    if (slugTaken) {
      throw new ApiError(409, 'Já existe um marketplace com esse nome.');
    }
    data.slug = newSlug;
  }

  return prisma.marketplace.update({ where: { id }, data });
}

export async function deleteMarketplace(id: string) {
  const marketplace = await prisma.marketplace.findUnique({ where: { id } });
  if (!marketplace) {
    throw new ApiError(404, 'Marketplace não encontrado.');
  }

  await prisma.marketplace.delete({ where: { id } });
}
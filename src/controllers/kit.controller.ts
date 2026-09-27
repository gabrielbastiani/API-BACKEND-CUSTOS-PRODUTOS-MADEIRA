import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing, PricingResult } from '../utils/pricingCalculator';

interface KitItemPricing {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface KitPricingResult {
  kitId: string;
  kitName: string;
  items: KitItemPricing[];
  itemsSubtotal: number;
  overheadCost: number;
  subtotalCost: number;
  marginValue: number;
  finalPrice: number;
  overheadPercent: number;
  marginPercent: number;
}

async function loadKitWithRelations(kitId: string) {
  const kit = await prisma.kit.findUnique({
    where: { id: kitId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
  if (!kit) throw new ApiError(404, 'Kit não encontrado.');
  return kit;
}

/**
 * Calcula o subtotalCost (custo puro, sem margem própria) de um produto
 * individual, reaproveitando a mesma função de cálculo usada na tela de
 * produto, para garantir que o custo usado no kit seja idêntico ao custo
 * exibido isoladamente para aquele produto.
 */
async function calculateSingleProductSubtotalCost(productId: string): Promise<{
  name: string;
  subtotalCost: number;
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: true } },
      labors: { include: { laborRate: true } },
    },
  });

  if (!product) {
    throw new ApiError(404, `Produto ${productId} não encontrado.`);
  }

  const result: PricingResult = calculateProductPricing(
    product.materials,
    product.labors,
    Number(product.overheadPercent),
    0
  );

  return { name: product.name, subtotalCost: result.subtotalCost };
}

/**
 * Calcula o preço final do kit somando o custo de cada produto (multiplicado
 * pela quantidade), aplicando depois o overhead e a margem próprios do kit.
 */
async function calculateKitPricing(kit: {
  id: string;
  name: string;
  marginPercent: number;
  overheadPercent: number;
  items: { productId: string; quantity: number }[];
}): Promise<KitPricingResult> {
  const itemsPricing: KitItemPricing[] = [];

  for (const item of kit.items) {
    const { name, subtotalCost } = await calculateSingleProductSubtotalCost(item.productId);
    itemsPricing.push({
      productId: item.productId,
      productName: name,
      quantity: item.quantity,
      unitCost: subtotalCost,
      totalCost: Math.round(subtotalCost * item.quantity * 100) / 100,
    });
  }

  const itemsSubtotal = Math.round(
    itemsPricing.reduce((sum, i) => sum + i.totalCost, 0) * 100
  ) / 100;

  const overheadCost = Math.round(itemsSubtotal * (kit.overheadPercent / 100) * 100) / 100;
  const subtotalCost = Math.round((itemsSubtotal + overheadCost) * 100) / 100;
  const marginValue = Math.round(subtotalCost * (kit.marginPercent / 100) * 100) / 100;
  const finalPrice = Math.round((subtotalCost + marginValue) * 100) / 100;

  return {
    kitId: kit.id,
    kitName: kit.name,
    items: itemsPricing,
    itemsSubtotal,
    overheadCost,
    subtotalCost,
    marginValue,
    finalPrice,
    overheadPercent: kit.overheadPercent,
    marginPercent: kit.marginPercent,
  };
}

export async function createKit(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, marginPercent, overheadPercent, items } = req.body;

    const kit = await prisma.kit.create({
      data: {
        name,
        description,
        marginPercent,
        overheadPercent: overheadPercent ?? 0,
        items: {
          create: items.map((i: { productId: string; quantity: number }) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    res.status(201).json({ success: true, data: kit });
  } catch (error) {
    next(error);
  }
}

export async function listKits(_req: Request, res: Response, next: NextFunction) {
  try {
    const kits = await prisma.kit.findMany({
      orderBy: { name: 'asc' },
      include: { items: { include: { product: true } } },
    });
    res.json({ success: true, data: kits });
  } catch (error) {
    next(error);
  }
}

export async function getKit(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await loadKitWithRelations(req.params.id);
    res.json({ success: true, data: kit });
  } catch (error) {
    next(error);
  }
}

export async function updateKit(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, marginPercent, overheadPercent, items } = req.body;

    await prisma.kit.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new ApiError(404, 'Kit não encontrado.');
    });

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (marginPercent !== undefined) updateData.marginPercent = marginPercent;
    if (overheadPercent !== undefined) updateData.overheadPercent = overheadPercent;

    if (items !== undefined) {
      await prisma.kitItem.deleteMany({ where: { kitId: id } });
      updateData.items = {
        create: items.map((i: { productId: string; quantity: number }) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };
    }

    const kit = await prisma.kit.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true } } },
    });

    res.json({ success: true, data: kit });
  } catch (error) {
    next(error);
  }
}

export async function deleteKit(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.kit.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Calcula o custo e preço final do kit em tempo real, sem salvar snapshot.
 */
export async function calculateKitCost(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await loadKitWithRelations(req.params.id);
    const result = await calculateKitPricing(kit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
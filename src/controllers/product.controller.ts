import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing } from '../utils/pricingCalculator';
import { calculateAutomaticOverhead } from '../utils/overheadCalculator';
import { OverheadInput } from '../utils/pricingCalculator';
import { calculateBreakEven } from '../utils/breakEvenCalculator';
import { generateProductLabelsPdf, LabelFormat } from '../utils/pdf/productLabelPdf';

export async function generateProductLabels(req: Request, res: Response, next: NextFunction) {
  try {
    const { productIds, format } = req.body as { productIds: string[]; format: LabelFormat };

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

    // Como Image não tem relação direta com Product no schema (é vinculada
    // via ownerType/ownerId de forma genérica), buscamos as imagens de todos
    // os produtos envolvidos em uma única consulta, e depois associamos cada
    // uma ao produto correspondente pelo ownerId.
    const images = await prisma.image.findMany({
      where: { ownerType: 'PRODUCT', ownerId: { in: productIds } },
      orderBy: { createdAt: 'asc' },
    });

    const imagesByProductId = new Map<string, string>();
    for (const image of images) {
      if (!imagesByProductId.has(image.ownerId)) {
        imagesByProductId.set(image.ownerId, image.url);
      }
    }

    const labelsData = await Promise.all(
      products.map(async (product) => {
        const overheadInput = await buildOverheadInput(product);
        const pricing = calculateProductPricing(
          product.materials,
          product.labors,
          overheadInput,
          Number(product.marginPercent)
        );

        return {
          name: product.name,
          description: product.description,
          finalPrice: pricing.finalPrice,
          imageUrl: imagesByProductId.get(product.id) ?? null,
        };
      })
    );

    const pdfBuffer = await generateProductLabelsPdf(labelsData, format ?? 'SMALL');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="etiquetas-produtos.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o ponto de equilíbrio (break-even) do produto: quantas unidades
 * mensais são necessárias para cobrir o custo fixo total do negócio, dado o
 * preço de venda e o custo variável unitário deste produto.
 */
export async function calculateProductBreakEven(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const product = await loadProductWithRelations(req.params.id);
    const overheadInput = await buildOverheadInput(product);

    const pricing = calculateProductPricing(
      product.materials,
      product.labors,
      overheadInput,
      Number(product.marginPercent)
    );

    const activeFixedCosts = await prisma.fixedCost.findMany({
      where: { isActive: true },
    });
    const totalFixedCostMonthly = activeFixedCosts.reduce(
      (sum, item) => sum + Number(item.monthlyValue),
      0
    );

    // Custo variável unitário = materiais + mão de obra (exclui overhead fixo
    // rateado e a margem de lucro, que não variam proporcionalmente à venda).
    const variableCostPerUnit = pricing.materialsCost + pricing.laborCost;

    const breakEven = calculateBreakEven({
      finalPrice: pricing.finalPrice,
      variableCostPerUnit,
      totalFixedCostMonthly,
    });

    res.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        finalPrice: pricing.finalPrice,
        variableCostPerUnit: round2(variableCostPerUnit),
        totalFixedCostMonthly: round2(totalFixedCostMonthly),
        ...breakEven,
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * Monta o input de overhead (manual ou automático) que será passado ao
 * calculador de precificação, de acordo com o modo configurado no produto.
 */
async function buildOverheadInput(product: {
  overheadMode: 'MANUAL' | 'AUTOMATIC';
  overheadPercent: Prisma.Decimal | number;
  labors: { hoursSpent: Prisma.Decimal | number }[];
}): Promise<OverheadInput> {
  if (product.overheadMode === 'MANUAL') {
    return { mode: 'MANUAL', overheadPercent: Number(product.overheadPercent) };
  }

  const [settings, fixedCosts] = await Promise.all([
    prisma.workshopSettings.findFirst(),
    prisma.fixedCost.findMany({ where: { isActive: true } }),
  ]);

  const monthlyProductiveHours = Number(settings?.monthlyProductiveHours ?? 0);
  const totalFixedCostMonthly = fixedCosts.reduce(
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
    mode: 'AUTOMATIC',
    overheadCostPerUnit,
    monthlyProductiveHours,
    unitsProducibleMonthly,
    totalFixedCostMonthly,
    isConfigured,
  };
}

async function loadProductWithRelations(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: { include: { suppliers: true } } } },
      labors: { include: { laborRate: true } },
      overheadItems: true,
    },
  });
  if (!product) throw new ApiError(404, 'Produto não encontrado.');
  return product;
}

/**
 * Calcula o custo direto (materiais + mão de obra) de um produto,
 * usado como base para converter a soma dos itens de overhead em percentual.
 */
async function calculateDirectCost(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: { include: { suppliers: true } } } },
      labors: { include: { laborRate: true } },
    },
  });

  if (!product) return 0;

  const result = calculateProductPricing(product.materials, product.labors, 0, 0);
  return result.materialsCost + result.laborCost;
}

function sumOverheadItems(items: { value: number }[]): number {
  return items.reduce((sum, item) => sum + item.value, 0);
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, marginPercent, overheadMode, overheadItems, materials, labors } =
      req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        marginPercent: marginPercent ?? 0,
        overheadPercent: 0,
        overheadMode: overheadMode ?? 'MANUAL',
        materials: materials
          ? {
            create: materials.map((m: any) => ({
              rawMaterialId: m.rawMaterialId,
              quantityUsed: m.quantityUsed,
              wastePercent: m.wastePercent ?? 0,
            })),
          }
          : undefined,
        labors: labors
          ? {
            create: labors.map((l: any) => ({
              laborRateId: l.laborRateId,
              hoursSpent: l.hoursSpent,
            })),
          }
          : undefined,
        overheadItems:
          overheadItems && overheadItems.length > 0
            ? {
              create: overheadItems.map((item: any) => ({
                name: item.name,
                value: item.value,
              })),
            }
            : undefined,
      },
      include: {
        materials: { include: { rawMaterial: true } },
        labors: { include: { laborRate: true } },
        overheadItems: true,
      },
    });

    // O recálculo automático de overheadPercent só se aplica ao modo manual;
    // no modo automático o overhead é sempre derivado em tempo real.
    if (
      (overheadMode ?? 'MANUAL') === 'MANUAL' &&
      overheadItems &&
      overheadItems.length > 0
    ) {
      const directCost = await calculateDirectCost(product.id);
      const overheadTotal = sumOverheadItems(overheadItems);
      const overheadPercent = directCost > 0 ? (overheadTotal / directCost) * 100 : 0;

      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { overheadPercent },
        include: {
          materials: { include: { rawMaterial: true } },
          labors: { include: { laborRate: true } },
          overheadItems: true,
        },
      });

      res.status(201).json({ success: true, data: updated });
      return;
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { materials: true, labors: true, overheadItems: true },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await loadProductWithRelations(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, marginPercent, overheadMode, overheadItems } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) throw new ApiError(404, 'Produto não encontrado.');

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (marginPercent !== undefined) updateData.marginPercent = marginPercent;
    if (overheadMode !== undefined) updateData.overheadMode = overheadMode;

    const effectiveMode = overheadMode ?? existingProduct.overheadMode;

    if (overheadItems !== undefined) {
      await prisma.productOverheadItem.deleteMany({ where: { productId: id } });

      updateData.overheadItems = {
        create: overheadItems.map((item: any) => ({
          name: item.name,
          value: item.value,
        })),
      };

      if (effectiveMode === 'MANUAL') {
        const directCost = await calculateDirectCost(id);
        const overheadTotal = sumOverheadItems(overheadItems);
        updateData.overheadPercent = directCost > 0 ? (overheadTotal / directCost) * 100 : 0;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        materials: { include: { rawMaterial: true } },
        labors: { include: { laborRate: true } },
        overheadItems: true,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addMaterialToProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { rawMaterialId, quantityUsed, wastePercent } = req.body;

    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new ApiError(404, 'Produto não encontrado.');
    });

    const item = await prisma.productMaterial.create({
      data: {
        productId: id,
        rawMaterialId,
        quantityUsed,
        wastePercent: wastePercent ?? 0,
      },
      include: { rawMaterial: true },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function removeMaterialFromProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialItemId } = req.params;
    await prisma.productMaterial.delete({ where: { id: materialItemId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addLaborToProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { laborRateId, hoursSpent } = req.body;

    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new ApiError(404, 'Produto não encontrado.');
    });

    const item = await prisma.productLabor.create({
      data: { productId: id, laborRateId, hoursSpent },
      include: { laborRate: true },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function removeLaborFromProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { laborItemId } = req.params;
    await prisma.productLabor.delete({ where: { id: laborItemId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function calculateProductCost(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await loadProductWithRelations(req.params.id);
    const overheadInput = await buildOverheadInput(product);

    const result = calculateProductPricing(
      product.materials,
      product.labors,
      overheadInput,
      Number(product.marginPercent)
    );

    res.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function saveProductCostSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await loadProductWithRelations(req.params.id);
    const overheadInput = await buildOverheadInput(product);

    const result = calculateProductPricing(
      product.materials,
      product.labors,
      overheadInput,
      Number(product.marginPercent)
    );

    const snapshot = await prisma.productCostSnapshot.create({
      data: {
        productId: product.id,
        materialsCost: result.materialsCost,
        laborCost: result.laborCost,
        overheadCost: result.overheadCost,
        subtotalCost: result.subtotalCost,
        marginValue: result.marginValue,
        finalPrice: result.finalPrice,
        breakdown: result.breakdown as any,
      },
    });

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
}

export async function listProductCostHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const history = await prisma.productCostSnapshot.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}
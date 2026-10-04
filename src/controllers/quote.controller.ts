import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateProductPricing } from '../utils/pricingCalculator';
import { calculateAutomaticOverhead } from '../utils/overheadCalculator';
import { calculateQuoteTotals } from '../utils/quoteCalculator';
import { generateQuotePdf } from '../utils/pdf/quotePdf';
import { Prisma } from '@prisma/client';
import { serializePrisma } from '../utils/serializePrisma';

const BUSINESS_NAME = 'Wood Pricing';

async function buildOverheadInputForProduct(product: {
  overheadMode: 'MANUAL' | 'AUTOMATIC';
  overheadPercent: Prisma.Decimal | number;
  labors: { hoursSpent: Prisma.Decimal | number }[];
}) {
  if (product.overheadMode === 'MANUAL') {
    return { mode: 'MANUAL' as const, overheadPercent: Number(product.overheadPercent) };
  }

  const [settings, activeFixedCosts] = await Promise.all([
    prisma.workshopSettings.findFirst(),
    prisma.fixedCost.findMany({ where: { isActive: true } }),
  ]);

  const monthlyProductiveHours = Number(settings?.monthlyProductiveHours ?? 0);
  const totalFixedCostMonthly = activeFixedCosts.reduce(
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

async function getProductFinalPrice(productId: string): Promise<{ name: string; price: number }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materials: { include: { rawMaterial: { include: { suppliers: true } } } },
      labors: { include: { laborRate: true } },
    },
  });

  if (!product) throw new ApiError(404, `Produto ${productId} não encontrado.`);

  const overheadInput = await buildOverheadInputForProduct(product);
  const pricing = calculateProductPricing(
    product.materials,
    product.labors,
    overheadInput,
    Number(product.marginPercent)
  );

  return { name: product.name, price: pricing.finalPrice };
}

function serializeQuote(quote: any) {
  return serializePrisma(quote);
}

/* function serializeQuote(quote: any) {
  return {
    ...quote,
    discountValue: Number(quote.discountValue),
    subtotal: Number(quote.subtotal),
    discountAmount: Number(quote.discountAmount),
    totalAmount: Number(quote.totalAmount),
    items: quote.items.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
  };
} */

export async function createQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientName, clientContact, discountType, discountValue, validityDays, notes, items } =
      req.body;

    const resolvedItems = await Promise.all(
      items.map(async (item: { productId: string; quantity: number }) => {
        const { name, price } = await getProductFinalPrice(item.productId);
        return {
          productId: item.productId,
          productName: name,
          quantity: item.quantity,
          unitPrice: price,
        };
      })
    );

    const totals = calculateQuoteTotals(resolvedItems, discountType, discountValue);

    const quote = await prisma.quote.create({
      data: {
        clientName,
        clientContact,
        discountType,
        discountValue,
        validityDays,
        notes,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        items: {
          create: totals.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: serializeQuote(quote) });
  } catch (error) {
    next(error);
  }
}

export async function updateQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { clientName, clientContact, discountType, discountValue, validityDays, notes, items } =
      req.body;

    const existingQuote = await prisma.quote.findUnique({ where: { id } });
    if (!existingQuote) throw new ApiError(404, 'Orçamento não encontrado.');

    const totals = calculateQuoteTotals(items, discountType, discountValue);

    const quote = await prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });

      return tx.quote.update({
        where: { id },
        data: {
          clientName,
          clientContact,
          discountType,
          discountValue,
          validityDays,
          notes,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: totals.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { items: true },
      });
    });

    res.json({ success: true, data: serializeQuote(quote) });
  } catch (error) {
    next(error);
  }
}

export async function listQuotes(_req: Request, res: Response, next: NextFunction) {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { sequenceNumber: 'desc' },
      include: { items: true },
    });
    res.json({ success: true, data: quotes.map(serializeQuote) });
  } catch (error) {
    next(error);
  }
}

export async function getQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!quote) throw new ApiError(404, 'Orçamento não encontrado.');

    const serialized = serializeQuote(quote);

    res.json({ success: true, data: serialized });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuote(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.quote.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function downloadQuotePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!quote) throw new ApiError(404, 'Orçamento não encontrado.');

    const pdfBuffer = await generateQuotePdf({
      quoteNumber: quote.sequenceNumber,
      clientName: quote.clientName,
      clientContact: quote.clientContact,
      createdAt: quote.createdAt,
      validityDays: quote.validityDays,
      notes: quote.notes,
      items: quote.items.map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      subtotal: Number(quote.subtotal),
      discountAmount: Number(quote.discountAmount),
      totalAmount: Number(quote.totalAmount),
      businessName: BUSINESS_NAME,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="orcamento-${String(quote.sequenceNumber).padStart(4, '0')}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
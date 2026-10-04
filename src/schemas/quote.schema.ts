import { z } from 'zod';

export const quoteItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.number().min(0).optional(),
});

export const createQuoteSchema = z.object({
  body: z.object({
    clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
    clientContact: z.string().optional(),
    discountType: z.enum(['NONE', 'PERCENT', 'FIXED']).optional().default('NONE'),
    discountValue: z.number().min(0).optional().default(0),
    validityDays: z.number().int().positive().optional().default(7),
    notes: z.string().optional(),
    items: z.array(quoteItemSchema).min(1, 'Adicione ao menos um item ao orçamento'),
  }),
});

export const updateQuoteSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
    clientContact: z.string().optional().nullable(),
    discountType: z.enum(['NONE', 'PERCENT', 'FIXED']),
    discountValue: z.number().min(0),
    validityDays: z.number().int().positive(),
    notes: z.string().optional().nullable(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          productName: z.string().min(1),
          quantity: z.number().positive(),
          unitPrice: z.number().min(0),
        })
      )
      .min(1, 'Adicione ao menos um item ao orçamento'),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
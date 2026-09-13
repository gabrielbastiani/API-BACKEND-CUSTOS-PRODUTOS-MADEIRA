import { z } from 'zod';

const unitEnum = z.enum(['MM', 'CM', 'M', 'M2', 'M3', 'UNIDADE', 'GRAMA', 'KG', 'ML', 'LITRO']);

export const createRawMaterialSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    supplierId: z.string().uuid().optional(),

    purchaseUnit: unitEnum,
    purchaseQty: z.number().positive('Quantidade comprada deve ser positiva'),
    purchasePrice: z.number().nonnegative('Preço não pode ser negativo'),

    usageUnit: unitEnum,
    conversionFactor: z.number().positive('Fator de conversão deve ser positivo'),

    stockQty: z.number().nonnegative().optional(),
    minStockAlert: z.number().nonnegative().optional(),
  }),
});

export const updateRawMaterialSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createRawMaterialSchema.shape.body.partial(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
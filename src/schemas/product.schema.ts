import { z } from 'zod';

export const overheadItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome do custo indireto é obrigatório'),
  value: z.number().nonnegative('Valor não pode ser negativo'),
});
export const overheadModeSchema = z.enum(['MANUAL', 'AUTOMATIC']);

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    description: z.string().optional(),
    marginPercent: z.number().min(0).max(1000).default(0),
    overheadMode: overheadModeSchema.optional().default('MANUAL'),
    overheadItems: z.array(overheadItemSchema).optional().default([]),
    materials: z
      .array(
        z.object({
          rawMaterialId: z.string().uuid(),
          quantityUsed: z.number().positive(),
          wastePercent: z.number().min(0).max(100).default(0),
        })
      )
      .optional()
      .default([]),
    labors: z
      .array(
        z.object({
          laborRateId: z.string().uuid(),
          hoursSpent: z.number().positive(),
        })
      )
      .optional()
      .default([]),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    marginPercent: z.number().min(0).max(1000).optional(),
    overheadMode: overheadModeSchema.optional(),
    overheadItems: z.array(overheadItemSchema).optional(),
  }),
});

const materialItemSchema = z.object({
  rawMaterialId: z.string().uuid(),
  quantityUsed: z.number().positive(),
  wastePercent: z.number().min(0).max(100).optional(),
});

const laborItemSchema = z.object({
  laborRateId: z.string().uuid(),
  hoursSpent: z.number().positive(),
});

export const addMaterialSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: materialItemSchema,
});

export const addLaborSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: laborItemSchema,
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const materialItemParamSchema = z.object({
  params: z.object({ id: z.string().uuid(), materialItemId: z.string().uuid() }),
});

export const laborItemParamSchema = z.object({
  params: z.object({ id: z.string().uuid(), laborItemId: z.string().uuid() }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
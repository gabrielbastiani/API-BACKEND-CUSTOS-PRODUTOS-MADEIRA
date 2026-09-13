import { z } from 'zod';

const materialItemSchema = z.object({
  rawMaterialId: z.string().uuid(),
  quantityUsed: z.number().positive(),
  wastePercent: z.number().min(0).max(100).optional(),
});

const laborItemSchema = z.object({
  laborRateId: z.string().uuid(),
  hoursSpent: z.number().positive(),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    marginPercent: z.number().min(0).max(1000).optional(),
    overheadPercent: z.number().min(0).max(1000).optional(),
    materials: z.array(materialItemSchema).optional(),
    labors: z.array(laborItemSchema).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    marginPercent: z.number().min(0).max(1000).optional(),
    overheadPercent: z.number().min(0).max(1000).optional(),
  }),
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
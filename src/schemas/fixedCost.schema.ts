import { z } from 'zod';

export const createFixedCostSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    monthlyValue: z.number().nonnegative('Valor não pode ser negativo'),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateFixedCostSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createFixedCostSchema.shape.body.partial(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
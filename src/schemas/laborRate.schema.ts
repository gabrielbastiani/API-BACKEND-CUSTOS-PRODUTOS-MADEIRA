import { z } from 'zod';

export const createLaborRateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    hourlyRate: z.number().positive('Valor hora deve ser positivo'),
  }),
});

export const updateLaborRateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createLaborRateSchema.shape.body.partial(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
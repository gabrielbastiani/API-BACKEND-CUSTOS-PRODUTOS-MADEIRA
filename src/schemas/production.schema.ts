import { z } from 'zod';

export const produceProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    quantityProduced: z.number().positive('Quantidade produzida deve ser positiva'),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type ProduceProductInput = z.infer<typeof produceProductSchema>['body'];
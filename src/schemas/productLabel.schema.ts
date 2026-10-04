import { z } from 'zod';

export const generateLabelsSchema = z.object({
  body: z.object({
    productIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um produto'),
    format: z.enum(['SMALL', 'CARD']).optional().default('SMALL'),
  }),
});
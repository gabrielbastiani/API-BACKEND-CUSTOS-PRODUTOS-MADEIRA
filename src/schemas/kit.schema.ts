import { z } from 'zod';

export const kitItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createKitSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    description: z.string().optional(),
    marginPercent: z.coerce.number().min(0).max(1000),
    overheadPercent: z.coerce.number().min(0).max(1000).optional().default(0),
    items: z.array(kitItemInputSchema).min(2, 'Um kit precisa de ao menos 2 produtos'),
  }),
});

export const updateKitSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    marginPercent: z.coerce.number().min(0).max(1000).optional(),
    overheadPercent: z.coerce.number().min(0).max(1000).optional(),
    items: z.array(kitItemInputSchema).min(2).optional(),
  }),
});

export const kitIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export type CreateKitInput = z.infer<typeof createKitSchema>['body'];
export type UpdateKitInput = z.infer<typeof updateKitSchema>['body'];
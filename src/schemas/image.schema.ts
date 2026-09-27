import { z } from 'zod';

export const imageOwnerParamSchema = z.object({
  params: z.object({
    ownerType: z.enum(['raw-materials', 'suppliers', 'products', 'kits']),
    ownerId: z.string().uuid(),
  }),
});

export const deleteImageParamSchema = z.object({
  params: z.object({
    imageId: z.string().uuid(),
  }),
});

export type ImageOwnerParam = z.infer<typeof imageOwnerParamSchema>['params'];
import { z } from 'zod';

export const calculateMarketplacePriceSchema = z.object({
  body: z.object({
    marketplaceId: z.string().uuid('Marketplace inválido'),
    productCost: z.coerce.number().positive('O custo deve ser positivo'),
    desiredMarginPercent: z.coerce.number().min(0).max(1000),
  }),
});

const feeTierSchema = z.object({
  maxValue: z.coerce.number().positive(),
  fee: z.coerce.number().nonnegative(),
});

export const createMarketplaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    commissionPercent: z.coerce.number().min(0).max(100),
    commissionCapValue: z.coerce.number().positive().optional().nullable(),
    fixedFeeValue: z.coerce.number().nonnegative().optional().nullable(),
    lowValueFeeTiers: z.array(feeTierSchema).optional().nullable(),
  }),
});

export const updateMarketplaceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    commissionPercent: z.coerce.number().min(0).max(100).optional(),
    commissionCapValue: z.coerce.number().positive().optional().nullable(),
    fixedFeeValue: z.coerce.number().nonnegative().optional().nullable(),
    lowValueFeeTiers: z.array(feeTierSchema).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteMarketplaceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export type CalculateMarketplacePriceInput = z.infer<
  typeof calculateMarketplacePriceSchema
>['body'];
export type CreateMarketplaceInput = z.infer<typeof createMarketplaceSchema>['body'];
export type UpdateMarketplaceInput = z.infer<typeof updateMarketplaceSchema>['body'];
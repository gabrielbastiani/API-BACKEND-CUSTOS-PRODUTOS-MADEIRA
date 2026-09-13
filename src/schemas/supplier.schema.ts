import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    contact: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createSupplierSchema.shape.body.partial(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
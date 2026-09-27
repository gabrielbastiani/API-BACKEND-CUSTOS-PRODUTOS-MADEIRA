import { z } from 'zod';

const unitEnum = z.enum(['MM', 'CM', 'M', 'M2', 'M3', 'UNIDADE', 'GRAMA', 'KG', 'ML', 'LITRO']);

export const createRawMaterialSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),

    usageUnit: unitEnum,
    conversionFactor: z.number().positive('Fator de conversão deve ser positivo'),

    stockQty: z.number().nonnegative().optional(),
    minStockAlert: z.number().nonnegative().optional(),

    // Fornecedor inicial, opcional na criação (permite cadastrar o material
    // primeiro e vincular fornecedor depois, embora o fluxo comum seja informar já aqui)
    supplierId: z.string().uuid().optional(),
    purchaseUnit: unitEnum.optional(),
    purchaseQty: z.number().positive('Quantidade comprada deve ser positiva').optional(),
    purchasePrice: z.number().nonnegative('Preço não pode ser negativo').optional(),
  }).refine(
    (data) => {
      const hasAnySupplierField =
        data.supplierId || data.purchaseUnit || data.purchaseQty !== undefined || data.purchasePrice !== undefined;
      if (!hasAnySupplierField) return true;
      return !!(data.supplierId && data.purchaseUnit && data.purchaseQty !== undefined && data.purchasePrice !== undefined);
    },
    { message: 'Para cadastrar um fornecedor, informe supplierId, purchaseUnit, purchaseQty e purchasePrice juntos.' }
  ),
});

export const updateRawMaterialSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    usageUnit: unitEnum.optional(),
    conversionFactor: z.number().positive('Fator de conversão deve ser positivo').optional(),
    stockQty: z.number().nonnegative().optional(),
    minStockAlert: z.number().nonnegative().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const restockSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    quantity: z.number().positive('Quantidade de reposição deve ser positiva'),
    note: z.string().optional(),
    supplierId: z.string().uuid().optional(),
  }),
});

export const adjustStockSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    quantity: z.number(),
    note: z.string().min(1, 'Informe o motivo do ajuste manual'),
  }),
});

// --- Novos schemas para fornecedores de material ---

export const materialIdParamSchema = z.object({
  params: z.object({ materialId: z.string().uuid() }),
});

export const materialSupplierIdParamSchema = z.object({
  params: z.object({
    materialId: z.string().uuid(),
    supplierEntryId: z.string().uuid(),
  }),
});

export const addMaterialSupplierSchema = z.object({
  params: z.object({ materialId: z.string().uuid() }),
  body: z.object({
    supplierId: z.string().uuid(),
    purchaseUnit: unitEnum,
    purchaseQty: z.number().positive('Quantidade comprada deve ser positiva'),
    purchasePrice: z.number().nonnegative('Preço não pode ser negativo'),
    isDefault: z.boolean().optional(),
  }),
});

export const updateMaterialSupplierSchema = z.object({
  params: z.object({
    materialId: z.string().uuid(),
    supplierEntryId: z.string().uuid(),
  }),
  body: z.object({
    purchaseUnit: unitEnum.optional(),
    purchaseQty: z.number().positive('Quantidade comprada deve ser positiva').optional(),
    purchasePrice: z.number().nonnegative('Preço não pode ser negativo').optional(),
  }),
});

export const setDefaultMaterialSupplierSchema = z.object({
  params: z.object({
    materialId: z.string().uuid(),
    supplierEntryId: z.string().uuid(),
  }),
});
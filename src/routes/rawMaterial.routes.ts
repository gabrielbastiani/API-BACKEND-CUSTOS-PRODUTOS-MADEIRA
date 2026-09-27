import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createRawMaterial,
  listRawMaterials,
  getRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  restockRawMaterial,
  adjustRawMaterialStock,
  listStockMovements,
  listLowStockMaterials,
  addMaterialSupplier,
  updateMaterialSupplier,
  removeMaterialSupplier,
  setDefaultMaterialSupplier,
  listMaterialPriceHistory,
} from '../controllers/rawMaterial.controller';
import {
  createRawMaterialSchema,
  updateRawMaterialSchema,
  idParamSchema,
  restockSchema,
  adjustStockSchema,
  materialIdParamSchema,
  addMaterialSupplierSchema,
  updateMaterialSupplierSchema,
  materialSupplierIdParamSchema,
  setDefaultMaterialSupplierSchema,
} from '../schemas/rawMaterial.schema';

const router = Router();

// Rotas para Matérias-Primas
router.post('/', validate(createRawMaterialSchema), createRawMaterial);
router.get('/', listRawMaterials);
router.get('/low-stock', listLowStockMaterials);
router.get('/:id', validate(idParamSchema), getRawMaterial);
router.put('/:id', validate(updateRawMaterialSchema), updateRawMaterial);
router.delete('/:id', validate(idParamSchema), deleteRawMaterial);

// Rotas para Movimentação de Estoque
router.post('/:id/restock', validate(restockSchema), restockRawMaterial);
router.post('/:id/adjust-stock', validate(adjustStockSchema), adjustRawMaterialStock);
router.get('/:id/stock-movements', validate(idParamSchema), listStockMovements);

// --- Novas Rotas para Fornecedores de Matéria-Prima ---
router.post(
  '/:materialId/suppliers',
  validate(addMaterialSupplierSchema),
  addMaterialSupplier
);
router.put(
  '/:materialId/suppliers/:supplierEntryId',
  validate(updateMaterialSupplierSchema),
  updateMaterialSupplier
);
router.delete(
  '/:materialId/suppliers/:supplierEntryId',
  validate(materialSupplierIdParamSchema),
  removeMaterialSupplier
);
router.patch(
  '/:materialId/suppliers/:supplierEntryId/set-default',
  validate(setDefaultMaterialSupplierSchema),
  setDefaultMaterialSupplier
);
router.get(
  '/:materialId/suppliers/:supplierEntryId/price-history',
  validate(materialSupplierIdParamSchema),
  listMaterialPriceHistory
);

export default router;
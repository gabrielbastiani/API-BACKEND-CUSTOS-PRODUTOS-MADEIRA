import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createProductSchema,
  updateProductSchema,
  addMaterialSchema,
  addLaborSchema,
  idParamSchema,
  materialItemParamSchema,
  laborItemParamSchema,
} from '../schemas/product.schema';
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  addMaterialToProduct,
  removeMaterialFromProduct,
  addLaborToProduct,
  removeLaborFromProduct,
  calculateProductCost,
  saveProductCostSnapshot,
  listProductCostHistory,
} from '../controllers/product.controller';
import { produceProductSchema, idParamSchema as productionIdParamSchema } from '../schemas/production.schema';
import { produceProduct, listProductionHistory } from '../controllers/production.controller';

const router = Router();

router.post('/', validate(createProductSchema), createProduct);
router.get('/', listProducts);
router.get('/:id', validate(idParamSchema), getProduct);
router.put('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', validate(idParamSchema), deleteProduct);

router.post('/:id/materials', validate(addMaterialSchema), addMaterialToProduct);
router.delete(
  '/:id/materials/:materialItemId',
  validate(materialItemParamSchema),
  removeMaterialFromProduct
);

router.post('/:id/labors', validate(addLaborSchema), addLaborToProduct);
router.delete(
  '/:id/labors/:laborItemId',
  validate(laborItemParamSchema),
  removeLaborFromProduct
);

router.get('/:id/calculate', validate(idParamSchema), calculateProductCost);
router.post('/:id/calculate/save', validate(idParamSchema), saveProductCostSnapshot);
router.get('/:id/history', validate(idParamSchema), listProductCostHistory);

router.post('/:id/produce', validate(produceProductSchema), produceProduct);
router.get('/:id/production-history', validate(productionIdParamSchema), listProductionHistory);

export default router;
import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createRawMaterialSchema,
  updateRawMaterialSchema,
  idParamSchema,
} from '../schemas/rawMaterial.schema';
import {
  createRawMaterial,
  listRawMaterials,
  getRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} from '../controllers/rawMaterial.controller';

const router = Router();

router.post('/', validate(createRawMaterialSchema), createRawMaterial);
router.get('/', listRawMaterials);
router.get('/:id', validate(idParamSchema), getRawMaterial);
router.put('/:id', validate(updateRawMaterialSchema), updateRawMaterial);
router.delete('/:id', validate(idParamSchema), deleteRawMaterial);

export default router;
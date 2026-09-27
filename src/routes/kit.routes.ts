import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { createKitSchema, updateKitSchema, kitIdParamSchema } from '../schemas/kit.schema';
import {
  createKit,
  listKits,
  getKit,
  updateKit,
  deleteKit,
  calculateKitCost,
} from '../controllers/kit.controller';

const router = Router();

router.post('/', validate(createKitSchema), createKit);
router.get('/', listKits);
router.get('/:id', validate(kitIdParamSchema), getKit);
router.put('/:id', validate(updateKitSchema), updateKit);
router.delete('/:id', validate(kitIdParamSchema), deleteKit);
router.get('/:id/calculate', validate(kitIdParamSchema), calculateKitCost);

export default router;
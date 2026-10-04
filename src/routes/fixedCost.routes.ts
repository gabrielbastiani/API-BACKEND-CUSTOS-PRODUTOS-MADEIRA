import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createFixedCostSchema,
  updateFixedCostSchema,
  idParamSchema,
} from '../schemas/fixedCost.schema';
import {
  createFixedCost,
  listFixedCosts,
  getFixedCost,
  updateFixedCost,
  deleteFixedCost,
} from '../controllers/fixedCost.controller';

const router = Router();

router.post('/', validate(createFixedCostSchema), createFixedCost);
router.get('/', listFixedCosts);
router.get('/:id', validate(idParamSchema), getFixedCost);
router.put('/:id', validate(updateFixedCostSchema), updateFixedCost);
router.delete('/:id', validate(idParamSchema), deleteFixedCost);

export default router;
import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createLaborRateSchema,
  updateLaborRateSchema,
  idParamSchema,
} from '../schemas/laborRate.schema';
import {
  createLaborRate,
  listLaborRates,
  getLaborRate,
  updateLaborRate,
  deleteLaborRate,
} from '../controllers/laborRate.controller';

const router = Router();

router.post('/', validate(createLaborRateSchema), createLaborRate);
router.get('/', listLaborRates);
router.get('/:id', validate(idParamSchema), getLaborRate);
router.put('/:id', validate(updateLaborRateSchema), updateLaborRate);
router.delete('/:id', validate(idParamSchema), deleteLaborRate);

export default router;
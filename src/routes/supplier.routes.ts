import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createSupplierSchema,
  updateSupplierSchema,
  idParamSchema,
} from '../schemas/supplier.schema';
import {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller';

const router = Router();

router.post('/', validate(createSupplierSchema), createSupplier);
router.get('/', listSuppliers);
router.get('/:id', validate(idParamSchema), getSupplier);
router.put('/:id', validate(updateSupplierSchema), updateSupplier);
router.delete('/:id', validate(idParamSchema), deleteSupplier);

export default router;
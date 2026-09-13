import { Router } from 'express';
import supplierRoutes from './supplier.routes';
import rawMaterialRoutes from './rawMaterial.routes';
import laborRateRoutes from './laborRate.routes';
import productRoutes from './product.routes';

const router = Router();

router.use('/suppliers', supplierRoutes);
router.use('/raw-materials', rawMaterialRoutes);
router.use('/labor-rates', laborRateRoutes);
router.use('/products', productRoutes);

export default router;
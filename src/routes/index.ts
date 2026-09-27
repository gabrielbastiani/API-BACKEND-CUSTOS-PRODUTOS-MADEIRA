import { Router } from 'express';
import supplierRoutes from './supplier.routes';
import rawMaterialRoutes from './rawMaterial.routes';
import laborRateRoutes from './laborRate.routes';
import productRoutes from './product.routes';
import imageRoutes from './image.routes';
import marketplaceRoutes from './marketplace.routes';
import kitRoutes from './kit.routes';

const router = Router();

router.use('/suppliers', supplierRoutes);
router.use('/raw-materials', rawMaterialRoutes);
router.use('/labor-rates', laborRateRoutes);
router.use('/products', productRoutes);
router.use('/images', imageRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/kits', kitRoutes);

export default router;
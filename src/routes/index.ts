import { Router } from 'express';
import supplierRoutes from './supplier.routes';
import rawMaterialRoutes from './rawMaterial.routes';
import laborRateRoutes from './laborRate.routes';
import productRoutes from './product.routes';
import imageRoutes from './image.routes';
import marketplaceRoutes from './marketplace.routes';
import kitRoutes from './kit.routes';
import workshopSettingsRoutes from './workshopSettings.routes';
import fixedCostRoutes from './fixedCost.routes';
import businessBreakEvenRoutes from './businessBreakEven.routes';
import profitGoalRoutes from './profitGoal.routes';
import quoteRoutes from './quote.routes';

const router = Router();

router.use('/suppliers', supplierRoutes);
router.use('/raw-materials', rawMaterialRoutes);
router.use('/labor-rates', laborRateRoutes);
router.use('/products', productRoutes);
router.use('/images', imageRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/kits', kitRoutes);

router.use('/workshop-settings', workshopSettingsRoutes);
router.use('/fixed-costs', fixedCostRoutes)

router.use('/business-break-even', businessBreakEvenRoutes);

router.use('/profit-goal', profitGoalRoutes);

router.use('/quotes', quoteRoutes);

export default router;
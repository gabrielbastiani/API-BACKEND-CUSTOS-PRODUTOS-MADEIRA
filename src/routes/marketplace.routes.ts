import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  calculateMarketplacePriceSchema,
  createMarketplaceSchema,
  updateMarketplaceSchema,
  deleteMarketplaceSchema,
} from '../schemas/marketplace.schema';
import {
  calculatePrice,
  getMarketplaces,
  postMarketplace,
  putMarketplace,
  removeMarketplace,
} from '../controllers/marketplace.controller';

const router = Router();

router.post('/calculate', validate(calculateMarketplacePriceSchema), calculatePrice);
router.get('/', getMarketplaces);
router.post('/', validate(createMarketplaceSchema), postMarketplace);
router.put('/:id', validate(updateMarketplaceSchema), putMarketplace);
router.delete('/:id', validate(deleteMarketplaceSchema), removeMarketplace);

export default router;
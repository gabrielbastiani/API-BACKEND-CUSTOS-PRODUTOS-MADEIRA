import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { updateWorkshopSettingsSchema } from '../schemas/workshopSettings.schema';
import { getWorkshopSettings, updateWorkshopSettings } from '../controllers/workshopSettings.controller';

const router = Router();

router.get('/', getWorkshopSettings);
router.put('/', validate(updateWorkshopSettingsSchema), updateWorkshopSettings);

export default router;
import { Router } from 'express';
import { getBusinessBreakEven } from '../controllers/businessBreakEven.controller';

const router = Router();

router.get('/', getBusinessBreakEven);

export default router;
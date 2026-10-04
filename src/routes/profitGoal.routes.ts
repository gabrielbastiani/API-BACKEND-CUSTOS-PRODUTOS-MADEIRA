import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { calculateProfitGoalSchema } from '../schemas/profitGoal.schema';
import { calculateProfitGoal } from '../controllers/profitGoal.controller';

const router = Router();

router.post('/calculate', validate(calculateProfitGoalSchema), calculateProfitGoal);

export default router;
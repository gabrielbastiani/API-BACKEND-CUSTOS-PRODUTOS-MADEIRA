import { z } from 'zod';

export const calculateProfitGoalSchema = z.object({
  body: z.object({
    desiredProfit: z.number().positive('A meta de lucro deve ser maior que zero'),
  }),
});
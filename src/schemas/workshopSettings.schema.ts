import { z } from 'zod';

export const updateWorkshopSettingsSchema = z.object({
  body: z.object({
    monthlyProductiveHours: z.number().nonnegative('Capacidade produtiva não pode ser negativa'),
  }),
});
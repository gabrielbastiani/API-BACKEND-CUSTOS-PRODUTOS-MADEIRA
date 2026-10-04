import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

function serializeSettings(settings: {
  id: string;
  monthlyProductiveHours: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...settings,
    monthlyProductiveHours: Number(settings.monthlyProductiveHours),
  };
}

/**
 * Garante que sempre exista exatamente um registro de configurações da oficina.
 */
async function getOrCreateSettings() {
  const existing = await prisma.workshopSettings.findFirst();
  if (existing) return existing;
  return prisma.workshopSettings.create({ data: { monthlyProductiveHours: 0 } });
}

export async function getWorkshopSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: serializeSettings(settings) });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkshopSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getOrCreateSettings();
    const { monthlyProductiveHours } = req.body;

    const updated = await prisma.workshopSettings.update({
      where: { id: settings.id },
      data: { monthlyProductiveHours },
    });

    res.json({ success: true, data: serializeSettings(updated) });
  } catch (error) {
    next(error);
  }
}
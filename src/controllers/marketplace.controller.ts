import { Request, Response, NextFunction } from 'express';
import {
  calculateMarketplacePrice,
  listMarketplaces,
  createMarketplace,
  updateMarketplace,
  deleteMarketplace,
} from '../services/marketplace.service';

export async function calculatePrice(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await calculateMarketplacePrice(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMarketplaces(_req: Request, res: Response, next: NextFunction) {
  try {
    const marketplaces = await listMarketplaces();
    res.json({ success: true, data: marketplaces });
  } catch (error) {
    next(error);
  }
}

export async function postMarketplace(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await createMarketplace(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

export async function putMarketplace(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await updateMarketplace(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function removeMarketplace(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteMarketplace(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}
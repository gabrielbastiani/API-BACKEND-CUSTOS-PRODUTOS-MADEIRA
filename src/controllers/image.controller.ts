import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { uploadDirPath } from '../config/upload';

const OWNER_TYPE_MAP: Record<string, 'RAW_MATERIAL' | 'SUPPLIER' | 'PRODUCT' | 'KIT'> = {
  'raw-materials': 'RAW_MATERIAL',
  suppliers: 'SUPPLIER',
  products: 'PRODUCT',
  kits: 'KIT',
};

function resolveOwnerType(routeSegment: string) {
  const ownerType = OWNER_TYPE_MAP[routeSegment];
  if (!ownerType) {
    throw new ApiError(400, 'Tipo de entidade inválido para upload de imagem.');
  }
  return ownerType;
}

async function assertOwnerExists(ownerType: string, ownerId: string) {
  if (ownerType === 'RAW_MATERIAL') {
    const exists = await prisma.rawMaterial.findUnique({ where: { id: ownerId } });
    if (!exists) throw new ApiError(404, 'Matéria-prima não encontrada.');
  } else if (ownerType === 'SUPPLIER') {
    const exists = await prisma.supplier.findUnique({ where: { id: ownerId } });
    if (!exists) throw new ApiError(404, 'Fornecedor não encontrado.');
  } else if (ownerType === 'PRODUCT') {
    const exists = await prisma.product.findUnique({ where: { id: ownerId } });
    if (!exists) throw new ApiError(404, 'Produto não encontrado.');
  } else if (ownerType === 'KIT') {
    const exists = await prisma.kit.findUnique({ where: { id: ownerId } });
    if (!exists) throw new ApiError(404, 'Kit não encontrado.');
  }
}

export async function uploadImages(req: Request, res: Response, next: NextFunction) {
  try {
    const { ownerType: routeSegment, ownerId } = req.params;
    const ownerType = resolveOwnerType(routeSegment);
    await assertOwnerExists(ownerType, ownerId);

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new ApiError(400, 'Nenhum arquivo de imagem foi enviado.');
    }

    const created = await prisma.$transaction(
      files.map((file) =>
        prisma.image.create({
          data: {
            ownerType,
            ownerId,
            url: `/uploads/${file.filename}`,
            filename: file.originalname,
          },
        })
      )
    );

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

export async function listImages(req: Request, res: Response, next: NextFunction) {
  try {
    const { ownerType: routeSegment, ownerId } = req.params;
    const ownerType = resolveOwnerType(routeSegment);

    const images = await prisma.image.findMany({
      where: { ownerType, ownerId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: images });
  } catch (error) {
    next(error);
  }
}

export async function deleteImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { imageId } = req.params;

    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new ApiError(404, 'Imagem não encontrada.');
    }

    const filePath = path.join(uploadDirPath, path.basename(image.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.image.delete({ where: { id: imageId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
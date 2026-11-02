import { Request, Response, NextFunction } from 'express';
import { unlink } from 'node:fs/promises';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { deleteStoredUpload, getPublicUploadUrl } from '../config/storage';

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
  const files = req.files as Express.Multer.File[] | undefined;

  try {
    const { ownerType: routeSegment, ownerId } = req.params;
    const ownerType = resolveOwnerType(routeSegment);
    await assertOwnerExists(ownerType, ownerId);

    if (!files || files.length === 0) {
      throw new ApiError(400, 'Nenhum arquivo de imagem foi enviado.');
    }

    const created = await prisma.$transaction(
      files.map((file) =>
        prisma.image.create({
          data: {
            ownerType,
            ownerId,
            url: getPublicUploadUrl(file.filename),
            filename: normalizeOriginalFilename(file.originalname),
          },
        })
      )
    );

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    // O Multer grava antes de o controller executar. Se a validação do dono
    // ou a transação do banco falhar, removemos os arquivos recém-enviados.
    await Promise.all(
      (files ?? []).map((file) =>
        unlink(file.path).catch((cleanupError) => {
          if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error('[images] Falha ao limpar upload não persistido:', cleanupError);
          }
        })
      )
    );
    next(error);
  }
}

function normalizeOriginalFilename(filename: string): string {
  const normalized = filename.normalize('NFC');
  if (!/[ÃÂ]/.test(normalized)) return normalized;

  const decoded = Buffer.from(normalized, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? normalized : decoded.normalize('NFC');
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

    // Primeiro remove a referência do banco; uma falha física posterior
    // pode deixar apenas um arquivo órfão, mas nunca uma imagem apontando
    // para um arquivo que já foi apagado.
    await prisma.image.delete({ where: { id: imageId } });
    await deleteStoredUpload(image.url);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
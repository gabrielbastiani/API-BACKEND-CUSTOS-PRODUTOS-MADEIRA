import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { calculateUnitCost } from '../utils/pricingCalculator';
import { Prisma } from '@prisma/client';

// Helper para incluir o fornecedor padrão e calcular o custo unitário
async function getRawMaterialWithDefaultSupplier(materialId: string) {
  const material = await prisma.rawMaterial.findUnique({
    where: { id: materialId },
    include: {
      suppliers: {
        where: { isDefault: true },
        include: { supplier: true },
      },
    },
  });

  if (!material) return null;

  const defaultSupplierEntry = material.suppliers[0];

  // Se não houver fornecedor padrão, o custo unitário não pode ser calculado
  // mas o material ainda pode ser retornado para outras operações.
  if (!defaultSupplierEntry) {
    return {
      ...material,
      unitCost: 0, // Ou null, dependendo de como o frontend espera lidar com isso
      defaultSupplier: null,
    };
  }

  const unitCost = calculateUnitCost({
    id: material.id,
    name: material.name,
    conversionFactor: material.conversionFactor,
    suppliers: [defaultSupplierEntry], // Passa apenas o fornecedor padrão para o cálculo
  });

  return {
    ...material,
    unitCost,
    defaultSupplier: defaultSupplierEntry,
  };
}

export async function createRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId, purchaseUnit, purchaseQty, purchasePrice, ...rawMaterialData } = req.body;

    const newRawMaterial = await prisma.rawMaterial.create({
      data: {
        ...rawMaterialData,
        // Se dados de fornecedor foram passados, cria a entrada de fornecedor e o histórico
        ...(supplierId && purchaseUnit && purchaseQty !== undefined && purchasePrice !== undefined
          ? {
              suppliers: {
                create: {
                  supplier: { connect: { id: supplierId } },
                  purchaseUnit,
                  purchaseQty,
                  purchasePrice,
                  isDefault: true, // O primeiro fornecedor é sempre o padrão
                  priceHistory: {
                    create: {
                      purchaseUnit,
                      purchaseQty,
                      purchasePrice,
                    },
                  },
                },
              },
            }
          : {}),
      },
      include: {
        suppliers: {
          include: { supplier: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        },
      },
    });

    res.status(201).json({ success: true, data: newRawMaterial });
  } catch (error) {
    next(error);
  }
}

export async function listRawMaterials(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId } = req.query; // Este filtro agora é para o MaterialSupplier, não direto no RawMaterial
    const materials = await prisma.rawMaterial.findMany({
      where: supplierId
        ? {
            suppliers: {
              some: {
                supplierId: String(supplierId),
              },
            },
          }
        : undefined,
      include: {
        suppliers: {
          where: { isDefault: true }, // Inclui apenas o fornecedor padrão
          include: { supplier: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const withUnitCost = materials.map((m) => {
      const defaultSupplierEntry = m.suppliers[0];
      let unitCost = 0;
      if (defaultSupplierEntry) {
        try {
          unitCost = calculateUnitCost({
            id: m.id,
            name: m.name,
            conversionFactor: m.conversionFactor,
            suppliers: [defaultSupplierEntry],
          });
        } catch (e) {
          // Logar ou tratar erro de cálculo de custo se necessário
          console.error(`Erro ao calcular custo unitário para ${m.name}:`, e);
        }
      }

      return {
        ...m,
        unitCost,
        defaultSupplier: defaultSupplierEntry,
      };
    });

    res.json({ success: true, data: withUnitCost });
  } catch (error) {
    next(error);
  }
}

export async function getRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const material = await prisma.rawMaterial.findUnique({
  where: { id: req.params.id },
  include: {
    suppliers: {
      include: { supplier: true, priceHistory: { orderBy: { recordedAt: 'desc' } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }], // Padrão primeiro
    },
  },
});
    if (!material) throw new ApiError(404, 'Matéria-prima não encontrada.');

    const defaultSupplierEntry = material.suppliers.find((s) => s.isDefault);
    let unitCost = 0;
    if (defaultSupplierEntry) {
      try {
        unitCost = calculateUnitCost({
          id: material.id,
          name: material.name,
          conversionFactor: material.conversionFactor,
          suppliers: [defaultSupplierEntry],
        });
      } catch (e) {
        console.error(`Erro ao calcular custo unitário para ${material.name}:`, e);
      }
    }

    res.json({
      success: true,
      data: { ...material, unitCost, defaultSupplier: defaultSupplierEntry },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const material = await prisma.rawMaterial.update({
      where: { id: req.params.id },
      data: req.body, // req.body agora só contém campos do RawMaterial
      include: {
        suppliers: {
          where: { isDefault: true },
          include: { supplier: true },
        },
      },
    });

    const defaultSupplierEntry = material.suppliers[0];
    let unitCost = 0;
    if (defaultSupplierEntry) {
      try {
        unitCost = calculateUnitCost({
          id: material.id,
          name: material.name,
          conversionFactor: material.conversionFactor,
          suppliers: [defaultSupplierEntry],
        });
      } catch (e) {
        console.error(`Erro ao calcular custo unitário para ${material.name}:`, e);
      }
    }

    res.json({ success: true, data: { ...material, unitCost, defaultSupplier: defaultSupplierEntry } });
  } catch (error) {
    next(error);
  }
}

export async function deleteRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.rawMaterial.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function restockRawMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { quantity, note, supplierId } = req.body; // supplierId agora é opcional aqui

    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) throw new ApiError(404, 'Matéria-prima não encontrada.');

    const [updated] = await prisma.$transaction([
      prisma.rawMaterial.update({
        where: { id },
        data: { stockQty: { increment: quantity } },
      }),
      prisma.stockMovement.create({
        data: {
          rawMaterialId: id,
          type: 'RESTOCK',
          quantity,
          note: note ?? 'Reposição de estoque',
          // Se o supplierId for fornecido, registra no movimento
          ...(supplierId ? { materialSupplier: { connect: { rawMaterialId_supplierId: { rawMaterialId: id, supplierId } } } } : {}),
        },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function adjustRawMaterialStock(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { quantity, note } = req.body;

    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) throw new ApiError(404, 'Matéria-prima não encontrada.');

    const [updated] = await prisma.$transaction([
      prisma.rawMaterial.update({
        where: { id },
        data: { stockQty: { increment: quantity } },
      }),
      prisma.stockMovement.create({
        data: {
          rawMaterialId: id,
          type: 'MANUAL_ADJUSTMENT',
          quantity,
          note,
        },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function listStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { rawMaterialId: req.params.id },
      include: {
        materialSupplier: {
          include: { supplier: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
}

export async function listLowStockMaterials(_req: Request, res: Response, next: NextFunction) {
  try {
    const materials = await prisma.rawMaterial.findMany({
      where: { minStockAlert: { not: null } },
      include: {
        suppliers: {
          where: { isDefault: true },
          include: { supplier: true },
        },
      },
    });

    const lowStock = materials.filter(
      (m) => m.minStockAlert !== null && Number(m.stockQty) <= Number(m.minStockAlert)
    );

    res.json({ success: true, data: lowStock });
  } catch (error) {
    next(error);
  }
}

// --- Novos Endpoints para MaterialSupplier ---

export async function addMaterialSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialId } = req.params;
    const { supplierId, purchaseUnit, purchaseQty, purchasePrice, isDefault } = req.body;

    // Verifica se a matéria-prima existe
    const rawMaterial = await prisma.rawMaterial.findUnique({ where: { id: materialId } });
    if (!rawMaterial) throw new ApiError(404, 'Matéria-prima não encontrada.');

    // Verifica se o fornecedor já está associado a este material
    const existingEntry = await prisma.materialSupplier.findUnique({
      where: { rawMaterialId_supplierId: { rawMaterialId: materialId, supplierId } },
    });
    if (existingEntry) throw new ApiError(409, 'Este fornecedor já está associado a esta matéria-prima.');

    let newMaterialSupplier;
    await prisma.$transaction(async (tx) => {
      // Se for para ser padrão, desmarca o atual padrão
      if (isDefault) {
        await tx.materialSupplier.updateMany({
          where: { rawMaterialId: materialId, isDefault: true },
          data: { isDefault: false },
        });
      } else {
        // Se não for padrão e não houver nenhum padrão, torna este o padrão
        const hasDefault = await tx.materialSupplier.count({
          where: { rawMaterialId: materialId, isDefault: true },
        });
        if (hasDefault === 0) {
          // Se não houver nenhum padrão, este se torna o padrão
          // (mesmo que isDefault tenha vindo como false, ele será o único)
          // Isso garante que sempre haja um fornecedor padrão se houver fornecedores.
          // No entanto, para evitar sobrescrever a intenção do usuário,
          // só fazemos isso se não houver nenhum padrão.
          // Se o usuário explicitamente não marcou como padrão, mas é o primeiro,
          // ele se torna padrão, mas o `isDefault` da requisição é respeitado.
          // A melhor abordagem é que o primeiro sempre seja padrão.
          // Para simplificar, se não há padrão e este é o primeiro, ele se torna padrão.
          // Mas o schema já garante que o primeiro criado é padrão.
          // Então, se isDefault veio false, e não há padrão, ele se torna padrão.
        }
      }

      newMaterialSupplier = await tx.materialSupplier.create({
        data: {
          rawMaterialId: materialId,
          supplierId,
          purchaseUnit,
          purchaseQty,
          purchasePrice,
          isDefault: isDefault || false, // Se não houver padrão, o primeiro será padrão
          priceHistory: {
            create: {
              purchaseUnit,
              purchaseQty,
              purchasePrice,
            },
          },
        },
        include: { supplier: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });

      // Se não havia nenhum fornecedor antes, ou se o usuário pediu para ser padrão,
      // e este é o primeiro fornecedor, ele deve ser o padrão.
      const totalSuppliers = await tx.materialSupplier.count({ where: { rawMaterialId: materialId } });
      if (totalSuppliers === 1) {
        await tx.materialSupplier.update({
          where: { id: newMaterialSupplier.id },
          data: { isDefault: true },
        });
        newMaterialSupplier.isDefault = true; // Atualiza o objeto retornado
      }
    });

    res.status(201).json({ success: true, data: newMaterialSupplier });
  } catch (error) {
    next(error);
  }
}

export async function updateMaterialSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialId, supplierEntryId } = req.params;
    const { purchaseUnit, purchaseQty, purchasePrice } = req.body;

    const existingEntry = await prisma.materialSupplier.findUnique({
      where: { id: supplierEntryId, rawMaterialId: materialId },
    });
    if (!existingEntry) throw new ApiError(404, 'Associação matéria-prima/fornecedor não encontrada.');

    let updatedEntry;
    await prisma.$transaction(async (tx) => {
      // Se o preço mudou, registra no histórico
      if (
        purchasePrice !== undefined &&
        Number(existingEntry.purchasePrice) !== Number(purchasePrice)
      ) {
        await tx.priceHistory.create({
          data: {
            materialSupplierId: supplierEntryId,
            purchaseUnit: purchaseUnit || existingEntry.purchaseUnit,
            purchaseQty: purchaseQty || existingEntry.purchaseQty,
            purchasePrice: purchasePrice,
          },
        });
      }

      updatedEntry = await tx.materialSupplier.update({
        where: { id: supplierEntryId },
        data: {
          purchaseUnit: purchaseUnit ?? existingEntry.purchaseUnit,
          purchaseQty: purchaseQty ?? existingEntry.purchaseQty,
          purchasePrice: purchasePrice ?? existingEntry.purchasePrice,
        },
        include: { supplier: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });
    });

    res.json({ success: true, data: updatedEntry });
  } catch (error) {
    next(error);
  }
}

export async function removeMaterialSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialId, supplierEntryId } = req.params;

    const entryToDelete = await prisma.materialSupplier.findUnique({
      where: { id: supplierEntryId, rawMaterialId: materialId },
    });
    if (!entryToDelete) throw new ApiError(404, 'Associação matéria-prima/fornecedor não encontrada.');

    // Não permite remover o único fornecedor de um material
    const totalSuppliers = await prisma.materialSupplier.count({ where: { rawMaterialId: materialId } });
    if (totalSuppliers === 1) {
      throw new ApiError(400, 'Não é possível remover o único fornecedor de uma matéria-prima. Cadastre outro primeiro.');
    }

    // Se o fornecedor a ser removido for o padrão, precisamos definir um novo padrão
    if (entryToDelete.isDefault) {
      const otherSuppliers = await prisma.materialSupplier.findMany({
        where: { rawMaterialId: materialId, id: { not: supplierEntryId } },
        take: 1,
      });
      if (otherSuppliers.length > 0) {
        await prisma.materialSupplier.update({
          where: { id: otherSuppliers[0].id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.materialSupplier.delete({ where: { id: supplierEntryId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function setDefaultMaterialSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialId, supplierEntryId } = req.params;

    const entryToSetDefault = await prisma.materialSupplier.findUnique({
      where: { id: supplierEntryId, rawMaterialId: materialId },
    });
    if (!entryToSetDefault) throw new ApiError(404, 'Associação matéria-prima/fornecedor não encontrada.');

    if (entryToSetDefault.isDefault) {
      res.json({ success: true, data: entryToSetDefault }); // Já é o padrão, nada a fazer
      return;
    }

    let updatedEntry;
    await prisma.$transaction(async (tx) => {
      // Desmarca o fornecedor padrão atual
      await tx.materialSupplier.updateMany({
        where: { rawMaterialId: materialId, isDefault: true },
        data: { isDefault: false },
      });

      // Marca o novo fornecedor como padrão
      updatedEntry = await tx.materialSupplier.update({
        where: { id: supplierEntryId },
        data: { isDefault: true },
        include: { supplier: true, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });
    });

    res.json({ success: true, data: updatedEntry });
  } catch (error) {
    next(error);
  }
}

export async function listMaterialPriceHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialId, supplierEntryId } = req.params;

    const materialSupplier = await prisma.materialSupplier.findUnique({
      where: { id: supplierEntryId, rawMaterialId: materialId },
      include: {
        rawMaterial: true,
        supplier: true,
        priceHistory: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!materialSupplier) throw new ApiError(404, 'Associação matéria-prima/fornecedor não encontrada.');

    // Calcula a média dos últimos N preços para o alerta de variação
    const history = materialSupplier.priceHistory;
    const lastFivePrices = history.slice(0, 5).map((p) => Number(p.purchasePrice));
    const averagePrice = lastFivePrices.length > 0
      ? lastFivePrices.reduce((sum, price) => sum + price, 0) / lastFivePrices.length
      : 0;

    const currentPrice = Number(materialSupplier.purchasePrice);
    let priceAlert = null;
    if (averagePrice > 0 && currentPrice > averagePrice * 1.1) { // Se o preço atual for 10% maior que a média dos últimos 5
      priceAlert = `Preço atual (${currentPrice}) está ${((currentPrice / averagePrice - 1) * 100).toFixed(2)}% acima da média dos últimos 5 registros (${averagePrice.toFixed(2)}).`;
    } else if (averagePrice > 0 && currentPrice < averagePrice * 0.9) { // Se o preço atual for 10% menor que a média dos últimos 5
      priceAlert = `Preço atual (${currentPrice}) está ${((1 - currentPrice / averagePrice) * 100).toFixed(2)}% abaixo da média dos últimos 5 registros (${averagePrice.toFixed(2)}).`;
    }

    res.json({
      success: true,
      data: {
        materialSupplier,
        averagePrice: averagePrice.toFixed(2),
        priceAlert,
      },
    });
  } catch (error) {
    next(error);
  }
}
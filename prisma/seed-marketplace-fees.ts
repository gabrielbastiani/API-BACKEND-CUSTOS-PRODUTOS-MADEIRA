import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/slugify';

const prisma = new PrismaClient();

const defaultMarketplaces = [
  {
    name: 'Mercado Livre',
    commissionPercent: 12,
    commissionCapValue: null,
    fixedFeeValue: null,
    lowValueFeeTiers: [
      { maxValue: 12.5, fee: 6.25 },
      { maxValue: 29, fee: 6.5 },
    ],
  },
  {
    name: 'Shopee',
    commissionPercent: 14,
    commissionCapValue: 100,
    fixedFeeValue: 4,
    lowValueFeeTiers: null,
  },
];

async function main() {
  for (const marketplace of defaultMarketplaces) {
    const slug = slugify(marketplace.name);
    await prisma.marketplace.upsert({
      where: { slug },
      update: {},
      create: {
        name: marketplace.name,
        slug,
        commissionPercent: marketplace.commissionPercent,
        commissionCapValue: marketplace.commissionCapValue,
        fixedFeeValue: marketplace.fixedFeeValue,
        lowValueFeeTiers: marketplace.lowValueFeeTiers ?? undefined,
      },
    });
  }

  console.log('Marketplaces padrão inseridos com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
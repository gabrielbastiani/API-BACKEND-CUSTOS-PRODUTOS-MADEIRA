import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../config/prisma';
import { resolveUploadFilePath, uploadDirPath } from '../config/storage';

async function main() {
  const images = await prisma.image.findMany({
    select: { id: true, filename: true, url: true },
  });

  const referencedFiles = new Set<string>();
  const missing: typeof images = [];
  let validReferences = 0;

  for (const image of images) {
    try {
      const filePath = resolveUploadFilePath(image.url);
      referencedFiles.add(path.basename(filePath));
      if (fs.existsSync(filePath)) {
        validReferences += 1;
      } else {
        missing.push(image);
      }
    } catch {
      missing.push(image);
    }
  }

  const diskFiles = fs.readdirSync(uploadDirPath).filter((filename) => {
    const fullPath = path.join(uploadDirPath, filename);
    return fs.statSync(fullPath).isFile() && filename !== '.gitkeep';
  });
  const orphanFiles = diskFiles.filter((filename) => !referencedFiles.has(filename));

  console.log('Auditoria do armazenamento de imagens');
  console.log(`Diretório físico: ${uploadDirPath}`);
  console.log(`Registros no banco: ${images.length}`);
  console.log(`Arquivos localizados: ${validReferences}`);
  console.log(`Referências sem arquivo: ${missing.length}`);
  console.log(`Arquivos sem referência no banco: ${orphanFiles.length}`);

  if (missing.length > 0) {
    console.log('\nReferências sem arquivo:');
    for (const image of missing) {
      console.log(`- ${image.id} | ${image.filename} | ${image.url}`);
    }
  }

  if (orphanFiles.length > 0) {
    console.log('\nArquivos sem referência no banco (não removidos):');
    for (const filename of orphanFiles) console.log(`- ${filename}`);
  }

  // O script é somente de diagnóstico. Não apaga nem altera registros/arquivos.
  if (missing.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Falha ao auditar o armazenamento:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

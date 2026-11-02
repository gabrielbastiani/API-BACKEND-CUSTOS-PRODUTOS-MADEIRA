import fs from 'node:fs';
import path from 'node:path';

/**
 * Diretório físico dos arquivos enviados.
 *
 * O caminho padrão é relativo à estrutura do projeto, e não ao diretório em
 * que o processo Node foi iniciado. Assim funciona tanto com ts-node-dev
 * (src/config) quanto com o JavaScript compilado (dist/config).
 * Em produção, configure UPLOAD_DIR para um volume persistente absoluto.
 */
const defaultUploadDir = path.resolve(__dirname, '../../uploads');
const configuredUploadDir = process.env.UPLOAD_DIR?.trim();

export const uploadDirPath = configuredUploadDir
  ? path.resolve(configuredUploadDir)
  : defaultUploadDir;

try {
  fs.mkdirSync(uploadDirPath, { recursive: true });
  fs.accessSync(uploadDirPath, fs.constants.R_OK | fs.constants.W_OK);
} catch (error) {
  console.error('[storage] Falha ao preparar diretório de arquivos:', error);
  throw new Error(
    `O diretório de arquivos configurado em UPLOAD_DIR não está acessível para leitura/escrita: ${uploadDirPath}`
  );
}

export function getPublicUploadUrl(filename: string): string {
  return `/uploads/${encodeURIComponent(filename)}`;
}

/**
 * Converte uma URL/referência antiga do banco (por exemplo /uploads/a.jpg)
 * no caminho físico local. Só aceita arquivos diretamente dentro de uploads,
 * impedindo path traversal e evitando apagar arquivos fora do armazenamento.
 */
export function resolveUploadFilePath(storedUrl: string): string {
  let pathname = storedUrl;

  try {
    pathname = new URL(storedUrl).pathname;
  } catch {
    // A referência normalmente é relativa; continua com o valor recebido.
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new Error('Referência de arquivo inválida.');
  }

  // Compatibilidade com referências antigas que possam ter sido gravadas
  // sem a barra inicial.
  if (decodedPath.startsWith('uploads/')) decodedPath = `/${decodedPath}`;

  const marker = '/uploads/';
  const markerIndex = decodedPath.lastIndexOf(marker);
  if (markerIndex < 0) {
    throw new Error('A referência não pertence ao armazenamento local de uploads.');
  }

  const filename = decodedPath.slice(markerIndex + marker.length);
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    path.basename(filename) !== filename
  ) {
    throw new Error('Nome de arquivo inválido.');
  }

  return path.join(uploadDirPath, filename);
}

export async function readStoredUpload(storedUrl: string): Promise<Buffer | null> {
  try {
    return await fs.promises.readFile(resolveUploadFilePath(storedUrl));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn('[storage] Não foi possível ler o arquivo:', storedUrl, error);
    }
    return null;
  }
}

export async function deleteStoredUpload(storedUrl: string): Promise<void> {
  try {
    await fs.promises.unlink(resolveUploadFilePath(storedUrl));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.error('[storage] Não foi possível remover o arquivo:', storedUrl, error);
    }
  }
}

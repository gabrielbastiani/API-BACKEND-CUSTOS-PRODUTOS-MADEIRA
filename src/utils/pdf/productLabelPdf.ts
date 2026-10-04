import PDFDocument from 'pdfkit';
import http from 'node:http';
import https from 'node:https';

export interface ProductLabelData {
  id: string;
  name: string;
  finalPrice: number;
  imageUrl?: string | null;
}

export type LabelLayout = 'SMALL' | 'FICHA';

const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

/**
 * Resolve uma URL de imagem que pode ser relativa (ex: "/uploads/foto.jpg")
 * ou absoluta (ex: "https://cdn.exemplo.com/foto.jpg"), retornando sempre
 * uma URL absoluta válida para ser usada em uma requisição HTTP/HTTPS.
 */
function resolveImageUrl(rawUrl: string): string {
  try {
    // Se já for uma URL absoluta válida, o construtor não lança erro.
    new URL(rawUrl);
    return rawUrl;
  } catch {
    // URL relativa: concatena com a base do próprio backend.
    const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${APP_BASE_URL}${normalizedPath}`;
  }
}

/**
 * Baixa a imagem de uma URL e retorna o buffer.
 * Nunca lança exceção: em caso de qualquer falha (URL inválida, imagem
 * inexistente, timeout, erro de rede), resolve com `null`, permitindo que
 * a etiqueta seja gerada sem foto em vez de quebrar todo o PDF.
 */
function fetchImageBuffer(rawUrl: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let absoluteUrl: string;

    try {
      absoluteUrl = resolveImageUrl(rawUrl);
    } catch (error) {
      console.warn(`[productLabelPdf] URL de imagem inválida, ignorando: ${rawUrl}`);
      resolve(null);
      return;
    }

    const client = absoluteUrl.startsWith('https://') ? https : http;

    const request = client.get(absoluteUrl, { timeout: 5000 }, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        console.warn(
          `[productLabelPdf] Falha ao buscar imagem (status ${response.statusCode}): ${absoluteUrl}`
        );
        response.resume();
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', (error) => {
        console.warn(`[productLabelPdf] Erro ao ler imagem: ${absoluteUrl}`, error.message);
        resolve(null);
      });
    });

    request.on('timeout', () => {
      console.warn(`[productLabelPdf] Timeout ao buscar imagem: ${absoluteUrl}`);
      request.destroy();
      resolve(null);
    });

    request.on('error', (error) => {
      console.warn(`[productLabelPdf] Erro de conexão ao buscar imagem: ${absoluteUrl}`, error.message);
      resolve(null);
    });
  });
}

function formatCurrency(value: number | undefined | null): string {
  const safeValue = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return `R$ ${safeValue.toFixed(2).replace('.', ',')}`;
}

async function renderSmallLabels(doc: PDFKit.PDFDocument, products: ProductLabelData[]) {
  const labelWidth = 180;
  const labelHeight = 100;
  const marginX = 20;
  const marginY = 20;
  const perRow = 3;

  let x = marginX;
  let y = marginY;
  let col = 0;

  for (const product of products) {
    doc.rect(x, y, labelWidth, labelHeight).strokeColor('#cbd5e1').stroke();

    let textX = x + 10;
    const imageSize = 60;

    if (product.imageUrl) {
      const buffer = await fetchImageBuffer(product.imageUrl);
      if (buffer) {
        try {
          doc.image(buffer, x + 8, y + 8, { width: imageSize, height: imageSize, fit: [imageSize, imageSize] });
          textX = x + imageSize + 16;
        } catch (error) {
          console.warn(`[productLabelPdf] Imagem corrompida, ignorando: ${product.imageUrl}`);
        }
      }
    }

    doc
      .fontSize(10)
      .fillColor('#1e293b')
      .text(product.name, textX, y + 12, { width: labelWidth - (textX - x) - 10 });

    doc
      .fontSize(14)
      .fillColor('#047857')
      .text(formatCurrency(product.finalPrice), textX, y + labelHeight - 30);

    col += 1;
    if (col >= perRow) {
      col = 0;
      x = marginX;
      y += labelHeight + marginY;
    } else {
      x += labelWidth + marginX;
    }

    if (y + labelHeight > doc.page.height - marginY) {
      doc.addPage();
      x = marginX;
      y = marginY;
      col = 0;
    }
  }
}

async function renderFichaLabels(doc: PDFKit.PDFDocument, products: ProductLabelData[]) {
  for (const product of products) {
    const imageSize = 150;
    let cursorY = 60;

    if (product.imageUrl) {
      const buffer = await fetchImageBuffer(product.imageUrl);
      if (buffer) {
        try {
          doc.image(buffer, 50, cursorY, { width: imageSize, height: imageSize, fit: [imageSize, imageSize] });
        } catch (error) {
          console.warn(`[productLabelPdf] Imagem corrompida, ignorando: ${product.imageUrl}`);
        }
      }
    }

    doc
      .fontSize(18)
      .fillColor('#1e293b')
      .text(product.name, 50, cursorY + imageSize + 20, { width: 495 });

    doc
      .fontSize(24)
      .fillColor('#047857')
      .text(formatCurrency(product.finalPrice), 50, cursorY + imageSize + 55);

    if (product !== products[products.length - 1]) {
      doc.addPage();
    }
  }
}

/**
 * Gera o PDF de etiquetas/fichas de produtos e retorna o buffer final.
 * Falhas ao buscar imagens individuais nunca interrompem a geração:
 * a etiqueta correspondente é simplesmente renderizada sem foto.
 */
export function generateProductLabelsPdf(
  products: ProductLabelData[],
  layout: LabelLayout
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: layout === 'SMALL' ? 'A4' : 'A4',
      margin: layout === 'SMALL' ? 20 : 50,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const render = layout === 'SMALL' ? renderSmallLabels(doc, products) : renderFichaLabels(doc, products);

    render.then(() => doc.end()).catch(reject);
  });
}
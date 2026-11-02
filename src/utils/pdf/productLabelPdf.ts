import PDFDocument from 'pdfkit';

export interface ProductLabelData {
  id: string;
  name: string;
  finalPrice: number;
  imageBuffer?: Buffer | null;
}

export type LabelLayout = 'SMALL' | 'CARD';

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

    if (product.imageBuffer) {
      try {
        doc.image(product.imageBuffer, x + 8, y + 8, { width: imageSize, height: imageSize, fit: [imageSize, imageSize] });
        textX = x + imageSize + 16;
      } catch (error) {
        console.warn('[productLabelPdf] Imagem inválida, ignorando:', error);
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

    if (product.imageBuffer) {
      try {
        doc.image(product.imageBuffer, 50, cursorY, { width: imageSize, height: imageSize, fit: [imageSize, imageSize] });
      } catch (error) {
        console.warn('[productLabelPdf] Imagem inválida, ignorando:', error);
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
 * Imagens são carregadas do armazenamento local pelo controller. Uma imagem
 * ausente ou inválida não interrompe a geração do PDF.
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
import PDFDocument from 'pdfkit';

export interface QuotePdfData {
  quoteNumber: number;
  clientName: string;
  clientContact?: string | null;
  createdAt: Date;
  validityDays: number;
  notes?: string | null;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  businessName: string;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

/**
 * Gera o PDF de um orçamento comercial e retorna o buffer final, pronto
 * para ser enviado como resposta HTTP ou salvo em disco.
 */
export function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(20)
      .fillColor('#1e293b')
      .text(data.businessName, { align: 'left' })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .fillColor('#334155')
      .text(`Orçamento nº ${String(data.quoteNumber).padStart(4, '0')}`, { align: 'left' })
      .moveDown(0.8);

    doc
      .fontSize(10)
      .fillColor('#64748b')
      .text(`Emitido em: ${formatDate(data.createdAt)}`)
      .text(`Válido por ${data.validityDays} dias a partir da emissão`)
      .moveDown(0.6);

    doc
      .fontSize(11)
      .fillColor('#1e293b')
      .text(`Cliente: ${data.clientName}`, { continued: false });

    if (data.clientContact) {
      doc.text(`Contato: ${data.clientContact}`);
    }

    doc.moveDown(1);

    const tableTop = doc.y;
    const colProduct = 50;
    const colQty = 280;
    const colUnit = 350;
    const colTotal = 450;

    doc
      .fontSize(10)
      .fillColor('#ffffff')
      .rect(50, tableTop, 495, 22)
      .fill('#1e293b');

    doc
      .fillColor('#ffffff')
      .text('Produto', colProduct + 5, tableTop + 6)
      .text('Qtd.', colQty, tableTop + 6)
      .text('Unitário', colUnit, tableTop + 6)
      .text('Subtotal', colTotal, tableTop + 6);

    let rowY = tableTop + 22;

    data.items.forEach((item, index) => {
      const rowHeight = 22;
      if (index % 2 === 1) {
        doc.rect(50, rowY, 495, rowHeight).fill('#f1f5f9');
      }

      doc
        .fillColor('#1e293b')
        .fontSize(10)
        .text(item.productName, colProduct + 5, rowY + 6, { width: 220 })
        .text(String(item.quantity), colQty, rowY + 6)
        .text(formatCurrency(item.unitPrice), colUnit, rowY + 6)
        .text(formatCurrency(item.totalPrice), colTotal, rowY + 6);

      rowY += rowHeight;
    });

    rowY += 10;
    doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#cbd5e1').stroke();
    rowY += 15;

    doc
      .fontSize(10)
      .fillColor('#334155')
      .text('Subtotal:', colUnit, rowY)
      .text(formatCurrency(data.subtotal), colTotal, rowY);
    rowY += 18;

    if (data.discountAmount > 0) {
      doc
        .fillColor('#b91c1c')
        .text('Desconto:', colUnit, rowY)
        .text(`- ${formatCurrency(data.discountAmount)}`, colTotal, rowY);
      rowY += 18;
    }

    doc
      .fontSize(13)
      .fillColor('#047857')
      .text('Total:', colUnit, rowY, { continued: false })
      .text(formatCurrency(data.totalAmount), colTotal, rowY);

    rowY += 35;

    if (data.notes) {
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text('Observações:', 50, rowY)
        .moveDown(0.3)
        .fillColor('#64748b')
        .text(data.notes, 50, doc.y, { width: 495 });
    }

    doc.end();
  });
}
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type DiscountType = 'NONE' | 'PERCENT' | 'FIXED';

export interface QuoteItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteItemResult extends QuoteItemInput {
  totalPrice: number;
}

export interface QuoteTotals {
  items: QuoteItemResult[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
}

/**
 * Calcula os totais de um orçamento: soma os itens, aplica o desconto
 * (percentual ou valor fixo) sobre o subtotal, e retorna o valor final.
 */
export function calculateQuoteTotals(
  items: QuoteItemInput[],
  discountType: DiscountType,
  discountValue: number
): QuoteTotals {
  const resolvedItems: QuoteItemResult[] = items.map((item) => ({
    ...item,
    totalPrice: round2(item.quantity * item.unitPrice),
  }));

  const subtotal = round2(resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0));

  let discountAmount = 0;
  if (discountType === 'PERCENT') {
    discountAmount = round2(subtotal * (discountValue / 100));
  } else if (discountType === 'FIXED') {
    discountAmount = round2(Math.min(discountValue, subtotal));
  }

  const totalAmount = round2(subtotal - discountAmount);

  return { items: resolvedItems, subtotal, discountAmount, totalAmount };
}
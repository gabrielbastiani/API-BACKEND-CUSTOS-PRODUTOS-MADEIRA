import { Prisma } from '@prisma/client';

/**
 * Converte recursivamente qualquer valor vindo do Prisma, transformando
 * instâncias de `Prisma.Decimal` em `number` puro, para que o JSON de
 * resposta nunca sirva um Decimal como string.
 *
 * A detecção usa `Prisma.Decimal.isDecimal(value)`, um helper estático
 * oficial do próprio pacote decimal.js usado internamente pelo Prisma —
 * mais confiável do que checar `constructor.name`, que pode variar
 * dependendo de como o pacote foi empacotado/transpilado.
 */
export function serializePrisma<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    return (value as unknown as Prisma.Decimal).toNumber() as unknown as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializePrisma(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializePrisma(val);
    }
    return result as T;
  }

  return value;
}
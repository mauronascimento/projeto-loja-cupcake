const MONEY_PATTERN = /^(\d{1,8})\.(\d{2})$/;

export function toCents(value: string): number {
  const match = MONEY_PATTERN.exec(value);
  if (!match) throw new Error('Valor monetário inválido recebido da API.');
  const cents = Number(match[1]) * 100 + Number(match[2]);
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Valor monetário fora do intervalo suportado.');
  }
  return cents;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function formatMoney(value: string): string {
  return formatCents(toCents(value));
}

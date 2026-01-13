import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化金额（BigInt 转字符串，处理小数位）
 */
export function formatAmount(
  amount: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 2
): string {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const quotient = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;
  
  if (remainder === BigInt(0)) {
    return quotient.toString();
  }
  
  const decimalPart = remainder.toString().padStart(decimals, '0');
  const trimmedDecimal = decimalPart.slice(0, displayDecimals).replace(/0+$/, '');
  
  return trimmedDecimal ? `${quotient}.${trimmedDecimal}` : quotient.toString();
}

/**
 * 解析金额（字符串转 BigInt）
 */
export function parseAmount(amount: string, decimals: number = 18): bigint {
  const [integerPart, decimalPart = ''] = amount.split('.');
  const paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integerPart + paddedDecimal);
}

/**
 * 格式化地址（显示前6后4）
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 格式化日期
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}


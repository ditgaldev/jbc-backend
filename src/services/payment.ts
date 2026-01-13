import type { Env } from '../types';
import { PRICING } from '../types';
import { verifyETHTransfer, verifyUSDTTransfer } from '../utils/blockchain';

/**
 * 验证支付交易
 */
export async function verifyPayment(
  txHash: string,
  chainId: number,
  paymentType: 'token_deploy' | 'dapp_listing' | 'dapp_featured' | 'token_listing' | 'token_pinned',
  fromAddress: string,
  toAddress: string,
  currency: 'USDT' | 'ETH',
  env: Env
): Promise<{ valid: boolean; error?: string }> {
  // 获取期望的支付金额
  const expectedAmount = getExpectedAmount(paymentType);
  
  if (currency === 'USDT') {
    return await verifyUSDTTransfer(
      txHash,
      chainId,
      expectedAmount,
      toAddress,
      fromAddress,
      env
    );
  } else {
    return await verifyETHTransfer(
      txHash,
      chainId,
      expectedAmount,
      toAddress,
      fromAddress,
      env
    );
  }
}

/**
 * 获取期望的支付金额
 */
function getExpectedAmount(
  paymentType: 'token_deploy' | 'dapp_listing' | 'dapp_featured' | 'token_listing' | 'token_pinned'
): string {
  switch (paymentType) {
    case 'token_deploy':
      return PRICING.TOKEN_DEPLOY;
    case 'dapp_listing':
      return PRICING.DAPP_LISTING;
    case 'dapp_featured':
      return PRICING.DAPP_FEATURED;
    case 'token_listing':
      return PRICING.TOKEN_LISTING;
    case 'token_pinned':
      return PRICING.TOKEN_PINNED;
    default:
      throw new Error(`Unknown payment type: ${paymentType}`);
  }
}

/**
 * 记录支付到数据库
 */
export async function recordPayment(
  db: D1Database,
  txHash: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  currency: 'USDT' | 'ETH',
  chainId: number,
  paymentType: 'token_deploy' | 'dapp_listing' | 'dapp_featured' | 'token_listing' | 'token_pinned',
  relatedId?: string,
  blockNumber?: number
): Promise<void> {
  const now = Date.now();
  
  await db.prepare(
    `INSERT INTO payments (
      tx_hash, from_address, to_address, amount, currency, chain_id,
      payment_type, related_id, block_number, confirmed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    txHash,
    fromAddress.toLowerCase(),
    toAddress.toLowerCase(),
    amount,
    currency,
    chainId,
    paymentType,
    relatedId || null,
    blockNumber || null,
    now,
    now
  ).run();
}

/**
 * 检查支付是否已记录
 */
export async function isPaymentRecorded(db: D1Database, txHash: string): Promise<boolean> {
  const result = await db.prepare(
    'SELECT id FROM payments WHERE tx_hash = ?'
  ).bind(txHash).first();
  
  return !!result;
}


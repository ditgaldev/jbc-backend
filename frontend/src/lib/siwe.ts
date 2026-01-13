import { SiweMessage } from 'siwe';
import { getAddress } from 'viem';

/**
 * 创建 SIWE 消息
 */
export async function createSIWEMessage(
  address: string,
  chainId: number,
  domain: string,
  nonce: string
): Promise<string> {
  const message = new SiweMessage({
    domain,
    address: getAddress(address),
    statement: 'Sign in with Ethereum to the Web3 B2B SaaS Platform',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24小时后过期
  });

  return message.prepareMessage();
}

/**
 * 生成随机 nonce
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}


import { createPublicClient, http, parseUnits, formatUnits, type Chain } from 'viem';
import {
  bsc,
  bscTestnet,
  arbitrum,
  arbitrumSepolia,
  sepolia,
  polygon,
  polygonMumbai,
  avalanche,
  avalancheFuji,
  optimism,
  optimismSepolia,
  base,
  baseSepolia,
  linea,
  lineaSepolia,
  zkSync,
  zkSyncSepoliaTestnet,
} from 'viem/chains';
import type { Env } from '../types';

// 支持的链配置（EVM 兼容链）
const CHAIN_CONFIGS: Record<number, Chain> = {
  11155111: sepolia,           // Ethereum Sepolia Testnet
  56: bsc,                     // BSC Mainnet
  97: bscTestnet,              // BSC Testnet
  42161: arbitrum,             // Arbitrum One
  421614: arbitrumSepolia,     // Arbitrum Sepolia
  137: polygon,                // Polygon Mainnet
  80001: polygonMumbai,        // Polygon Mumbai Testnet
  43114: avalanche,            // Avalanche C-Chain
  43113: avalancheFuji,        // Avalanche Fuji Testnet
  10: optimism,                // Optimism Mainnet
  11155420: optimismSepolia,   // Optimism Sepolia
  8453: base,                  // Base Mainnet
  84532: baseSepolia,          // Base Sepolia
  59144: linea,                // Linea Mainnet
  59141: lineaSepolia,         // Linea Sepolia
  324: zkSync,                 // zkSync Era Mainnet
  300: zkSyncSepoliaTestnet,   // zkSync Sepolia Testnet
};

/**
 * 获取公共客户端
 */
export function getPublicClient(chainId: number, rpcUrl?: string) {
  const chain = CHAIN_CONFIGS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * 验证交易是否存在并确认
 */
export async function verifyTransaction(
  txHash: string,
  chainId: number,
  env: Env
): Promise<{
  exists: boolean;
  confirmed: boolean;
  from?: string;
  to?: string;
  value?: bigint;
  blockNumber?: number;
}> {
  try {
    const rpcUrl = getRpcUrl(chainId, env);
    const client = getPublicClient(chainId, rpcUrl);

    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt) {
      return { exists: false, confirmed: false };
    }

    // 获取交易详情
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });

    return {
      exists: true,
      confirmed: receipt.status === 'success',
      from: tx.from,
      to: tx.to || undefined,
      value: tx.value,
      blockNumber: Number(receipt.blockNumber),
    };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { exists: false, confirmed: false };
  }
}

/**
 * 验证 USDT 转账交易
 */
export async function verifyUSDTTransfer(
  txHash: string,
  chainId: number,
  expectedAmount: string,
  expectedTo: string,
  expectedFrom: string,
  env: Env
): Promise<{ valid: boolean; error?: string }> {
  try {
    const rpcUrl = getRpcUrl(chainId, env);
    const client = getPublicClient(chainId, rpcUrl);

    // 获取交易收据
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt || receipt.status !== 'success') {
      return { valid: false, error: 'Transaction not found or failed' };
    }

    // 验证发送者
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { valid: false, error: 'Transaction sender mismatch' };
    }

    // 验证接收者（从 logs 中查找 Transfer 事件）
    // 注意：这里需要根据实际的 USDT 合约 ABI 来解析 Transfer 事件
    // 简化版本：检查交易接收者
    if (tx.to && tx.to.toLowerCase() !== expectedTo.toLowerCase()) {
      return { valid: false, error: 'Transaction recipient mismatch' };
    }

    // 验证金额（需要解析 Transfer 事件，这里简化处理）
    // 实际应该解析 USDT Transfer 事件的 value 参数
    const expectedAmountBigInt = parseUnits(expectedAmount, 6); // USDT 通常是 6 位小数

    // TODO: 解析 Transfer 事件来验证实际转账金额
    // 这里需要 USDT 合约地址和 ABI

    return { valid: true };
  } catch (error) {
    console.error('Error verifying USDT transfer:', error);
    return { valid: false, error: 'Failed to verify transaction' };
  }
}

/**
 * 验证 ETH 转账交易
 */
export async function verifyETHTransfer(
  txHash: string,
  chainId: number,
  expectedAmount: string,
  expectedTo: string,
  expectedFrom: string,
  env: Env
): Promise<{ valid: boolean; error?: string }> {
  try {
    const verification = await verifyTransaction(txHash, chainId, env);

    if (!verification.exists || !verification.confirmed) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    if (verification.from?.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { valid: false, error: 'Transaction sender mismatch' };
    }

    if (verification.to?.toLowerCase() !== expectedTo.toLowerCase()) {
      return { valid: false, error: 'Transaction recipient mismatch' };
    }

    const expectedAmountBigInt = parseUnits(expectedAmount, 18);
    if (verification.value !== expectedAmountBigInt) {
      return { valid: false, error: 'Transaction amount mismatch' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verifying ETH transfer:', error);
    return { valid: false, error: 'Failed to verify transaction' };
  }
}

/**
 * 获取 RPC URL
 */
function getRpcUrl(chainId: number, env: Env): string | undefined {
  // BSC
  if (chainId === 56 || chainId === 97) {
    return env.BSC_RPC_URL;
  }
  // Arbitrum
  if (chainId === 42161 || chainId === 421614) {
    return env.ARBITRUM_RPC_URL;
  }
  // Polygon
  if (chainId === 137 || chainId === 80001) {
    return env.POLYGON_RPC_URL;
  }
  // Avalanche
  if (chainId === 43114 || chainId === 43113) {
    return env.AVALANCHE_RPC_URL;
  }
  // Optimism
  if (chainId === 10 || chainId === 11155420) {
    return env.OPTIMISM_RPC_URL;
  }
  // Base
  if (chainId === 8453 || chainId === 84532) {
    return env.BASE_RPC_URL;
  }
  // Linea
  if (chainId === 59144 || chainId === 59141) {
    return env.LINEA_RPC_URL;
  }
  // zkSync
  if (chainId === 324 || chainId === 300) {
    return env.ZKSYNC_RPC_URL;
  }
  // Sepolia 测试网
  if (chainId === 11155111) {
    return env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  }
  return undefined;
}

/**
 * 格式化金额（BigInt 转字符串）
 */
export function formatAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals);
}

/**
 * 解析金额（字符串转 BigInt）
 */
export function parseAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}


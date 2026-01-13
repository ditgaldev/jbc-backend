import { bsc, bscTestnet, arbitrum, arbitrumSepolia, sepolia } from 'viem/chains';

// 支持的链配置
export const supportedChains = [sepolia, bsc, bscTestnet, arbitrum, arbitrumSepolia];

// 默认链 - 以太坊 Sepolia 测试网
export const defaultChain = sepolia;

// 链 ID 映射
export const CHAIN_IDS = {
  SEPOLIA: 11155111,
  BSC: 56,
  BSC_TESTNET: 97,
  ARBITRUM: 42161,
  ARBITRUM_SEPOLIA: 421614,
} as const;


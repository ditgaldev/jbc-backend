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

// 支持的链配置（EVM 兼容链）
export const supportedChains = [
  sepolia,           // Ethereum Sepolia Testnet
  bsc,               // BSC Mainnet
  bscTestnet,        // BSC Testnet
  arbitrum,          // Arbitrum One
  arbitrumSepolia,   // Arbitrum Sepolia
  polygon,           // Polygon Mainnet
  polygonMumbai,     // Polygon Mumbai Testnet
  avalanche,         // Avalanche C-Chain
  avalancheFuji,     // Avalanche Fuji Testnet
  optimism,          // Optimism Mainnet
  optimismSepolia,   // Optimism Sepolia
  base,              // Base Mainnet
  baseSepolia,       // Base Sepolia
  linea,             // Linea Mainnet
  lineaSepolia,      // Linea Sepolia
  zkSync,            // zkSync Era Mainnet
  zkSyncSepoliaTestnet, // zkSync Sepolia Testnet
];

// 默认链 - 以太坊 Sepolia 测试网
export const defaultChain = sepolia;

// 链 ID 映射
export const CHAIN_IDS = {
  SEPOLIA: 11155111,
  BSC: 56,
  BSC_TESTNET: 97,
  ARBITRUM: 42161,
  ARBITRUM_SEPOLIA: 421614,
  POLYGON: 137,
  POLYGON_MUMBAI: 80001,
  AVALANCHE: 43114,
  AVALANCHE_FUJI: 43113,
  OPTIMISM: 10,
  OPTIMISM_SEPOLIA: 11155420,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
  LINEA: 59144,
  LINEA_SEPOLIA: 59141,
  ZKSYNC: 324,
  ZKSYNC_SEPOLIA: 300,
} as const;


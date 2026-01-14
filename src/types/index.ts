// 用户相关类型
export interface User {
  walletAddress: string;
  createdAt: number;
  role: 'user' | 'admin';
}

// DApp 相关类型
export interface DApp {
  id?: number;
  ownerAddress: string;
  name: string;
  description?: string;
  url: string;
  logoR2Key?: string;
  category: string;
  status: 'pending' | 'active' | 'rejected';
  isFeatured: boolean;
  sortOrder?: number; // 排序顺序，数字越小越靠前
  createdAt: number;
}

export interface CreateDAppRequest {
  name: string;
  description?: string;
  url: string;
  category: string;
  paymentTxHash?: string; // 支付交易哈希（可选，仅用于记录）
  logoR2Key?: string; // 图标 R2 存储 key
}

export interface FeatureDAppRequest {
  dappId: number;
  paymentTxHash: string; // 推荐位支付交易哈希
  chainId: number; // 支付交易的链 ID
}

// 代币相关类型
export interface DeployedToken {
  chainId: number;
  tokenAddress: string;
  deployerAddress: string;
  name: string;
  symbol: string;
  logoR2Key?: string;
  sortOrder?: number; // 排序顺序，数字越小越靠前
  deployedAt: number;
}

export interface ListedToken {
  id?: number;
  chainId: number;
  tokenAddress: string;
  submitterAddress: string;
  logoR2Key?: string;
  isPinned: boolean;
  sortOrder?: number; // 排序顺序，数字越小越靠前
  paymentTxHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ListTokenRequest {
  chainId: number;
  tokenAddress: string;
  paymentTxHash: string; // 收录费支付交易哈希
  logoR2Key?: string; // 图标 R2 存储 key
}

export interface PinTokenRequest {
  tokenId: number;
  paymentTxHash: string; // 置顶费支付交易哈希
}

// 支付相关类型
export interface Payment {
  id?: number;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string; // BigInt as string
  currency: 'USDT' | 'ETH';
  chainId: number;
  paymentType: 'token_deploy' | 'dapp_listing' | 'dapp_featured' | 'token_listing' | 'token_pinned';
  relatedId?: string;
  blockNumber?: number;
  confirmedAt: number;
  createdAt: number;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 环境变量类型
export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ENVIRONMENT: string;
  JWT_SECRET?: string; // JWT 密钥（生产环境必须设置）
  BSC_RPC_URL?: string;
  ARBITRUM_RPC_URL?: string;
  SEPOLIA_RPC_URL?: string;
  FACTORY_CONTRACT_ADDRESS?: string;
  USDT_CONTRACT_ADDRESS?: string;
}

// SIWE 相关类型
export interface SIWEMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

// 定价常量
export const PRICING = {
  TOKEN_DEPLOY: '299', // $299 USDT
  DAPP_LISTING: '199', // $199 USDT
  DAPP_FEATURED: '500', // $500 USDT
  TOKEN_LISTING: '99', // $99 USDT
  TOKEN_PINNED: '999', // $999 USDT
} as const;

// 支持的链（EVM 兼容链）
export const SUPPORTED_CHAINS = {
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


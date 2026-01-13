// 合约地址配置（从环境变量读取）
export const CONTRACTS = {
  // Factory 合约地址（用于部署代币）
  FACTORY: import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS || '',
  
  // USDT 合约地址（测试代币）
  USDT: {
    [11155111]: import.meta.env.VITE_USDT_SEPOLIA_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia Testnet
    [56]: import.meta.env.VITE_USDT_BSC_ADDRESS || '', // BSC Mainnet
    [97]: import.meta.env.VITE_USDT_BSC_TESTNET_ADDRESS || '', // BSC Testnet
    [42161]: import.meta.env.VITE_USDT_ARBITRUM_ADDRESS || '', // Arbitrum Mainnet
    [421614]: import.meta.env.VITE_USDT_ARBITRUM_SEPOLIA_ADDRESS || '', // Arbitrum Sepolia
  },
  
  // 支付接收地址（测试环境，请在生产环境中配置）
  PAYMENT_RECEIVER: import.meta.env.VITE_PAYMENT_RECEIVER_ADDRESS || '0x4064570fd15dd67281F1F410a7Ce3ee0B10fA422', // 默认使用管理员地址作为测试
} as const;

// API 基础 URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787/api';

// 定价常量（测试价格，已降低）
export const PRICING = {
  TOKEN_DEPLOY: '1', // 1 代币（测试）
  DAPP_LISTING: '1', // 1 代币（测试）
  DAPP_FEATURED: '2', // 2 代币（测试）
  TOKEN_LISTING: '1', // 1 代币（测试）
  TOKEN_PINNED: '2', // 2 代币（测试）
} as const;

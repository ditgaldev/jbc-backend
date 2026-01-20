// 合约地址配置（从环境变量读取）
export const CONTRACTS = {
  // Factory 合约地址（用于部署代币）
  FACTORY: import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS || '',
  
  // USDT 合约地址（支持多链）
  USDT: {
    [11155111]: import.meta.env.VITE_USDT_SEPOLIA_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia Testnet
    [56]: import.meta.env.VITE_USDT_BSC_ADDRESS || '', // BSC Mainnet
    [97]: import.meta.env.VITE_USDT_BSC_TESTNET_ADDRESS || '', // BSC Testnet
    [42161]: import.meta.env.VITE_USDT_ARBITRUM_ADDRESS || '', // Arbitrum Mainnet
    [421614]: import.meta.env.VITE_USDT_ARBITRUM_SEPOLIA_ADDRESS || '', // Arbitrum Sepolia
    [137]: import.meta.env.VITE_USDT_POLYGON_ADDRESS || '', // Polygon Mainnet
    [80001]: import.meta.env.VITE_USDT_POLYGON_MUMBAI_ADDRESS || '', // Polygon Mumbai
    [43114]: import.meta.env.VITE_USDT_AVALANCHE_ADDRESS || '', // Avalanche C-Chain
    [43113]: import.meta.env.VITE_USDT_AVALANCHE_FUJI_ADDRESS || '', // Avalanche Fuji
    [10]: import.meta.env.VITE_USDT_OPTIMISM_ADDRESS || '', // Optimism Mainnet
    [11155420]: import.meta.env.VITE_USDT_OPTIMISM_SEPOLIA_ADDRESS || '', // Optimism Sepolia
    [8453]: import.meta.env.VITE_USDT_BASE_ADDRESS || '', // Base Mainnet
    [84532]: import.meta.env.VITE_USDT_BASE_SEPOLIA_ADDRESS || '', // Base Sepolia
    [59144]: import.meta.env.VITE_USDT_LINEA_ADDRESS || '', // Linea Mainnet
    [59141]: import.meta.env.VITE_USDT_LINEA_SEPOLIA_ADDRESS || '', // Linea Sepolia
    [324]: import.meta.env.VITE_USDT_ZKSYNC_ADDRESS || '', // zkSync Era Mainnet
    [300]: import.meta.env.VITE_USDT_ZKSYNC_SEPOLIA_ADDRESS || '', // zkSync Sepolia
  },
  
  // 支付接收地址（测试环境，请在生产环境中配置）
  PAYMENT_RECEIVER: import.meta.env.VITE_PAYMENT_RECEIVER_ADDRESS || '0x4064570fd15dd67281F1F410a7Ce3ee0B10fA422', // 默认使用管理员地址作为测试
} as const;

// API 基础 URL - 从环境变量读取，默认使用生产环境地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://matoken.suiyiwan1.workers.dev/api';

// 定价常量（测试价格，已降低）
export const PRICING = {
  TOKEN_DEPLOY: '1', // 1 代币（测试）
  DAPP_LISTING: '1', // 1 代币（测试）
  DAPP_FEATURED: '2', // 2 代币（测试）
  TOKEN_LISTING: '1', // 1 代币（测试）
  TOKEN_PINNED: '2', // 2 代币（测试）
} as const;

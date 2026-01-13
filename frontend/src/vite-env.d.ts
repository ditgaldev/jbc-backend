/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FACTORY_CONTRACT_ADDRESS?: string;
  readonly VITE_USDT_SEPOLIA_ADDRESS?: string;
  readonly VITE_USDT_BSC_ADDRESS?: string;
  readonly VITE_USDT_BSC_TESTNET_ADDRESS?: string;
  readonly VITE_USDT_ARBITRUM_ADDRESS?: string;
  readonly VITE_USDT_ARBITRUM_SEPOLIA_ADDRESS?: string;
  readonly VITE_PAYMENT_RECEIVER_ADDRESS?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


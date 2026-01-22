import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  trustWallet,
  coinbaseWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { supportedChains } from '@/config/chains';
import type { Chain } from 'viem';

// WalletConnect Project ID - 可选，如果没有配置则部分钱包功能受限
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

// 配置钱包列表
const connectors = connectorsForWallets(
  [
    {
      groupName: '推荐钱包',
      wallets: [
        injectedWallet,      // 浏览器内置钱包（TokenPocket、MetaMask 等 DApp 浏览器）
        metaMaskWallet,      // MetaMask
        trustWallet,         // Trust Wallet
        coinbaseWallet,      // Coinbase Wallet
      ],
    },
    {
      groupName: '更多钱包',
      wallets: [
        walletConnectWallet, // WalletConnect
        rainbowWallet,       // Rainbow
      ],
    },
  ],
  {
    appName: 'MaToken',
    projectId: projectId,
  }
);

// Wagmi v2 配置
export const wagmiConfig = createConfig({
  connectors,
  chains: supportedChains as unknown as readonly [Chain, ...Chain[]],
  transports: supportedChains.reduce(
    (acc, chain) => {
      acc[chain.id] = http();
      return acc;
    },
    {} as Record<number, ReturnType<typeof http>>
  ),
  ssr: false,
});


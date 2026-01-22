import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { supportedChains } from '@/config/chains';
import type { Chain } from 'viem';

// 获取 WalletConnect Project ID（必须配置才能显示钱包列表）
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// RainbowKit v2 配置 - 使用 getDefaultConfig 自动配置钱包列表
export const wagmiConfig = getDefaultConfig({
  appName: 'MaToken',
  projectId: projectId,
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


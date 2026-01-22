import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { supportedChains } from '@/config/chains';
import type { Chain } from 'viem';

// Wagmi v2 配置 - 支持钱包内置浏览器
export const wagmiConfig = createConfig({
  chains: supportedChains as unknown as readonly [Chain, ...Chain[]],
  connectors: [
    // injected connector 放在第一位 - 支持所有注入式钱包（OneKey, MetaMask, TokenPocket 等）
    injected({
      shimDisconnect: true,
    }),
    // WalletConnect - 仅在配置了 projectId 时启用
    ...(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
            showQrModal: true,
            metadata: {
              name: 'MaToken',
              description: 'Web3 钱包服务平台',
              url: typeof window !== 'undefined' ? window.location.origin : '',
              icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : ''],
            },
          }),
        ]
      : []),
  ],
  transports: supportedChains.reduce(
    (acc, chain) => {
      acc[chain.id] = http();
      return acc;
    },
    {} as Record<number, ReturnType<typeof http>>
  ),
  ssr: false,
});


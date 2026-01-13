import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { supportedChains } from '@/config/chains';
import type { Chain } from 'viem';

// Wagmi v2 配置
export const wagmiConfig = createConfig({
  chains: supportedChains as unknown as readonly [Chain, ...Chain[]],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
            showQrModal: true,
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
  ssr: false, // CSR 应用
});


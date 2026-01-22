import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { formatAddress, formatDate } from '@/lib/utils';
import { Plus, ExternalLink, Pin, Coins, Wallet } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useLanguage } from '@/hooks/useLanguage';

export function TokenListPage() {
  const { t } = useLanguage();
  const { data: listedTokens, isLoading: isLoadingListed } = useQuery({
    queryKey: ['listed-tokens'],
    queryFn: async () => {
      const response = await apiClient.getListedTokens();
      return response.data || [];
    },
  });

  const { data: deployedTokens, isLoading: isLoadingDeployed } = useQuery({
    queryKey: ['deployed-tokens'],
    queryFn: async () => {
      const response = await apiClient.getDeployedTokens();
      return response.data || [];
    },
  });

  if (isLoadingListed || isLoadingDeployed) {
    return (
      <div className="relative min-h-screen">
        <GeometricPattern />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-10">
          {/* 页面标题 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
                <Coins className="h-5 w-5 text-blue-400 mr-2" />
                <span className="text-sm text-gray-400 tracking-wide">代币中心</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="neon-text">{t('token.listTitle')}</span>
              </h1>
              <p className="text-gray-500 mt-2">{t('token.listDesc')}</p>
            </div>
            <Link to="/tokens/list">
              <Button className="btn-gradient text-white rounded-xl px-6">
                <Plus className="mr-2 h-4 w-4" />
                {t('token.listToken')}
              </Button>
            </Link>
          </div>

          {/* 已收录的代币 */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Wallet className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white tracking-tight">{t('token.listedTokens')}</h2>
            </div>
            {listedTokens && Array.isArray(listedTokens) && listedTokens.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listedTokens.map((token: any) => (
                  <div key={token.id} className="glass-card rounded-2xl p-6 group">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm font-mono text-gray-300">{formatAddress(token.token_address)}</p>
                      {token.is_pinned && <Pin className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {t('token.chainId')}: {token.chain_id} | {formatDate(token.created_at)}
                    </p>
                    <a
                      href={`https://bscscan.com/address/${token.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                    >
                      {t('common.viewOnChain')}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center text-gray-500">
                {t('token.noListedTokens')}
              </div>
            )}
          </div>

          {/* 已部署的代币 */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Coins className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white tracking-tight">{t('token.deployedTokens')}</h2>
            </div>
            {deployedTokens && Array.isArray(deployedTokens) && deployedTokens.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deployedTokens.map((token: any) => (
                  <div key={token.token_address} className="glass-card rounded-2xl p-6 group">
                    <h3 className="text-lg font-semibold text-white mb-1">{token.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{token.symbol} | {t('token.chainId')}: {token.chain_id}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs text-gray-600">{t('token.contractAddress')}</p>
                        <p className="text-sm font-mono text-gray-400">{formatAddress(token.token_address)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('token.deployTime')}</p>
                        <p className="text-sm text-gray-400">{formatDate(token.deployed_at)}</p>
                      </div>
                    </div>
                    
                    <a
                      href={`https://bscscan.com/address/${token.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center transition-colors"
                    >
                      {t('common.viewOnChain')}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center text-gray-500">
                {t('token.noDeployedTokens')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

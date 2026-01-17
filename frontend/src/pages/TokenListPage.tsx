import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            <p className="mt-4 text-gray-400">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Coins className="h-8 w-8 text-green-400" />
                <h1 className="text-4xl font-bold text-white">{t('token.listTitle')}</h1>
              </div>
              <p className="text-gray-400">{t('token.listDesc')}</p>
            </div>
            <Link to="/tokens/list">
              <Button className="bg-green-500 hover:bg-green-600 text-white glow-green">
                <Plus className="mr-2 h-4 w-4" />
                {t('token.listToken')}
              </Button>
            </Link>
          </div>

          {/* 已收录的代币 */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Wallet className="h-6 w-6 text-green-400" />
              <h2 className="text-2xl font-bold text-white">{t('token.listedTokens')}</h2>
            </div>
            {listedTokens && Array.isArray(listedTokens) && listedTokens.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listedTokens.map((token: any) => (
                  <Card
                    key={token.id}
                    className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white font-mono text-sm">
                          {formatAddress(token.token_address)}
                        </CardTitle>
                        {token.is_pinned && (
                          <Pin className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                      <CardDescription className="text-gray-400">
                        {t('token.chainId')}: {token.chain_id} | {formatDate(token.created_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <a
                        href={`https://bscscan.com/address/${token.token_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-400 hover:text-green-300 flex items-center transition-colors"
                      >
                        {t('common.viewOnChain')}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center text-gray-400">
                  {t('token.noListedTokens')}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 已部署的代币 */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Coins className="h-6 w-6 text-green-400" />
              <h2 className="text-2xl font-bold text-white">{t('token.deployedTokens')}</h2>
            </div>
            {deployedTokens && Array.isArray(deployedTokens) && deployedTokens.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deployedTokens.map((token: any) => (
                  <Card
                    key={token.token_address}
                    className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{token.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {token.symbol} | {t('token.chainId')}: {token.chain_id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('token.contractAddress')}</p>
                        <p className="text-sm font-mono text-gray-300">
                          {formatAddress(token.token_address)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('token.deployTime')}</p>
                        <p className="text-sm text-gray-300">{formatDate(token.deployed_at)}</p>
                      </div>
                      <a
                        href={`https://bscscan.com/address/${token.token_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-400 hover:text-green-300 flex items-center transition-colors"
                      >
                        {t('common.viewOnChain')}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-12 text-center text-gray-400">
                  {t('token.noDeployedTokens')}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

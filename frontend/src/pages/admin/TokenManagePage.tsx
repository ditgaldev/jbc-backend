import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { formatAddress, formatDate } from '@/lib/utils';
import { Coins, ExternalLink, Save } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useState } from 'react';

export function TokenManagePage() {
  const queryClient = useQueryClient();
  const [sortOrderEdits, setSortOrderEdits] = useState<Record<string, number>>({});

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['admin-deployed-tokens-all'],
    queryFn: async () => {
      const response = await apiClient.getDeployedTokens();
      return response.data || [];
    },
  });

  const updateSortOrder = useMutation({
    mutationFn: async ({ tokenAddress, sortOrder }: { tokenAddress: string; sortOrder: number }) => {
      return await apiClient.updateDeployedTokenSortOrder(tokenAddress, sortOrder);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-deployed-tokens-all'] }); setSortOrderEdits({}); },
  });

  const handleSortOrderChange = (tokenAddress: string, value: string) => {
    setSortOrderEdits((prev) => ({ ...prev, [tokenAddress]: parseInt(value) || 0 }));
  };

  const handleSaveSortOrder = (tokenAddress: string) => {
    updateSortOrder.mutate({ tokenAddress, sortOrder: sortOrderEdits[tokenAddress] ?? 0 });
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <GeometricPattern />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
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
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Coins className="h-5 w-5 text-purple-400 mr-2" />
              <span className="text-sm text-gray-400 tracking-wide">代币管理</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="neon-text">代币管理</span>
            </h1>
            <p className="text-gray-500">查看通过平台部署的所有代币</p>
          </div>

          {tokens && Array.isArray(tokens) && tokens.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tokens.map((token: any) => (
                <div key={token.token_address} className="glass-card rounded-2xl p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="icon-container w-10 h-10 rounded-xl flex items-center justify-center">
                      <Coins className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{token.name}</h3>
                      <p className="text-sm text-gray-500">{token.symbol}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">合约地址</p>
                      <p className="font-mono text-gray-400">{formatAddress(token.token_address)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">部署者</p>
                      <p className="font-mono text-gray-400">{formatAddress(token.deployer_address)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">链 ID</p>
                        <p className="text-gray-400">{token.chain_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">部署时间</p>
                        <p className="text-gray-400">{formatDate(token.deployed_at)}</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`sort-order-${token.token_address}`} className="text-xs text-gray-500 mb-1 block">排序顺序</Label>
                      <div className="flex items-center space-x-2">
                        <Input id={`sort-order-${token.token_address}`} type="number"
                          value={sortOrderEdits[token.token_address] !== undefined ? sortOrderEdits[token.token_address] : (token.sort_order || 0)}
                          onChange={(e) => handleSortOrderChange(token.token_address, e.target.value)}
                          className="bg-white/5 border-white/10 text-white w-20 h-9 rounded-lg" placeholder="0" />
                        <Button onClick={() => handleSaveSortOrder(token.token_address)} size="sm" className="btn-gradient text-white h-9 px-3" disabled={updateSortOrder.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <a href={`https://bscscan.com/address/${token.token_address}`} target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center transition-colors pt-2">
                      查看链上信息
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-16 text-center text-gray-500">暂无已部署的代币</div>
          )}
        </div>
      </div>
    </div>
  );
}

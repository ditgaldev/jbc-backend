import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { formatAddress, formatDate } from '@/lib/utils';
import { Wallet, Pin, ExternalLink, Save } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useState } from 'react';

export function ListedTokenManagePage() {
  const queryClient = useQueryClient();
  const [sortOrderEdits, setSortOrderEdits] = useState<Record<number, number>>({});

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['admin-listed-tokens-all'],
    queryFn: async () => {
      const response = await apiClient.getListedTokens();
      return response.data || [];
    },
  });

  const updateSortOrder = useMutation({
    mutationFn: async ({ tokenId, sortOrder }: { tokenId: number; sortOrder: number }) => {
      const response = await apiClient.updateListedTokenSortOrder(tokenId, sortOrder);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listed-tokens-all'] });
      setSortOrderEdits({});
    },
  });

  const handleSortOrderChange = (tokenId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setSortOrderEdits((prev) => ({ ...prev, [tokenId]: numValue }));
  };

  const handleSaveSortOrder = (tokenId: number) => {
    const sortOrder = sortOrderEdits[tokenId] ?? 0;
    updateSortOrder.mutate({ tokenId, sortOrder });
  };

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Wallet className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">代币收录管理</h1>
            </div>
            <p className="text-gray-400">查看所有收录到平台的代币</p>
          </div>

          {tokens && Array.isArray(tokens) && tokens.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tokens.map((token: any) => (
                <Card key={token.id} className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <CardTitle className="text-lg text-white">代币收录</CardTitle>
                      </div>
                      {token.is_pinned && (
                        <Pin className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <CardDescription className="text-gray-400">链 ID: {token.chain_id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1 text-gray-300">代币地址</p>
                      <p className="text-sm font-mono text-gray-400">{formatAddress(token.token_address)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1 text-gray-300">提交者</p>
                      <p className="text-sm font-mono text-gray-400">{formatAddress(token.submitter_address)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1 text-gray-300">收录时间</p>
                        <p className="text-sm text-gray-400">{formatDate(token.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1 text-gray-300">状态</p>
                        <p className="text-sm text-gray-400">{token.is_pinned ? '已置顶' : '普通'}</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`sort-order-${token.id}`} className="text-sm font-medium mb-1 text-gray-300">
                        排序顺序
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id={`sort-order-${token.id}`}
                          type="number"
                          value={sortOrderEdits[token.id] !== undefined ? sortOrderEdits[token.id] : (token.sort_order || 0)}
                          onChange={(e) => handleSortOrderChange(token.id, e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white w-24"
                          placeholder="0"
                        />
                        <Button
                          onClick={() => handleSaveSortOrder(token.id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          disabled={updateSortOrder.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">数字越小越靠前</p>
                    </div>
                    <a
                      href={`https://bscscan.com/address/${token.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 hover:text-green-300 flex items-center transition-colors"
                    >
                      查看链上信息
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                暂无收录的代币
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


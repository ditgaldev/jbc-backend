import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { formatAddress, formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Star, ExternalLink, Globe, Save } from 'lucide-react';
import { useState } from 'react';
import { GeometricPattern } from '@/components/GeometricPattern';

export function DAppManagePage() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [sortOrderEdits, setSortOrderEdits] = useState<Record<number, number>>({});
  const [featuringDAppId, setFeaturingDAppId] = useState<number | null>(null);

  const { data: dapps, isLoading } = useQuery({
    queryKey: ['admin-dapps-all'],
    queryFn: async () => {
      const response = await apiClient.getDApps();
      return response.data || [];
    },
  });

  const updateDAppStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiClient.updateDAppStatus(id, status as 'pending' | 'active' | 'rejected');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-dapps-all'] }); setProcessingId(null); },
    onError: () => { setProcessingId(null); },
  });

  const updateDAppSortOrder = useMutation({
    mutationFn: async ({ id, sortOrder }: { id: number; sortOrder: number }) => {
      return await apiClient.updateDAppSortOrder(id, sortOrder);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-dapps-all'] }); setSortOrderEdits({}); },
  });

  const updateDAppFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: number; featured: boolean }) => {
      return await apiClient.updateDAppFeatured(id, featured);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-dapps-all'] }); setFeaturingDAppId(null); },
    onError: () => { alert('设置推荐位失败'); setFeaturingDAppId(null); },
  });

  const handleApprove = (id: number) => { setProcessingId(id); updateDAppStatus.mutate({ id, status: 'active' }); };
  const handleReject = (id: number) => { setProcessingId(id); updateDAppStatus.mutate({ id, status: 'rejected' }); };
  const handleSortOrderChange = (id: number, value: string) => { setSortOrderEdits((prev) => ({ ...prev, [id]: parseInt(value) || 0 })); };
  const handleSaveSortOrder = (id: number) => { updateDAppSortOrder.mutate({ id, sortOrder: sortOrderEdits[id] ?? 0 }); };
  const handleToggleFeatured = (dappId: number, currentFeatured: boolean) => { setFeaturingDAppId(dappId); updateDAppFeatured.mutate({ id: dappId, featured: !currentFeatured }); };

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

  const statusConfig = {
    pending: { label: '待审核', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    active: { label: '已通过', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    rejected: { label: '已拒绝', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  };

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-10">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Globe className="h-5 w-5 text-indigo-400 mr-2" />
              <span className="text-sm text-gray-400 tracking-wide">DApp 管理</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="neon-text">DApp 管理</span>
            </h1>
            <p className="text-gray-500">审核和管理平台上的 DApp</p>
          </div>

          {dapps && Array.isArray(dapps) && dapps.length > 0 ? (
            <div className="space-y-4">
              {dapps.map((dapp: any) => {
                const status = statusConfig[dapp.status as keyof typeof statusConfig];
                const StatusIcon = status?.icon || Clock;

                return (
                  <div key={dapp.id} className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-semibold text-white">{dapp.name}</h3>
                          {dapp.is_featured && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
                          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full border ${status?.bg}`}>
                            <StatusIcon className={`h-3 w-3 ${status?.color}`} />
                            <span className={`text-xs ${status?.color}`}>{status?.label}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{dapp.category}</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {dapp.description && <p className="text-sm text-gray-400">{dapp.description}</p>}

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">URL</p>
                          <a href={dapp.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center transition-colors">
                            {dapp.url.length > 30 ? dapp.url.slice(0, 30) + '...' : dapp.url}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">所有者</p>
                          <p className="text-sm font-mono text-gray-400">{formatAddress(dapp.owner_address)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">提交时间</p>
                          <p className="text-sm text-gray-400">{formatDate(dapp.created_at)}</p>
                        </div>
                        <div>
                          <Label htmlFor={`sort-order-${dapp.id}`} className="text-xs text-gray-500 mb-1 block">排序顺序</Label>
                          <div className="flex items-center space-x-2">
                            <Input id={`sort-order-${dapp.id}`} type="number"
                              value={sortOrderEdits[dapp.id] !== undefined ? sortOrderEdits[dapp.id] : (dapp.sort_order || 0)}
                              onChange={(e) => handleSortOrderChange(dapp.id, e.target.value)}
                              className="bg-white/5 border-white/10 text-white w-20 h-9 rounded-lg" placeholder="0" />
                            <Button onClick={() => handleSaveSortOrder(dapp.id)} size="sm" className="btn-gradient text-white h-9 px-3" disabled={updateDAppSortOrder.isPending}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {dapp.status === 'pending' && (
                        <div className="flex items-center space-x-2 pt-4 border-t border-white/5">
                          <Button onClick={() => handleApprove(dapp.id)} disabled={processingId === dapp.id} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
                            <CheckCircle className="mr-2 h-4 w-4" />通过
                          </Button>
                          <Button onClick={() => handleReject(dapp.id)} disabled={processingId === dapp.id} variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 rounded-lg">
                            <XCircle className="mr-2 h-4 w-4" />拒绝
                          </Button>
                        </div>
                      )}

                      {dapp.status === 'active' && (
                        <div className="flex items-center space-x-2 pt-4 border-t border-white/5">
                          {!dapp.is_featured ? (
                            <Button onClick={() => handleToggleFeatured(dapp.id, false)} disabled={featuringDAppId === dapp.id} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg">
                              <Star className="mr-2 h-4 w-4" />{featuringDAppId === dapp.id ? '处理中...' : '设置推荐位'}
                            </Button>
                          ) : (
                            <Button onClick={() => handleToggleFeatured(dapp.id, true)} disabled={featuringDAppId === dapp.id} size="sm" variant="outline" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 rounded-lg">
                              <Star className="mr-2 h-4 w-4 fill-yellow-400" />{featuringDAppId === dapp.id ? '处理中...' : '取消推荐位'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-16 text-center text-gray-500">暂无 DApp</div>
          )}
        </div>
      </div>
    </div>
  );
}

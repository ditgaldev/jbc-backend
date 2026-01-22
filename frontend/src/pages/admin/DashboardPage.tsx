import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Coins, Globe, Wallet, TrendingUp, Clock, CheckCircle, Settings, FileText } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';

export function DashboardPage() {
  const { data: dapps, isLoading: isLoadingDapps } = useQuery({
    queryKey: ['admin-dapps'],
    queryFn: async () => {
      const response = await apiClient.getDApps();
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const { data: deployedTokens, isLoading: isLoadingTokens } = useQuery({
    queryKey: ['admin-deployed-tokens'],
    queryFn: async () => {
      const response = await apiClient.getDeployedTokens();
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const { data: listedTokens, isLoading: isLoadingListed } = useQuery({
    queryKey: ['admin-listed-tokens'],
    queryFn: async () => {
      const response = await apiClient.getListedTokens();
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  if (isLoadingDapps || isLoadingTokens || isLoadingListed) {
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

  const stats = {
    totalDapps: dapps?.length || 0,
    activeDapps: dapps?.filter((d: any) => d.status === 'active').length || 0,
    pendingDapps: dapps?.filter((d: any) => d.status === 'pending').length || 0,
    featuredDapps: dapps?.filter((d: any) => d.is_featured).length || 0,
    totalDeployedTokens: deployedTokens?.length || 0,
    totalListedTokens: listedTokens?.length || 0,
    pinnedTokens: listedTokens?.filter((t: any) => t.is_pinned).length || 0,
  };

  const statCards = [
    { title: '已部署代币', value: stats.totalDeployedTokens, icon: Coins, description: '通过平台部署的代币总数', color: 'text-purple-400' },
    { title: '已收录代币', value: stats.totalListedTokens, icon: Wallet, description: '收录到平台的代币总数', color: 'text-blue-400' },
    { title: 'DApp 总数', value: stats.totalDapps, icon: Globe, description: '提交到平台的 DApp 总数', color: 'text-indigo-400' },
    { title: '活跃 DApp', value: stats.activeDapps, icon: CheckCircle, description: '已审核通过的 DApp', color: 'text-emerald-400' },
    { title: '待审核 DApp', value: stats.pendingDapps, icon: Clock, description: '等待审核的 DApp', color: 'text-yellow-400' },
    { title: '推荐位 DApp', value: stats.featuredDapps, icon: TrendingUp, description: '已设置推荐位的 DApp', color: 'text-orange-400' },
    { title: '置顶代币', value: stats.pinnedTokens, icon: TrendingUp, description: '已置顶的代币', color: 'text-pink-400' },
  ];

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-10">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Settings className="h-5 w-5 text-purple-400 mr-2" />
              <span className="text-sm text-gray-400 tracking-wide">管理后台</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="neon-text">数据统计</span>
            </h1>
            <p className="text-gray-500">平台数据统计和管理</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">{stat.title}</span>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="stat-number text-4xl font-bold neon-text mb-1">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              );
            })}
          </div>

          {/* 快速操作 */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-xl font-semibold text-white">快速操作</h2>
              <p className="text-sm text-gray-500 mt-1">常用管理功能</p>
            </div>
            <div className="p-6 grid gap-4 md:grid-cols-4">
              <Link to="/admin/dapps" className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-purple-500/30 hover:bg-white/[0.04] transition-all">
                <h3 className="font-semibold mb-1 text-white">DApp 管理</h3>
                <p className="text-sm text-gray-500">审核和管理 DApp</p>
              </Link>
              <Link to="/admin/tokens" className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-purple-500/30 hover:bg-white/[0.04] transition-all">
                <h3 className="font-semibold mb-1 text-white">代币管理</h3>
                <p className="text-sm text-gray-500">查看已部署的代币</p>
              </Link>
              <Link to="/admin/listed-tokens" className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-purple-500/30 hover:bg-white/[0.04] transition-all">
                <h3 className="font-semibold mb-1 text-white">收录管理</h3>
                <p className="text-sm text-gray-500">管理代币收录</p>
              </Link>
              <Link to="/admin/api-doc" className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-purple-500/30 hover:bg-white/[0.04] transition-all">
                <h3 className="font-semibold mb-1 text-white flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>API 文档</span>
                </h3>
                <p className="text-sm text-gray-500">钱包调用接口文档</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

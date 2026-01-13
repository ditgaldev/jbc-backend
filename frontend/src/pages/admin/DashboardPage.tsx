import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    return <div className="text-center py-12">加载中...</div>;
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
    {
      title: '已部署代币',
      value: stats.totalDeployedTokens,
      icon: Coins,
      description: '通过平台部署的代币总数',
      color: 'text-blue-500',
    },
    {
      title: '已收录代币',
      value: stats.totalListedTokens,
      icon: Wallet,
      description: '收录到平台的代币总数',
      color: 'text-purple-500',
    },
    {
      title: 'DApp 总数',
      value: stats.totalDapps,
      icon: Globe,
      description: '提交到平台的 DApp 总数',
      color: 'text-green-500',
    },
    {
      title: '活跃 DApp',
      value: stats.activeDapps,
      icon: CheckCircle,
      description: '已审核通过的 DApp',
      color: 'text-green-600',
    },
    {
      title: '待审核 DApp',
      value: stats.pendingDapps,
      icon: Clock,
      description: '等待审核的 DApp',
      color: 'text-yellow-500',
    },
    {
      title: '推荐位 DApp',
      value: stats.featuredDapps,
      icon: TrendingUp,
      description: '已设置推荐位的 DApp',
      color: 'text-orange-500',
    },
    {
      title: '置顶代币',
      value: stats.pinnedTokens,
      icon: TrendingUp,
      description: '已置顶的代币',
      color: 'text-pink-500',
    },
  ];

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Settings className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">管理后台</h1>
            </div>
            <p className="text-gray-400">平台数据统计和管理</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">{stat.title}</CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <p className="text-xs text-gray-400">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 快速操作 */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">快速操作</CardTitle>
              <CardDescription className="text-gray-400">常用管理功能</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Link
                to="/admin/dapps"
                className="p-4 border border-gray-800 rounded-lg hover:border-green-500/50 hover:bg-green-500/5 transition-all"
              >
                <h3 className="font-semibold mb-1 text-white">DApp 管理</h3>
                <p className="text-sm text-gray-400">审核和管理 DApp</p>
              </Link>
              <Link
                to="/admin/tokens"
                className="p-4 border border-gray-800 rounded-lg hover:border-green-500/50 hover:bg-green-500/5 transition-all"
              >
                <h3 className="font-semibold mb-1 text-white">代币管理</h3>
                <p className="text-sm text-gray-400">查看已部署的代币</p>
              </Link>
              <Link
                to="/admin/listed-tokens"
                className="p-4 border border-gray-800 rounded-lg hover:border-green-500/50 hover:bg-green-500/5 transition-all"
              >
                <h3 className="font-semibold mb-1 text-white">收录管理</h3>
                <p className="text-sm text-gray-400">管理代币收录</p>
              </Link>
              <Link
                to="/admin/api-doc"
                className="p-4 border border-gray-800 rounded-lg hover:border-green-500/50 hover:bg-green-500/5 transition-all"
              >
                <h3 className="font-semibold mb-1 text-white flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>API 文档</span>
                </h3>
                <p className="text-sm text-gray-400">钱包调用接口文档</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


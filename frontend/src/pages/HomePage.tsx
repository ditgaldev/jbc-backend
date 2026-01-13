import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Globe, Wallet } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function HomePage() {
  const { address, isConnected } = useAccount();

  // 获取已部署的代币数量（按当前用户地址过滤）
  const { data: deployedTokens, isLoading: isLoadingDeployed } = useQuery({
    queryKey: ['home-deployed-tokens', address],
    queryFn: async () => {
      const response = await apiClient.getDeployedTokens(
        address ? { deployerAddress: address } : undefined
      );
      return response.data || [];
    },
    enabled: !!isConnected && !!address,
  });

  // 获取 DApp 数量（按当前用户地址过滤）
  const { data: dapps, isLoading: isLoadingDapps } = useQuery({
    queryKey: ['home-dapps', address],
    queryFn: async () => {
      const response = await apiClient.getDApps(
        address ? { ownerAddress: address } : undefined
      );
      return response.data || [];
    },
    enabled: !!isConnected && !!address,
  });

  // 获取代币收录数量（按当前用户地址过滤）
  const { data: listedTokens, isLoading: isLoadingListed } = useQuery({
    queryKey: ['home-listed-tokens', address],
    queryFn: async () => {
      const response = await apiClient.getListedTokens(
        address ? { submitterAddress: address } : undefined
      );
      return response.data || [];
    },
    enabled: !!isConnected && !!address,
  });

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      
      <div className="container mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Hero Section - 参考图片的大型绿色区域 */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-8 md:p-12 pattern-bg">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-green-200 text-sm font-medium">Web3 工具化平台</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 glow-green-text">
              Tooling Platform
            </h1>
            
            <p className="text-xl md:text-2xl text-green-100 mb-2">
              自动化 Web3 服务平台
            </p>
            
            <p className="text-green-200 mb-8 max-w-2xl">
              B 端用户连接钱包后，付费即可自助完成上链、DApp 入驻或代币展示。全自助服务，无需人工干预，降低运营成本。
            </p>
          </div>
          
          {/* 装饰性圆圈图案 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-400/10 rounded-full -ml-24 -mb-24"></div>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link to="/deploy-token">
            <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Coins className="h-8 w-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">1 代币</span>
                </div>
                <h3 className="text-xl font-bold mb-2">一键发币</h3>
                <p className="text-gray-400 text-sm">
                  基于工厂合约的一键式代币部署，快速创建您的 ERC20 代币
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dapps/create">
            <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="h-8 w-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">1 代币</span>
                </div>
                <h3 className="text-xl font-bold mb-2">DApp 入驻</h3>
                <p className="text-gray-400 text-sm">
                  提交您的 DApp，让更多用户发现和使用
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tokens/list">
            <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                  <Wallet className="h-8 w-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">1 代币</span>
                </div>
                <h3 className="text-xl font-bold mb-2">代币收录</h3>
                <p className="text-gray-400 text-sm">
                  将您的代币收录到平台，提升曝光度
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 仪表板区域 - 显示统计数据 */}
        {isConnected && address && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gray-900 border-gray-800 pattern-bg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Coins className="h-6 w-6 text-green-400" />
                  <h3 className="text-sm text-gray-400">已部署代币</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {isLoadingDeployed ? (
                    <span className="text-gray-500">加载中...</span>
                  ) : (
                    deployedTokens?.length || 0
                  )}
                </p>
                <p className="text-xs text-gray-500">通过平台部署的代币总数</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 pattern-bg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Globe className="h-6 w-6 text-green-400" />
                  <h3 className="text-sm text-gray-400">DApp 数量</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {isLoadingDapps ? (
                    <span className="text-gray-500">加载中...</span>
                  ) : (
                    dapps?.length || 0
                  )}
                </p>
                <p className="text-xs text-gray-500">提交到平台的 DApp 总数</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 pattern-bg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Wallet className="h-6 w-6 text-green-400" />
                  <h3 className="text-sm text-gray-400">代币收录</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {isLoadingListed ? (
                    <span className="text-gray-500">加载中...</span>
                  ) : (
                    listedTokens?.length || 0
                  )}
                </p>
                <p className="text-xs text-gray-500">收录到平台的代币总数</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 核心原则 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-green-400">核心原则</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-white flex items-center space-x-2">
                  <span className="text-green-400">1.</span>
                  <span>全自助 (Self-Service)</span>
                </h3>
                <p className="text-sm text-gray-400">
                  所有服务（如发币）基于智能合约的"一键式"操作，无人工干预，降低运营成本。
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-white flex items-center space-x-2">
                  <span className="text-green-400">2.</span>
                  <span>纯链上身份</span>
                </h3>
                <p className="text-sm text-gray-400">
                  仅支持 Connect Wallet 登录，无传统注册流程，保护隐私且降低开发成本。
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-white flex items-center space-x-2">
                  <span className="text-green-400">3.</span>
                  <span>模板化交付</span>
                </h3>
                <p className="text-sm text-gray-400">
                  提供经过审计的标准合约模板（Factory Contracts），确保交付速度与安全性。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


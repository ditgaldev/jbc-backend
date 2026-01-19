import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Link2, Smartphone, Download, QrCode, ChevronDown, ChevronUp, Coins, Globe, Wallet } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatFileSize, formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

const chains = [
  { name: 'MACoinChain', color: 'bg-gradient-to-r from-green-500 to-emerald-400' },
  { name: 'Ethereum', color: 'bg-blue-500' },
  { name: 'BSC', color: 'bg-yellow-500' },
  { name: 'Polygon', color: 'bg-purple-500' },
  { name: 'Solana', color: 'bg-gradient-to-r from-purple-500 to-green-400' },
  { name: 'Arbitrum', color: 'bg-blue-400' },
  { name: 'Optimism', color: 'bg-red-500' },
];

export function HomePage() {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();

  const IOS_DOWNLOAD_URL = 'https://testflight.apple.com/join/Y5kpC7Q8';

  // 获取最新 APK 信息
  const { data: latestApk, isLoading: isLoadingApk } = useQuery({
    queryKey: ['latest-apk'],
    queryFn: async () => {
      const response = await apiClient.getLatestApk();
      console.log('[HomePage] Full APK response:', response);
      console.log('[HomePage] response.data:', response.data);
      console.log('[HomePage] uploadedAt:', response.data?.uploadedAt);
      console.log('[HomePage] fileSize:', response.data?.fileSize);
      if (response.data && response.data.url) {
        return response.data;
      }
      return null;
    },
  });

  // 调试日志
  console.log('[HomePage] latestApk state:', latestApk);
  console.log('[HomePage] latestApk?.uploadedAt:', latestApk?.uploadedAt);
  console.log('[HomePage] latestApk?.fileSize:', latestApk?.fileSize);

  const androidDownloadUrl = latestApk?.url || '';

  // 获取已部署的代币数量
  const { data: deployedTokens, isLoading: isLoadingDeployed } = useQuery({
    queryKey: ['home-deployed-tokens', address],
    queryFn: async () => {
      const response = await apiClient.getDeployedTokens(address ? { deployerAddress: address } : undefined);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!isConnected && !!address,
  });

  // 获取 DApp 数量
  const { data: dapps, isLoading: isLoadingDapps } = useQuery({
    queryKey: ['home-dapps', address],
    queryFn: async () => {
      const response = await apiClient.getDApps(address ? { ownerAddress: address } : undefined);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!isConnected && !!address,
  });

  // 获取代币收录数量
  const { data: listedTokens, isLoading: isLoadingListed } = useQuery({
    queryKey: ['home-listed-tokens', address],
    queryFn: async () => {
      const response = await apiClient.getListedTokens(address ? { submitterAddress: address } : undefined);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!isConnected && !!address,
  });

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      
      <div className="container mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-8 md:p-12">
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <img src="/logo.png" alt="MAToken Logo" className="w-16 h-16 rounded-xl" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('home.title')}</h1>
            <p className="text-lg md:text-xl text-purple-100 mb-6">{t('home.subtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
        </div>

        {/* Web3 Services Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-400 mb-2">{t('home.web3Services')}</h2>
          <p className="text-gray-400">{t('home.web3ServicesDesc')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link to="/deploy-token">
            <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Coins className="h-8 w-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">{t('home.oneToken')}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{t('home.deployToken')}</h3>
                <p className="text-gray-400 text-sm">{t('home.deployTokenDesc')}</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dapps/create">
            <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="h-8 w-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">{t('home.oneToken')}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{t('home.dappEntry')}</h3>
                <p className="text-gray-400 text-sm">{t('home.dappEntryDesc')}</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tokens/list">
            <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Wallet className="h-8 w-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">{t('home.oneToken')}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{t('home.tokenList')}</h3>
                <p className="text-gray-400 text-sm">{t('home.tokenListDesc')}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Dashboard */}
        {isConnected && address && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-gray-900 border-gray-800 pattern-bg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Coins className="h-6 w-6 text-green-400" />
                  <h3 className="text-sm text-gray-400">{t('home.deployedTokens')}</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {isLoadingDeployed ? <span className="text-gray-500">{t('common.loading')}</span> : deployedTokens?.length || 0}
                </p>
                <p className="text-xs text-gray-500">{t('home.deployedTokensDesc')}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 pattern-bg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Globe className="h-6 w-6 text-green-400" />
                  <h3 className="text-sm text-gray-400">{t('home.dappCount')}</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {isLoadingDapps ? <span className="text-gray-500">{t('common.loading')}</span> : dapps?.length || 0}
                </p>
                <p className="text-xs text-gray-500">{t('home.dappCountDesc')}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 pattern-bg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Wallet className="h-6 w-6 text-green-400" />
                  <h3 className="text-sm text-gray-400">{t('home.listedTokens')}</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {isLoadingListed ? <span className="text-gray-500">{t('common.loading')}</span> : listedTokens?.length || 0}
                </p>
                <p className="text-xs text-gray-500">{t('home.listedTokensDesc')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Core Features */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">{t('home.coreFeatures')}</h2>
          <p className="text-gray-400">{t('home.coreFeaturesDesc')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t('home.secureStorage')}</h3>
              <p className="text-sm text-gray-500">{t('home.secureStorageDesc')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/50 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Link2 className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t('home.multiChain')}</h3>
              <p className="text-sm text-gray-500">{t('home.multiChainDesc')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="h-7 w-7 text-green-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t('home.easyUse')}</h3>
              <p className="text-sm text-gray-500">{t('home.easyUseDesc')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-indigo-500/50 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode className="h-7 w-7 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{t('home.dappBrowser')}</h3>
              <p className="text-sm text-gray-500">{t('home.dappBrowserDesc')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Supported Chains */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">{t('home.supportedChains')}</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {chains.map((chain) => (
                <span key={chain.name} className={`${chain.color} px-4 py-2 rounded-full text-white text-sm font-medium`}>
                  {chain.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Download Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">{t('home.downloadNow')}</h2>
          <p className="text-gray-400">{t('home.downloadDesc')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* iOS Download */}
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-all">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="h-8 w-8 md:h-10 md:w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{t('home.iosVersion')}</h3>
                <p className="text-gray-400 mb-4 text-sm md:text-base">{t('home.iosDesc')}</p>
                <a href={IOS_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition text-center mb-4">
                  <Download className="inline-block mr-2 h-5 w-5" />{t('home.testflightDownload')}
                </a>
                <div className="hidden md:block">
                  <p className="text-xs text-gray-500 mb-2">{t('home.scanToDownload')}</p>
                  <div className="bg-white p-2 rounded-lg inline-block">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(IOS_DOWNLOAD_URL)}`} alt="iOS QR Code" className="w-20 h-20" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <h4 className="font-semibold text-white mb-3 text-sm">{t('home.versionInfo')}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">{t('home.currentVersion')}</span><span className="text-white font-medium">v1.0.0 Beta</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('home.platform')}</span><span className="text-white font-medium">iOS 14.0+</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Android Download */}
          <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="h-8 w-8 md:h-10 md:w-10 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.341c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm-11.046 0c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm11.4-6.744l1.959-3.392c.108-.188.044-.428-.144-.536-.188-.108-.428-.044-.536.144l-1.984 3.435c-1.504-.687-3.196-1.071-5.172-1.071s-3.668.384-5.172 1.071l-1.984-3.435c-.108-.188-.348-.252-.536-.144-.188.108-.252.348-.144.536l1.959 3.392c-3.328 1.812-5.523 5.26-5.523 9.203h22c0-3.943-2.195-7.391-5.523-9.203z"/>
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{t('home.androidVersion')}</h3>
                <p className="text-gray-400 mb-4 text-sm md:text-base">{t('home.androidDesc')}</p>
                {isLoadingApk ? (
                  <div className="w-full bg-gray-800 text-gray-400 py-3 px-6 rounded-lg font-semibold text-center mb-4">
                    {t('common.loading')}
                  </div>
                ) : latestApk && latestApk.url ? (
                  <a href={androidDownloadUrl} className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition text-center mb-4">
                    <Download className="inline-block mr-2 h-5 w-5" />{t('home.apkDownload')}
                  </a>
                ) : (
                  <div className="w-full bg-gray-800 text-gray-400 py-3 px-6 rounded-lg font-semibold text-center mb-4">
                    {t('home.comingSoon')}
                  </div>
                )}
                {latestApk && latestApk.url && (
                  <div className="hidden md:block">
                    <p className="text-xs text-gray-500 mb-2">{t('home.scanToDownload')}</p>
                    <div className="bg-white p-2 rounded-lg inline-block">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(androidDownloadUrl)}`} alt="Android QR Code" className="w-20 h-20" />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-800 pt-4">
                <h4 className="font-semibold text-white mb-3 text-sm">{t('home.versionInfo')}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('home.currentVersion')}</span>
                    <span className="text-white font-medium">
                      {isLoadingApk ? '...' : latestApk?.version ? `v${latestApk.version}` : t('home.noApkAvailable')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('home.updateTime')}</span>
                    <span className="text-white font-medium">
                      {isLoadingApk ? '...' : latestApk?.uploadedAt ? formatDate(latestApk.uploadedAt) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('home.fileSize')}</span>
                    <span className="text-white font-medium">
                      {isLoadingApk ? '...' : latestApk?.fileSize ? formatFileSize(latestApk.fileSize) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Installation Guide - Collapsible */}
        <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
          <CardContent className="p-0">
            <button onClick={() => setShowInstallGuide(!showInstallGuide)}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors rounded-xl">
              <h2 className="text-xl font-bold text-white">{t('home.installGuide')}</h2>
              {showInstallGuide ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
            </button>
            
            {showInstallGuide && (
              <div className="px-6 pb-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* iOS Guide */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mr-3">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white">{t('home.iosInstall')}</h3>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-400">
                      <li className="flex items-start">
                        <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">1</span>
                        <span>{t('home.iosStep1')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">2</span>
                        <span>{t('home.iosStep2')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">3</span>
                        <span>{t('home.iosStep3')}</span>
                      </li>
                    </ol>
                  </div>

                  {/* Android Guide */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.523 15.341c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm-11.046 0c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm11.4-6.744l1.959-3.392c.108-.188.044-.428-.144-.536-.188-.108-.428-.044-.536.144l-1.984 3.435c-1.504-.687-3.196-1.071-5.172-1.071s-3.668.384-5.172 1.071l-1.984-3.435c-.108-.188-.348-.252-.536-.144-.188.108-.252.348-.144.536l1.959 3.392c-3.328 1.812-5.523 5.26-5.523 9.203h22c0-3.943-2.195-7.391-5.523-9.203z"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white">{t('home.androidInstall')}</h3>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-400">
                      <li className="flex items-start">
                        <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">1</span>
                        <span>{t('home.androidStep1')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">2</span>
                        <span>{t('home.androidStep2')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">3</span>
                        <span>{t('home.androidStep3')}</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-gray-800">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="MAToken Logo" className="w-8 h-8 rounded-lg mr-2" />
            <span className="text-xl font-bold text-white">MAToken</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} MAToken. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

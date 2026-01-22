import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Link2, Smartphone, Download, QrCode, ChevronDown, ChevronUp, Coins, Globe, Wallet } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatFileSize, formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { PRICING } from '@/config/contracts';

const chains = [
  { name: 'MACoinChain', color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400' },
  { name: 'Ethereum', color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400' },
  { name: 'Ethereum Sepolia', color: 'from-blue-400/20 to-blue-500/20 border-blue-400/30 text-blue-300' },
];

export function HomePage() {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();

  const IOS_DOWNLOAD_URL = 'https://testflight.apple.com/join/Y5kpC7Q8';

  const { data: latestApk, isLoading: isLoadingApk } = useQuery({
    queryKey: ['latest-apk'],
    queryFn: async () => {
      const response = await apiClient.getLatestApk();
      if (response.data && response.data.url) {
        return response.data;
      }
      return null;
    },
  });

  const androidDownloadUrl = latestApk?.url || '';

  const { data: deployedTokens, isLoading: isLoadingDeployed } = useQuery({
    queryKey: ['home-deployed-tokens', address],
    queryFn: async () => {
      const response = await apiClient.getDeployedTokens(address ? { deployerAddress: address } : undefined);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!isConnected && !!address,
  });

  const { data: dapps, isLoading: isLoadingDapps } = useQuery({
    queryKey: ['home-dapps', address],
    queryFn: async () => {
      const response = await apiClient.getDApps(address ? { ownerAddress: address } : undefined);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!isConnected && !!address,
  });

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
      
      <div className="container mx-auto px-4 py-8 space-y-12 relative z-10">
        {/* Hero Section - 毛玻璃效果 */}
        <div className="glass-card rounded-3xl p-10 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              <span className="text-sm text-gray-400 tracking-wide">{t('home.multiChainSupport')}</span>
            </div>
            
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="MaToken Logo" className="w-20 h-20 rounded-2xl" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
              <span className="text-white">{t('home.titlePrefix')}</span>
              <br />
              <span className="neon-text">{t('home.title')}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto tracking-wide">
              {t('home.subtitle')}
            </p>
          </div>
        </div>

        {/* Web3 Services Section */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            <span className="neon-text">{t('home.web3Services')}</span>
          </h2>
          <p className="text-gray-500 text-lg tracking-wide">{t('home.web3ServicesDesc')}</p>
        </div>

        {/* 三个功能卡片 - 毛玻璃效果 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link to="/deploy-token">
            <div className="glass-card rounded-2xl p-8 h-full group cursor-pointer">
              <div className="flex items-start justify-between mb-6">
                <div className="icon-container w-14 h-14 rounded-2xl flex items-center justify-center">
                  <Coins className="h-7 w-7 text-purple-400" />
                </div>
                <span className="price-badge px-4 py-2 rounded-full text-sm font-semibold text-purple-300">
                  {PRICING.TOKEN_DEPLOY} USDT
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-purple-300 transition-colors">
                {t('home.deployToken')}
              </h3>
              <p className="text-gray-500 leading-relaxed">{t('home.deployTokenDesc')}</p>
            </div>
          </Link>

          <Link to="/dapps/create">
            <div className="glass-card rounded-2xl p-8 h-full group cursor-pointer">
              <div className="flex items-start justify-between mb-6">
                <div className="icon-container w-14 h-14 rounded-2xl flex items-center justify-center">
                  <Globe className="h-7 w-7 text-indigo-400" />
                </div>
                <span className="price-badge px-4 py-2 rounded-full text-sm font-semibold text-indigo-300">
                  {PRICING.DAPP_LISTING} USDT
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-indigo-300 transition-colors">
                {t('home.dappEntry')}
              </h3>
              <p className="text-gray-500 leading-relaxed">{t('home.dappEntryDesc')}</p>
            </div>
          </Link>

          <Link to="/tokens/list">
            <div className="glass-card rounded-2xl p-8 h-full group cursor-pointer">
              <div className="flex items-start justify-between mb-6">
                <div className="icon-container w-14 h-14 rounded-2xl flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-blue-400" />
                </div>
                <span className="price-badge px-4 py-2 rounded-full text-sm font-semibold text-blue-300">
                  {PRICING.TOKEN_LISTING} USDT
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-blue-300 transition-colors">
                {t('home.tokenList')}
              </h3>
              <p className="text-gray-500 leading-relaxed">{t('home.tokenListDesc')}</p>
            </div>
          </Link>
        </div>

        {/* Stats Dashboard - 现代数字字体 */}
        {isConnected && address && (
          <div className="glass-card rounded-2xl p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center">
                    <Coins className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
                <p className="stat-number text-5xl font-bold neon-text mb-2">
                  {isLoadingDeployed ? '...' : deployedTokens?.length || 0}
                </p>
                <p className="text-gray-500 text-sm tracking-wide">{t('home.deployedTokens')}</p>
              </div>
              
              <div className="text-center border-x border-white/5">
                <div className="flex items-center justify-center mb-4">
                  <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center">
                    <Globe className="h-6 w-6 text-indigo-400" />
                  </div>
                </div>
                <p className="stat-number text-5xl font-bold neon-text mb-2">
                  {isLoadingDapps ? '...' : dapps?.length || 0}
                </p>
                <p className="text-gray-500 text-sm tracking-wide">{t('home.dappCount')}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <p className="stat-number text-5xl font-bold neon-text mb-2">
                  {isLoadingListed ? '...' : listedTokens?.length || 0}
                </p>
                <p className="text-gray-500 text-sm tracking-wide">{t('home.listedTokens')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Core Features */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white">{t('home.coreFeatures')}</h2>
          <p className="text-gray-500 text-lg tracking-wide">{t('home.coreFeaturesDesc')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="icon-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2 tracking-wide">{t('home.secureStorage')}</h3>
            <p className="text-sm text-gray-500">{t('home.secureStorageDesc')}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="icon-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Link2 className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-white mb-2 tracking-wide">{t('home.multiChain')}</h3>
            <p className="text-sm text-gray-500">{t('home.multiChainDesc')}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="icon-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2 tracking-wide">{t('home.easyUse')}</h3>
            <p className="text-sm text-gray-500">{t('home.easyUseDesc')}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="icon-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-2 tracking-wide">{t('home.dappBrowser')}</h3>
            <p className="text-sm text-gray-500">{t('home.dappBrowserDesc')}</p>
          </div>
        </div>

        {/* Supported Chains */}
        <div className="glass-card rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-6 text-center tracking-wide">{t('home.supportedChains')}</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {chains.map((chain) => (
              <span 
                key={chain.name} 
                className={`px-5 py-2.5 rounded-full bg-gradient-to-r ${chain.color} text-sm font-medium border`}
              >
                {chain.name}
              </span>
            ))}
          </div>
        </div>

        {/* Download Section */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white">{t('home.downloadNow')}</h2>
          <p className="text-gray-500 text-lg tracking-wide">{t('home.downloadDesc')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* iOS Download */}
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="icon-container w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('home.iosVersion')}</h3>
              <p className="text-gray-500 mb-6">{t('home.iosDesc')}</p>
              
              <a href={IOS_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full glass-card hover:bg-white/5 px-6 py-4 rounded-xl font-semibold transition-all mb-4">
                <Download className="mr-2 h-5 w-5" />{t('home.testflightDownload')}
              </a>
              
              <div className="hidden md:block">
                <p className="text-xs text-gray-500 mb-2">{t('home.scanToDownload')}</p>
                <div className="bg-white p-2 rounded-lg inline-block">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(IOS_DOWNLOAD_URL)}`} alt="iOS QR Code" className="w-20 h-20" />
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-6">
              <h4 className="font-semibold text-white mb-3 text-sm">{t('home.versionInfo')}</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('home.currentVersion')}</span>
                  <span className="text-white font-medium">v1.0.0 Beta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('home.platform')}</span>
                  <span className="text-white font-medium">iOS 14.0+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Android Download */}
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.341c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm-11.046 0c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm11.4-6.744l1.959-3.392c.108-.188.044-.428-.144-.536-.188-.108-.428-.044-.536.144l-1.984 3.435c-1.504-.687-3.196-1.071-5.172-1.071s-3.668.384-5.172 1.071l-1.984-3.435c-.108-.188-.348-.252-.536-.144-.188.108-.252.348-.144.536l1.959 3.392c-3.328 1.812-5.523 5.26-5.523 9.203h22c0-3.943-2.195-7.391-5.523-9.203z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('home.androidVersion')}</h3>
              <p className="text-gray-500 mb-6">{t('home.androidDesc')}</p>
              
              {isLoadingApk ? (
                <div className="w-full glass-card text-gray-400 py-4 px-6 rounded-xl font-semibold text-center mb-4">
                  {t('common.loading')}
                </div>
              ) : latestApk && latestApk.url ? (
                <a href={androidDownloadUrl} 
                   className="inline-flex items-center justify-center w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 px-6 py-4 rounded-xl font-semibold transition-all mb-4">
                  <Download className="mr-2 h-5 w-5" />{t('home.apkDownload')}
                </a>
              ) : (
                <div className="w-full glass-card text-gray-400 py-4 px-6 rounded-xl font-semibold text-center mb-4">
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
            
            <div className="border-t border-white/5 pt-6">
              <h4 className="font-semibold text-white mb-3 text-sm">{t('home.versionInfo')}</h4>
              <div className="space-y-3 text-sm">
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
          </div>
        </div>

        {/* Installation Guide - Collapsible */}
        <div className="glass-card rounded-2xl max-w-4xl mx-auto overflow-hidden">
          <button 
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <h2 className="text-xl font-bold text-white tracking-wide">{t('home.installGuide')}</h2>
            {showInstallGuide ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
          </button>
          
          {showInstallGuide && (
            <div className="px-6 pb-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* iOS Guide */}
                <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center mb-4">
                    <div className="icon-container w-10 h-10 rounded-xl flex items-center justify-center mr-3">
                      <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{t('home.iosInstall')}</h3>
                  </div>
                  <ol className="space-y-3 text-sm text-gray-400">
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 border border-purple-500/30">1</span>
                      <span>{t('home.iosStep1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 border border-purple-500/30">2</span>
                      <span>{t('home.iosStep2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 border border-purple-500/30">3</span>
                      <span>{t('home.iosStep3')}</span>
                    </li>
                  </ol>
                </div>

                {/* Android Guide */}
                <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center mr-3">
                      <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.523 15.341c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm-11.046 0c-.5 0-.908.406-.908.908s.408.908.908.908.908-.406.908-.908-.408-.908-.908-.908zm11.4-6.744l1.959-3.392c.108-.188.044-.428-.144-.536-.188-.108-.428-.044-.536.144l-1.984 3.435c-1.504-.687-3.196-1.071-5.172-1.071s-3.668.384-5.172 1.071l-1.984-3.435c-.108-.188-.348-.252-.536-.144-.188.108-.252.348-.144.536l1.959 3.392c-3.328 1.812-5.523 5.26-5.523 9.203h22c0-3.943-2.195-7.391-5.523-9.203z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{t('home.androidInstall')}</h3>
                  </div>
                  <ol className="space-y-3 text-sm text-gray-400">
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 border border-emerald-500/30">1</span>
                      <span>{t('home.androidStep1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 border border-emerald-500/30">2</span>
                      <span>{t('home.androidStep2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 border border-emerald-500/30">3</span>
                      <span>{t('home.androidStep3')}</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-12 border-t border-white/5">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="MaToken Logo" className="w-10 h-10 rounded-xl mr-3" />
            <span className="text-xl font-bold text-white tracking-wide">MaToken</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} MaToken. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

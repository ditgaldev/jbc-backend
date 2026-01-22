import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Coins, Globe, Home, Settings, Mail, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Layout() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/deploy-token', label: t('nav.deployToken'), icon: Coins },
    { path: '/dapps', label: t('nav.dappEntry'), icon: Globe },
    { path: '/tokens', label: t('nav.tokenList'), icon: Wallet },
    ...(isAdmin ? [{ path: '/admin', label: t('nav.admin'), icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a0a0c' }}>
      {/* 导航栏 - 毛玻璃效果 */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ background: 'rgba(10, 10, 12, 0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-white tracking-wide">MaToken</span>
              </Link>
              
              {/* 桌面端导航链接 */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'text-white bg-white/10'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Mail className="h-4 w-4" />
                  <span>{t('nav.contact')}</span>
                </button>
              </nav>
            </div>
            
            {/* 右侧操作 */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              
              {/* RainbowKit 钱包连接按钮 */}
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                  const connected = mounted && account && chain;
                  return (
                    <div
                      {...(!mounted && {
                        'aria-hidden': true,
                        style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              className="btn-gradient px-4 py-2.5 rounded-xl font-medium text-white flex items-center space-x-2 whitespace-nowrap text-sm"
                            >
                              <Wallet className="h-4 w-4 flex-shrink-0" />
                              <span>{t('nav.connectWallet') || '连接钱包'}</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            onClick={openAccountModal}
                            className="btn-gradient px-4 py-2.5 rounded-xl font-medium text-white flex items-center space-x-2 whitespace-nowrap text-sm"
                          >
                            <Wallet className="h-4 w-4 flex-shrink-0" />
                            <span>{account.displayName}</span>
                          </button>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
              
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-400 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* 移动端菜单 */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-white/5 p-4 space-y-2" style={{ background: 'rgba(10, 10, 12, 0.95)' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => { setShowContactModal(true); setShowMobileMenu(false); }}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5 w-full"
            >
              <Mail className="h-5 w-5" />
              <span>{t('nav.contact')}</span>
            </button>
            <div className="pt-2 flex justify-start">
              <LanguageSwitcher />
            </div>
          </div>
        )}
      </header>

      {/* 主内容 - 添加顶部间距 */}
      <main className="min-h-screen pt-20">
        <Outlet />
      </main>

      {/* 联系我们弹窗 */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
          <div className="relative glass-card rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="text-center space-y-6">
              <div className="icon-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-purple-400" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('contact.title')}</h2>
                <p className="text-gray-400">{t('contact.description')}</p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('contact.emailLabel')}</p>
                  <a 
                    href="mailto:matokens@outlook.com" 
                    className="neon-text font-medium text-lg transition-colors"
                  >
                    matokens@outlook.com
                  </a>
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <p className="text-sm text-gray-500">{t('contact.responseTime')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


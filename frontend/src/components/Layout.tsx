import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Coins, Globe, Home, Settings, Mail, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Layout() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const [showContactModal, setShowContactModal] = useState(false);

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/deploy-token', label: t('nav.deployToken'), icon: Coins },
    { path: '/dapps', label: t('nav.dappEntry'), icon: Globe },
    { path: '/tokens', label: t('nav.tokenList'), icon: Wallet },
    // 如果是管理员，显示管理后台入口
    ...(isAdmin ? [{ path: '/admin', label: t('nav.admin'), icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 导航栏 - 参考图片设计 */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center glow-green">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-white">MaToken</span>
              </Link>
              
              {/* 导航链接 */}
              <nav className="hidden md:flex items-center space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'text-green-400 bg-green-400/10 glow-green-text'
                          : 'text-gray-400 hover:text-green-400 hover:bg-green-400/5'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {/* 联系我们按钮 */}
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-green-400 hover:bg-green-400/5"
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
              <div className="[&>button]:bg-green-500 [&>button]:hover:bg-green-600 [&>button]:text-white [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-lg [&>button]:font-medium [&>button]:transition-all [&>button]:glow-green">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="min-h-screen">
        <Outlet />
      </main>

      {/* 联系我们弹窗 */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-400" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('contact.title')}</h2>
                <p className="text-gray-400">{t('contact.description')}</p>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('contact.emailLabel')}</p>
                  <a 
                    href="mailto:matokens@outlook.com" 
                    className="text-green-400 hover:text-green-300 font-medium text-lg transition-colors"
                  >
                    matokens@outlook.com
                  </a>
                </div>
                
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400">{t('contact.responseTime')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


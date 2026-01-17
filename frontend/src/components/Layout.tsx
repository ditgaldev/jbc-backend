import { Link, useLocation, Outlet } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Coins, Globe, Home, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Layout() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();

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
    </div>
  );
}


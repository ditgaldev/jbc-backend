import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Globe, Coins, Wallet, LogOut, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function AdminLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: '看板', icon: LayoutDashboard },
    { path: '/admin/dapps', label: 'DApp 管理', icon: Globe },
    { path: '/admin/tokens', label: '代币管理', icon: Coins },
    { path: '/admin/listed-tokens', label: '收录管理', icon: Wallet },
    { path: '/admin/apk-upload', label: 'APK 管理', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/admin" className="text-2xl font-bold">
                管理后台
              </Link>
              <nav className="flex items-center space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                <span>返回前台</span>
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}


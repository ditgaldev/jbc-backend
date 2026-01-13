import { useAccount } from 'wagmi';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isConnected } = useAccount();

  // 临时放开：仅检查钱包连接，不验证管理员权限
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2 text-white">请先连接钱包</p>
          <p className="text-sm text-gray-400">需要连接钱包才能访问后台</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


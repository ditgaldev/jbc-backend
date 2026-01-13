import { useAccount } from 'wagmi';

// 写死的管理员地址
const ADMIN_ADDRESS = '0x4064570fd15dd67281f1f410a7ce3ee0b10fa422';

/**
 * 检查当前用户是否是管理员
 */
export function useAdmin() {
  const { address, isConnected } = useAccount();

  // 直接检查地址是否匹配（不区分大小写）
  const isAdmin = isConnected && address 
    ? address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()
    : false;

  return {
    isAdmin,
    isLoading: false,
  };
}


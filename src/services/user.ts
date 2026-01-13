import type { User } from '../types';

/**
 * 获取或创建用户
 */
export async function getOrCreateUser(
  db: D1Database,
  walletAddress: string
): Promise<User> {
  const existing = await db.prepare(
    'SELECT * FROM users WHERE wallet_address = ?'
  ).bind(walletAddress.toLowerCase()).first<User>();

  if (existing) {
    return existing;
  }

  // 创建新用户
  const now = Date.now();
  await db.prepare(
    'INSERT INTO users (wallet_address, created_at, role) VALUES (?, ?, ?)'
  ).bind(walletAddress.toLowerCase(), now, 'user').run();

  return {
    walletAddress: walletAddress.toLowerCase(),
    createdAt: now,
    role: 'user',
  };
}

/**
 * 获取用户信息
 */
export async function getUser(db: D1Database, walletAddress: string): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE wallet_address = ?'
  ).bind(walletAddress.toLowerCase()).first<User>();

  return result || null;
}

/**
 * 设置用户角色（仅用于初始化管理员）
 */
export async function setUserRole(
  db: D1Database,
  walletAddress: string,
  role: 'user' | 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = Date.now();
    
    // 检查用户是否存在
    const existing = await getUser(db, walletAddress);
    
    if (existing) {
      // 更新现有用户
      await db.prepare(
        'UPDATE users SET role = ? WHERE wallet_address = ?'
      ).bind(role, walletAddress.toLowerCase()).run();
    } else {
      // 创建新用户
      await db.prepare(
        'INSERT INTO users (wallet_address, created_at, role) VALUES (?, ?, ?)'
      ).bind(walletAddress.toLowerCase(), now, role).run();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error setting user role:', error);
    return { success: false, error: 'Failed to set user role' };
  }
}

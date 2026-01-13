import type { DeployedToken, ListedToken, ListTokenRequest, PinTokenRequest, Env } from '../types';
import { verifyPayment, recordPayment, isPaymentRecorded } from './payment';

/**
 * 索引已部署的代币（在链上交易确认后调用）
 */
export async function indexDeployedToken(
  db: D1Database,
  token: {
    chainId: number;
    tokenAddress: string;
    deployerAddress: string;
    name: string;
    symbol: string;
    logoR2Key?: string;
    deployedAt: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.prepare(
      `INSERT OR REPLACE INTO deployed_tokens (
        chain_id, token_address, deployer_address, name, symbol, logo_r2_key, deployed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      token.chainId,
      token.tokenAddress.toLowerCase(),
      token.deployerAddress.toLowerCase(),
      token.name,
      token.symbol,
      token.logoR2Key || null,
      token.deployedAt
    ).run();

    return { success: true };
  } catch (error) {
    console.error('Error indexing deployed token:', error);
    return { success: false, error: 'Failed to index token' };
  }
}

/**
 * 收录代币
 */
export async function listToken(
  db: D1Database,
  request: ListTokenRequest,
  submitterAddress: string,
  env: Env
): Promise<{ success: boolean; token?: ListedToken; error?: string }> {
  try {
    // 验证支付
    const paymentVerified = await verifyPayment(
      request.paymentTxHash,
      request.chainId,
      'token_listing',
      submitterAddress,
      env.USDT_CONTRACT_ADDRESS || '',
      'USDT',
      env
    );

    if (!paymentVerified.valid) {
      return { success: false, error: paymentVerified.error || 'Payment verification failed' };
    }

    // 检查支付是否已使用
    const paymentUsed = await isPaymentRecorded(db, request.paymentTxHash);
    if (paymentUsed) {
      return { success: false, error: 'Payment transaction already used' };
    }

    // 记录支付
    await recordPayment(
      db,
      request.paymentTxHash,
      submitterAddress,
      env.USDT_CONTRACT_ADDRESS || '',
      '99', // TOKEN_LISTING price
      'USDT',
      request.chainId,
      'token_listing'
    );

    // 创建代币收录记录
    const now = Date.now();
    const insertResult = await db.prepare(
      `INSERT INTO listed_tokens (
        chain_id, token_address, submitter_address, logo_r2_key, is_pinned, payment_tx_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`
    ).bind(
      request.chainId,
      request.tokenAddress.toLowerCase(),
      submitterAddress.toLowerCase(),
      request.logoR2Key || null,
      request.paymentTxHash,
      now,
      now
    ).run();

    if (!insertResult.success) {
      return { success: false, error: 'Failed to list token' };
    }

    // 获取插入的记录
    const result = await db.prepare(
      'SELECT * FROM listed_tokens WHERE id = ?'
    ).bind(insertResult.meta.last_row_id).first<ListedToken>();

    if (!result) {
      return { success: false, error: 'Failed to retrieve listed token' };
    }

    return { success: true, token: result };
  } catch (error) {
    console.error('Error listing token:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * 置顶代币
 */
export async function pinToken(
  db: D1Database,
  request: PinTokenRequest,
  submitterAddress: string,
  env: Env
): Promise<{ success: boolean; error?: string }> {
  try {
    // 验证代币所有权
    const token = await db.prepare(
      'SELECT * FROM listed_tokens WHERE id = ? AND submitter_address = ?'
    ).bind(request.tokenId, submitterAddress.toLowerCase()).first<ListedToken>();

    if (!token) {
      return { success: false, error: 'Token not found or access denied' };
    }

    // 验证支付
    const paymentVerified = await verifyPayment(
      request.paymentTxHash,
      token.chainId,
      'token_pinned',
      submitterAddress,
      env.USDT_CONTRACT_ADDRESS || '',
      'USDT',
      env
    );

    if (!paymentVerified.valid) {
      return { success: false, error: paymentVerified.error || 'Payment verification failed' };
    }

    // 检查支付是否已使用
    const paymentUsed = await isPaymentRecorded(db, request.paymentTxHash);
    if (paymentUsed) {
      return { success: false, error: 'Payment transaction already used' };
    }

    // 记录支付
    await recordPayment(
      db,
      request.paymentTxHash,
      submitterAddress,
      env.USDT_CONTRACT_ADDRESS || '',
      '999', // TOKEN_PINNED price
      'USDT',
      token.chainId,
      'token_pinned',
      request.tokenId.toString()
    );

    // 更新代币状态
    const now = Date.now();
    await db.prepare(
      'UPDATE listed_tokens SET is_pinned = 1, updated_at = ? WHERE id = ?'
    ).bind(now, request.tokenId).run();

    return { success: true };
  } catch (error) {
    console.error('Error pinning token:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * 获取已部署的代币列表
 */
export async function getDeployedTokens(
  db: D1Database,
  filters: {
    chainId?: number;
    deployerAddress?: string;
  } = {}
): Promise<DeployedToken[]> {
  let query = 'SELECT * FROM deployed_tokens WHERE 1=1';
  const params: any[] = [];

  if (filters.chainId) {
    query += ' AND chain_id = ?';
    params.push(filters.chainId);
  }

  if (filters.deployerAddress) {
    query += ' AND deployer_address = ?';
    params.push(filters.deployerAddress.toLowerCase());
  }

  // 排序：先按 sort_order 升序（数字越小越靠前），再按 deployed_at 降序
  query += ' ORDER BY sort_order ASC, deployed_at DESC';

  const result = await db.prepare(query).bind(...params).all<DeployedToken>();
  return result.results || [];
}

/**
 * 获取收录的代币列表
 */
export async function getListedTokens(
  db: D1Database,
  filters: {
    chainId?: number;
    submitterAddress?: string;
    pinned?: boolean;
  } = {}
): Promise<ListedToken[]> {
  let query = 'SELECT * FROM listed_tokens WHERE 1=1';
  const params: any[] = [];

  if (filters.chainId) {
    query += ' AND chain_id = ?';
    params.push(filters.chainId);
  }

  if (filters.submitterAddress) {
    query += ' AND submitter_address = ?';
    params.push(filters.submitterAddress.toLowerCase());
  }

  if (filters.pinned !== undefined) {
    query += ' AND is_pinned = ?';
    params.push(filters.pinned ? 1 : 0);
  }

  // 排序：先按 sort_order 升序（数字越小越靠前），再按 is_pinned 降序，最后按 created_at 降序
  query += ' ORDER BY sort_order ASC, is_pinned DESC, created_at DESC';

  const result = await db.prepare(query).bind(...params).all<ListedToken>();
  return result.results || [];
}

/**
 * 更新已部署代币的排序顺序（管理员操作）
 */
export async function updateDeployedTokenSortOrder(
  db: D1Database,
  tokenAddress: string,
  sortOrder: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查代币是否存在
    const token = await db
      .prepare('SELECT * FROM deployed_tokens WHERE token_address = ?')
      .bind(tokenAddress.toLowerCase())
      .first<DeployedToken>();

    if (!token) {
      return { success: false, error: 'Token not found' };
    }

    // 更新排序顺序
    await db
      .prepare('UPDATE deployed_tokens SET sort_order = ? WHERE token_address = ?')
      .bind(sortOrder, tokenAddress.toLowerCase())
      .run();

    return { success: true };
  } catch (error) {
    console.error('Error updating deployed token sort order:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * 更新收录代币的排序顺序（管理员操作）
 */
export async function updateListedTokenSortOrder(
  db: D1Database,
  tokenId: number,
  sortOrder: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查代币是否存在
    const token = await db
      .prepare('SELECT * FROM listed_tokens WHERE id = ?')
      .bind(tokenId)
      .first<ListedToken>();

    if (!token) {
      return { success: false, error: 'Token not found' };
    }

    // 更新排序顺序
    const now = Date.now();
    await db
      .prepare('UPDATE listed_tokens SET sort_order = ?, updated_at = ? WHERE id = ?')
      .bind(sortOrder, now, tokenId)
      .run();

    return { success: true };
  } catch (error) {
    console.error('Error updating listed token sort order:', error);
    return { success: false, error: 'Internal server error' };
  }
}


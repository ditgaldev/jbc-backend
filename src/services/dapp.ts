import type { DApp, CreateDAppRequest, FeatureDAppRequest, Env } from '../types';

/**
 * 创建 DApp 记录（简化版：只存储元数据）
 */
export async function createDApp(
  db: D1Database,
  request: CreateDAppRequest,
  ownerAddress: string,
  env: Env
): Promise<{ success: boolean; dapp?: DApp; error?: string }> {
  try {
    console.log('[Service] Creating DApp with data:', {
      ownerAddress,
      name: request.name,
      url: request.url,
      category: request.category,
      hasDescription: !!request.description,
      hasLogo: !!request.logoR2Key,
    });

    // 直接创建 DApp 记录，不验证支付
    const now = Date.now();
    console.log('[Service] Inserting DApp into database...');
    
    const insertResult = await db.prepare(
      `INSERT INTO dapps (
        owner_address, name, description, url, logo_r2_key, category, status, is_featured, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)`
    ).bind(
      ownerAddress.toLowerCase(),
      request.name,
      request.description || null,
      request.url,
      request.logoR2Key || null,
      request.category,
      now
    ).run();

    console.log('[Service] Insert result:', {
      success: insertResult.success,
      lastRowId: insertResult.meta.last_row_id,
    });

    if (!insertResult.success) {
      console.error('[Service] Database insert failed');
      return { success: false, error: 'Failed to create DApp' };
    }

    // 获取插入的记录
    console.log('[Service] Retrieving created DApp with ID:', insertResult.meta.last_row_id);
    const result = await db.prepare(
      'SELECT * FROM dapps WHERE id = ?'
    ).bind(insertResult.meta.last_row_id).first<DApp>();

    if (!result) {
      console.error('[Service] Failed to retrieve created DApp');
      return { success: false, error: 'Failed to retrieve created DApp' };
    }

    console.log('[Service] DApp created successfully:', result.id);
    return { success: true, dapp: result };
  } catch (error) {
    console.error('[Service] Error creating DApp:', error);
    console.error('[Service] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error' };
  }
}

/**
 * 设置 DApp 为推荐位
 */
export async function featureDApp(
  db: D1Database,
  request: FeatureDAppRequest,
  ownerAddress: string,
  env: Env
): Promise<{ success: boolean; error?: string }> {
  try {
    // 验证 DApp 所有权
    const dapp = await db.prepare(
      'SELECT * FROM dapps WHERE id = ? AND owner_address = ?'
    ).bind(request.dappId, ownerAddress.toLowerCase()).first<DApp>();

    if (!dapp) {
      return { success: false, error: 'DApp not found or access denied' };
    }

    // 验证支付
    const paymentVerified = await verifyPayment(
      request.paymentTxHash,
      request.chainId,
      'dapp_featured',
      ownerAddress,
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
      ownerAddress,
      env.USDT_CONTRACT_ADDRESS || '',
      '500', // DAPP_FEATURED price
      'USDT',
      request.chainId,
      'dapp_featured',
      request.dappId.toString()
    );

    // 更新 DApp 状态
    await db.prepare(
      'UPDATE dapps SET is_featured = 1 WHERE id = ?'
    ).bind(request.dappId).run();

    return { success: true };
  } catch (error) {
    console.error('Error featuring DApp:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * 获取 DApp 列表
 */
export async function getDApps(
  db: D1Database,
  filters: {
    status?: string;
    category?: string;
    featured?: boolean;
    ownerAddress?: string;
  } = {}
): Promise<DApp[]> {
  let query = 'SELECT * FROM dapps WHERE 1=1';
  const params: any[] = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.featured !== undefined) {
    query += ' AND is_featured = ?';
    params.push(filters.featured ? 1 : 0);
  }

  if (filters.ownerAddress) {
    query += ' AND owner_address = ?';
    params.push(filters.ownerAddress.toLowerCase());
  }

  // 排序：先按 sort_order 升序（数字越小越靠前），再按 is_featured 降序，最后按 created_at 降序
  query += ' ORDER BY sort_order ASC, is_featured DESC, created_at DESC';

  const result = await db.prepare(query).bind(...params).all<DApp>();
  return result.results || [];
}

/**
 * 获取单个 DApp
 */
export async function getDAppById(db: D1Database, id: number): Promise<DApp | null> {
  const result = await db.prepare('SELECT * FROM dapps WHERE id = ?').bind(id).first<DApp>();
  return result || null;
}

/**
 * 更新 DApp 状态（管理员操作）
 */
export async function updateDAppStatus(
  db: D1Database,
  id: number,
  status: 'pending' | 'active' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查 DApp 是否存在
    const dapp = await getDAppById(db, id);
    if (!dapp) {
      return { success: false, error: 'DApp not found' };
    }

    // 更新状态
    await db.prepare('UPDATE dapps SET status = ? WHERE id = ?').bind(status, id).run();

    return { success: true };
  } catch (error) {
    console.error('Error updating DApp status:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * 更新 DApp 排序顺序（管理员操作）
 */
export async function updateDAppSortOrder(
  db: D1Database,
  id: number,
  sortOrder: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查 DApp 是否存在
    const dapp = await getDAppById(db, id);
    if (!dapp) {
      return { success: false, error: 'DApp not found' };
    }

    // 更新排序顺序
    await db.prepare('UPDATE dapps SET sort_order = ? WHERE id = ?').bind(sortOrder, id).run();

    return { success: true };
  } catch (error) {
    console.error('Error updating DApp sort order:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * 更新 DApp 推荐位状态（管理员操作，无需支付）
 */
export async function updateDAppFeatured(
  db: D1Database,
  id: number,
  featured: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查 DApp 是否存在
    const dapp = await getDAppById(db, id);
    if (!dapp) {
      return { success: false, error: 'DApp not found' };
    }

    // 更新推荐位状态
    await db.prepare('UPDATE dapps SET is_featured = ? WHERE id = ?').bind(featured ? 1 : 0, id).run();

    return { success: true };
  } catch (error) {
    console.error('Error updating DApp featured status:', error);
    return { success: false, error: 'Internal server error' };
  }
}


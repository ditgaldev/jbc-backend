import { Hono } from 'hono';
import { jwtAuth } from '../middleware/auth';
import { getDAppById, updateDAppStatus, updateDAppSortOrder } from '../services/dapp';
import { updateDeployedTokenSortOrder, updateListedTokenSortOrder } from '../services/token';
import { setUserRole } from '../services/user';
import type { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// 中间件：检查管理员权限
admin.use('*', jwtAuth, async (c, next) => {
  const userAddress = (c as any).get('userAddress');
  if (!userAddress) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const db = c.env.DB;
  const user = await db
    .prepare('SELECT role FROM users WHERE wallet_address = ?')
    .bind(userAddress)
    .first<{ role: string }>();

  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
  }

  await next();
});

// 更新 DApp 状态
admin.put('/dapps/:id/status', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ status: 'pending' | 'active' | 'rejected' }>();

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid DApp ID' }, 400);
  }

  if (!['pending', 'active', 'rejected'].includes(body.status)) {
    return c.json({ success: false, error: 'Invalid status' }, 400);
  }

  const result = await updateDAppStatus(db, id, body.status);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'DApp status updated' });
});

// 更新 DApp 排序顺序
admin.put('/dapps/:id/sort-order', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ sortOrder: number }>();

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid DApp ID' }, 400);
  }

  if (typeof body.sortOrder !== 'number') {
    return c.json({ success: false, error: 'Invalid sort order' }, 400);
  }

  const result = await updateDAppSortOrder(db, id, body.sortOrder);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'DApp sort order updated' });
});

// 更新已部署代币的排序顺序
admin.put('/tokens/deployed/:address/sort-order', async (c) => {
  const db = c.env.DB;
  const tokenAddress = c.req.param('address');
  const body = await c.req.json<{ sortOrder: number }>();

  if (!tokenAddress) {
    return c.json({ success: false, error: 'Invalid token address' }, 400);
  }

  if (typeof body.sortOrder !== 'number') {
    return c.json({ success: false, error: 'Invalid sort order' }, 400);
  }

  const result = await updateDeployedTokenSortOrder(db, tokenAddress, body.sortOrder);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'Deployed token sort order updated' });
});

// 更新收录代币的排序顺序
admin.put('/tokens/listed/:id/sort-order', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ sortOrder: number }>();

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid token ID' }, 400);
  }

  if (typeof body.sortOrder !== 'number') {
    return c.json({ success: false, error: 'Invalid sort order' }, 400);
  }

  const result = await updateListedTokenSortOrder(db, id, body.sortOrder);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'Listed token sort order updated' });
});

// 设置用户角色（仅用于开发/初始化，生产环境应该移除或加强权限检查）
admin.post('/users/:address/role', async (c) => {
  const db = c.env.DB;
  const address = c.req.param('address');
  const body = await c.req.json<{ role: 'user' | 'admin' }>();

  if (!body.role || !['user', 'admin'].includes(body.role)) {
    return c.json({ success: false, error: 'Invalid role' }, 400);
  }

  const result = await setUserRole(db, address, body.role);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'User role updated' });
});

export default admin;

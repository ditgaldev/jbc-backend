import { Hono } from 'hono';
import { jwtAuth } from '../middleware/auth';
import { getDAppById, updateDAppStatus, updateDAppSortOrder, updateDAppFeatured } from '../services/dapp';
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

// 设置 DApp 推荐位（管理员操作，无需支付）
admin.put('/dapps/:id/featured', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ featured: boolean }>();

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid DApp ID' }, 400);
  }

  if (typeof body.featured !== 'boolean') {
    return c.json({ success: false, error: 'Invalid featured value' }, 400);
  }

  const result = await updateDAppFeatured(db, id, body.featured);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: body.featured ? 'DApp featured' : 'DApp unfeatured' });
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

// APK 文件上传
admin.post('/apk/upload', async (c) => {
  const userAddress = (c as any).get('userAddress');
  const db = c.env.DB;

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const version = formData.get('version') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // 验证文件类型（只允许 APK）
    if (!file.name.endsWith('.apk')) {
      return c.json({ success: false, error: 'Invalid file type. Only APK files are allowed.' }, 400);
    }

    if (!name || !name.trim()) {
      return c.json({ success: false, error: 'File name is required' }, 400);
    }

    // 生成唯一文件名（使用时间戳和随机字符串）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `apk/${timestamp}-${randomStr}.apk`;

    // 上传到 R2
    const r2 = c.env.R2;
    await r2.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: 'application/vnd.android.package-archive',
      },
    });

    // 保存到数据库
    const now = Date.now();
    const downloadUrl = `/api/upload/${fileName}`;
    
    const result = await db.prepare(
      `INSERT INTO apk_files (
        name, file_name, file_size, version, description, r2_key, download_url,
        uploaded_by, uploaded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name.trim(),
      file.name,
      file.size,
      version?.trim() || null,
      description?.trim() || null,
      fileName,
      downloadUrl,
      userAddress.toLowerCase(),
      now,
      now
    ).run();

    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        name: name.trim(),
        fileName: file.name,
        fileSize: file.size,
        version: version?.trim() || null,
        description: description?.trim() || null,
        downloadUrl,
        uploadedAt: now,
        uploadedBy: userAddress,
      },
    });
  } catch (error) {
    console.error('APK upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

// 获取 APK 文件列表
admin.get('/apk/files', async (c) => {
  const db = c.env.DB;

  try {
    const files = await db.prepare(
      'SELECT * FROM apk_files ORDER BY uploaded_at DESC'
    ).all<{
      id: number;
      name: string;
      file_name: string;
      file_size: number;
      version: string | null;
      description: string | null;
      r2_key: string;
      download_url: string;
      uploaded_by: string;
      uploaded_at: number;
      created_at: number;
    }>();

    return c.json({
      success: true,
      data: files.results || [],
    });
  } catch (error) {
    console.error('Get APK files error:', error);
    return c.json({ success: false, error: 'Failed to get APK files' }, 500);
  }
});

// 删除 APK 文件
admin.delete('/apk/files/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid APK file ID' }, 400);
  }

  try {
    // 获取文件信息
    const file = await db.prepare(
      'SELECT r2_key FROM apk_files WHERE id = ?'
    ).bind(id).first<{ r2_key: string }>();

    if (!file) {
      return c.json({ success: false, error: 'APK file not found' }, 404);
    }

    // 从 R2 删除文件
    const r2 = c.env.R2;
    await r2.delete(file.r2_key);

    // 从数据库删除记录
    await db.prepare('DELETE FROM apk_files WHERE id = ?').bind(id).run();

    return c.json({ success: true, message: 'APK file deleted' });
  } catch (error) {
    console.error('Delete APK file error:', error);
    return c.json({ success: false, error: 'Failed to delete APK file' }, 500);
  }
});

export default admin;

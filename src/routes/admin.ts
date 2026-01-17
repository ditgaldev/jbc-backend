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

// APK 文件上传 - 第一步：注册文件信息，返回上传 URL
admin.post('/apk/upload', async (c) => {
  const userAddress = (c as any).get('userAddress');
  const db = c.env.DB;

  try {
    const body = await c.req.json<{
      name: string;
      fileName: string;
      fileSize: number;
      version?: string;
      description?: string;
    }>();

    const { name, fileName, fileSize, version, description } = body;

    if (!fileName || !fileName.endsWith('.apk')) {
      return c.json({ success: false, error: 'Invalid file type. Only APK files are allowed.' }, 400);
    }

    if (!name || !name.trim()) {
      return c.json({ success: false, error: 'File name is required' }, 400);
    }

    if (!fileSize || fileSize <= 0) {
      return c.json({ success: false, error: 'Invalid file size' }, 400);
    }

    // 文件大小限制：500MB
    const maxSize = 500 * 1024 * 1024;
    if (fileSize > maxSize) {
      return c.json({ success: false, error: 'File too large. Maximum size is 500MB.' }, 400);
    }

    // 生成唯一文件名（使用时间戳和随机字符串）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const r2Key = `apk/${timestamp}-${randomStr}.apk`;

    // 保存到数据库
    const now = Date.now();
    const downloadUrl = `/api/upload/${r2Key}`;
    
    const result = await db.prepare(
      `INSERT INTO apk_files (
        name, file_name, file_size, version, description, r2_key, download_url,
        uploaded_by, uploaded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name.trim(),
      fileName,
      fileSize,
      version?.trim() || null,
      description?.trim() || null,
      r2Key,
      downloadUrl,
      userAddress.toLowerCase(),
      now,
      now
    ).run();

    const fileId = result.meta.last_row_id;

    // 创建 R2 multipart upload
    const r2 = c.env.R2;
    const multipartUpload = await r2.createMultipartUpload(r2Key, {
      httpMetadata: {
        contentType: 'application/vnd.android.package-archive',
      },
    });

    return c.json({
      success: true,
      data: {
        id: fileId,
        r2Key,
        uploadId: multipartUpload.uploadId,
        name: name.trim(),
        fileName,
        fileSize,
        version: version?.trim() || null,
        description: description?.trim() || null,
        downloadUrl,
        uploadedAt: now,
        uploadedBy: userAddress,
      },
    });
  } catch (error) {
    console.error('APK upload init error:', error);
    return c.json({ success: false, error: 'Upload initialization failed' }, 500);
  }
});

// APK 文件上传 - 第二步：上传分块
admin.post('/apk/upload/:id/part', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid APK file ID' }, 400);
  }

  try {
    const uploadId = c.req.query('uploadId');
    const partNumber = parseInt(c.req.query('partNumber') || '1');

    if (!uploadId) {
      return c.json({ success: false, error: 'Upload ID is required' }, 400);
    }

    // 获取文件记录
    const fileRecord = await db.prepare(
      'SELECT r2_key FROM apk_files WHERE id = ?'
    ).bind(id).first<{ r2_key: string }>();

    if (!fileRecord) {
      return c.json({ success: false, error: 'APK file record not found' }, 404);
    }

    // 获取上传的分块数据
    const body = await c.req.arrayBuffer();

    // 上传分块到 R2
    const r2 = c.env.R2;
    const multipartUpload = r2.resumeMultipartUpload(fileRecord.r2_key, uploadId);
    const uploadedPart = await multipartUpload.uploadPart(partNumber, body);

    return c.json({
      success: true,
      data: {
        partNumber,
        etag: uploadedPart.etag,
      },
    });
  } catch (error) {
    console.error('APK part upload error:', error);
    return c.json({ success: false, error: 'Part upload failed' }, 500);
  }
});

// APK 文件上传 - 第三步：完成上传
admin.post('/apk/upload/:id/complete', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid APK file ID' }, 400);
  }

  try {
    const body = await c.req.json<{
      uploadId: string;
      parts: Array<{ partNumber: number; etag: string }>;
    }>();

    const { uploadId, parts } = body;

    if (!uploadId || !parts || parts.length === 0) {
      return c.json({ success: false, error: 'Upload ID and parts are required' }, 400);
    }

    // 获取文件记录
    const fileRecord = await db.prepare(
      'SELECT r2_key FROM apk_files WHERE id = ?'
    ).bind(id).first<{ r2_key: string }>();

    if (!fileRecord) {
      return c.json({ success: false, error: 'APK file record not found' }, 404);
    }

    // 完成 multipart upload
    const r2 = c.env.R2;
    const multipartUpload = r2.resumeMultipartUpload(fileRecord.r2_key, uploadId);
    
    const uploadedParts = parts.map(p => ({
      partNumber: p.partNumber,
      etag: p.etag,
    }));

    await multipartUpload.complete(uploadedParts);

    return c.json({
      success: true,
      message: 'Upload completed successfully',
    });
  } catch (error) {
    console.error('APK upload complete error:', error);
    return c.json({ success: false, error: 'Upload completion failed' }, 500);
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

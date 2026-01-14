import { Hono } from 'hono';
import users from './users';
import dapps from './dapps';
import tokens from './tokens';
import admin from './admin';
import upload from './upload';
import type { Env } from '../types';

const routes = new Hono<{ Bindings: Env }>();

// 健康检查
routes.get('/health', (c) => {
  return c.json({ success: true, message: 'API is running' });
});

// 获取最新 APK 下载 URL（公开接口）
routes.get('/apk/latest', async (c) => {
  const db = c.env.DB;

  try {
    // 获取最新上传的 APK 文件
    const file = await db.prepare(
      'SELECT * FROM apk_files ORDER BY uploaded_at DESC LIMIT 1'
    ).first<{
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

    if (!file) {
      return c.json({
        success: true,
        data: {
          url: null,
          name: null,
          version: null,
          uploaded_at: null,
        },
        message: 'No APK file available',
      });
    }

    // 构建完整的下载 URL
    const baseUrl = c.req.url.split('/api')[0];
    const fullDownloadUrl = `${baseUrl}${file.download_url}`;

    return c.json({
      success: true,
      data: {
        url: fullDownloadUrl,
        name: file.name,
        version: file.version,
        file_name: file.file_name,
        file_size: file.file_size,
        description: file.description,
        uploaded_at: file.uploaded_at,
      },
    });
  } catch (error) {
    console.error('Get latest APK error:', error);
    return c.json({ success: false, error: 'Failed to get latest APK' }, 500);
  }
});

// API 路由
routes.route('/users', users);
routes.route('/dapps', dapps);
routes.route('/tokens', tokens);
routes.route('/admin', admin);
routes.route('/upload', upload);

export default routes;


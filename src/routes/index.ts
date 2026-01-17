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

// 获取最新 APK 下载信息（从 R2 读取）
routes.get('/apk/latest', async (c) => {
  const r2 = c.env.R2;

  try {
    // 列出 apk/ 目录下的所有文件
    const listed = await r2.list({ prefix: 'apk/' });
    
    if (!listed.objects || listed.objects.length === 0) {
      return c.json({
        success: true,
        data: {
          url: null,
          version: null,
          fileName: null,
          fileSize: null,
          uploadedAt: null,
        },
        message: 'No APK file available',
      });
    }

    // 解析版本号并找到最新版本
    // 文件名格式: application-{version}-{uuid}.apk
    // 例如: application-1.0.0-002357lb-6712-4274-8921-d599e927e7be.apk
    const apkFiles = listed.objects
      .filter(obj => obj.key.endsWith('.apk'))
      .map(obj => {
        const fileName = obj.key.replace('apk/', '');
        // 匹配 application-X.Y.Z- 格式
        const versionMatch = fileName.match(/^application-(\d+\.\d+\.\d+)-/);
        const version = versionMatch ? versionMatch[1] : '0.0.0';
        
        return {
          key: obj.key,
          fileName,
          version,
          versionParts: version.split('.').map(Number),
          size: obj.size,
          uploaded: obj.uploaded,
        };
      })
      .sort((a, b) => {
        // 按版本号降序排序 (最新版本在前)
        for (let i = 0; i < 3; i++) {
          if (a.versionParts[i] !== b.versionParts[i]) {
            return b.versionParts[i] - a.versionParts[i];
          }
        }
        // 版本号相同时，按上传时间降序
        return new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime();
      });

    if (apkFiles.length === 0) {
      return c.json({
        success: true,
        data: {
          url: null,
          version: null,
          fileName: null,
          fileSize: null,
          uploadedAt: null,
        },
        message: 'No APK file available',
      });
    }

    const latestApk = apkFiles[0];
    
    // 构建下载 URL
    const baseUrl = c.req.url.split('/api')[0];
    const downloadUrl = `${baseUrl}/api/upload/${latestApk.key}`;

    return c.json({
      success: true,
      data: {
        url: downloadUrl,
        version: latestApk.version,
        fileName: latestApk.fileName,
        fileSize: latestApk.size,
        uploadedAt: new Date(latestApk.uploaded).getTime(),
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


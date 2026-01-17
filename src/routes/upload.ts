import { Hono } from 'hono';
import type { Env } from '../types';

const upload = new Hono<{ Bindings: Env }>();

// 上传文件到 R2（不需要认证，但需要验证文件）
upload.post('/', async (c) => {

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // 验证文件类型（只允许图片）
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Invalid file type. Only images are allowed.' }, 400);
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ success: false, error: 'File too large. Maximum size is 5MB.' }, 400);
    }

    // 生成唯一文件名（使用时间戳和随机字符串）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileName = `uploads/${timestamp}-${randomStr}.${fileExtension}`;

    // 上传到 R2
    const r2 = c.env.R2;
    await r2.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 返回文件路径（R2 key）
    return c.json({
      success: true,
      data: {
        key: fileName,
        url: `/api/upload/${fileName}`, // 可以通过这个 URL 访问文件
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

// 获取上传的文件（公开接口）
upload.get('/:key(*)', async (c) => {
  const key = c.req.param('key');
  const r2 = c.env.R2;

  try {
    const object = await r2.get(key);

    if (!object) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // 设置响应头
    const headers = new Headers();
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get file error:', error);
    return c.json({ success: false, error: 'Failed to get file' }, 500);
  }
});

export default upload;


import { Hono } from 'hono';
import { getOrCreateUser, getUser } from '../services/user';
import { jwtAuth } from '../middleware/auth';
import { verifySIWE } from '../utils/siwe';
import { generateJWT } from '../utils/jwt';
import type { Env } from '../types';

const users = new Hono<{ Bindings: Env }>();

// SIWE 登录接口（换取 JWT）
users.post('/login', async (c) => {
  try {
    console.log('[Auth] Login request received');
    const body = await c.req.json<{ message: string; signature: string }>();

    if (!body.message || !body.signature) {
      return c.json({ success: false, error: 'Missing message or signature' }, 400);
    }

    // 从请求中获取域名
    const domain = c.req.header('Origin') || 'localhost';
    console.log('[Auth] Verifying SIWE with domain:', domain);

    // 验证 SIWE 签名
    const verification = await verifySIWE(body.message, body.signature, domain);
    console.log('[Auth] SIWE verification result:', {
      valid: verification.valid,
      address: verification.address,
      error: verification.error,
    });

    if (!verification.valid || !verification.address) {
      return c.json(
        { success: false, error: verification.error || 'SIWE verification failed' },
        401
      );
    }

    // 获取或创建用户
    const db = c.env.DB;
    const user = await getOrCreateUser(db, verification.address);
    console.log('[Auth] User found/created:', user.walletAddress, 'role:', user.role);

    // 生成 JWT
    const jwtToken = await generateJWT(
      {
        address: verification.address,
        role: user.role,
      },
      c.env
    );
    console.log('[Auth] JWT generated successfully');

    return c.json({
      success: true,
      data: {
        token: jwtToken,
        user: {
          address: user.walletAddress,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// 获取当前用户信息（需要认证）
users.get('/me', jwtAuth, async (c) => {
  const userAddress = (c as any).get('userAddress');
  if (!userAddress) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const db = c.env.DB;
  const user = await getOrCreateUser(db, userAddress);

  return c.json({ success: true, data: user });
});

// 获取指定用户信息（公开接口）
users.get('/:address', async (c) => {
  const address = c.req.param('address');
  const db = c.env.DB;

  const user = await getUser(db, address);
  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({ success: true, data: user });
});

export default users;


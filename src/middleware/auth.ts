import { Context, Next } from 'hono';
import { verifyJWT } from '../utils/jwt';
import type { Env } from '../types';

/**
 * JWT 认证中间件
 * 从请求头中获取 JWT token，验证后设置用户地址到 context
 */
export async function jwtAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Missing or invalid authorization header');
    return c.json({ success: false, error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  console.log('[Auth] Verifying JWT token...');
  console.log('[Auth] Token (first 50 chars):', token.substring(0, 50));

  const verification = await verifyJWT(token, c.env);
  console.log('[Auth] JWT verification result:', {
    valid: verification.valid,
    hasPayload: !!verification.payload,
    error: verification.error,
    address: verification.payload?.address,
  });

  if (!verification.valid || !verification.payload) {
    console.error('[Auth] JWT verification failed:', verification.error);
    return c.json({ success: false, error: verification.error || 'Invalid token' }, 401);
  }

  console.log('[Auth] JWT verified, user address:', verification.payload.address);

  // 将用户地址和角色设置到 context 中（使用类型断言避免类型错误）
  (c as any).set('userAddress', verification.payload.address);
  if (verification.payload.role) {
    (c as any).set('userRole', verification.payload.role);
  }

  // 验证设置是否成功
  const setAddress = (c as any).get('userAddress');
  console.log('[Auth] userAddress set to context:', setAddress);

  await next();
}

/**
 * SIWE 认证中间件（已废弃，保留用于向后兼容）
 * @deprecated 使用 jwtAuth 代替
 */
export async function siweAuth(c: Context, next: Next) {
  console.warn('[Auth] siweAuth is deprecated, use jwtAuth instead');
  return c.json({ success: false, error: 'Please use JWT authentication' }, 401);
}

/**
 * 可选认证中间件（用于某些需要知道用户但非必须的场景）
 */
export async function optionalAuth(
  c: Context<{ Bindings: Env; Variables: { userAddress?: string; userRole?: string } }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verification = await verifyJWT(token, c.env);

    if (verification.valid && verification.payload) {
      (c as any).set('userAddress', verification.payload.address);
      if (verification.payload.role) {
        (c as any).set('userRole', verification.payload.role);
      }
    }
  }

  await next();
}

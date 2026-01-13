import jwt from '@tsndr/cloudflare-worker-jwt';
import type { Env } from '../types';

/**
 * 获取 JWT 密钥（从环境变量或使用默认值）
 */
function getJWTSecret(env?: Env): string {
  // 优先使用环境变量中的密钥
  if (env?.JWT_SECRET) {
    return env.JWT_SECRET;
  }
  // 开发环境使用默认密钥（生产环境必须设置环境变量）
  return 'dev-secret-key-change-in-production-min-32-chars-required';
}

/**
 * 生成 JWT token
 */
export async function generateJWT(
  payload: {
    address: string;
    role?: string;
    iat?: number;
    exp?: number;
  },
  env?: Env
): Promise<string> {
  const secret = getJWTSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    address: payload.address.toLowerCase(),
    role: payload.role || 'user',
    iat: payload.iat || now,
    exp: payload.exp || now + 60 * 60 * 24, // 默认 24 小时过期
  };

  return await jwt.sign(tokenPayload, secret);
}

/**
 * 验证 JWT token
 */
export async function verifyJWT(
  token: string,
  env?: Env
): Promise<{
  valid: boolean;
  payload?: { address: string; role?: string; iat?: number; exp?: number };
  error?: string;
}> {
  try {
    const secret = getJWTSecret(env);
    console.log('[JWT] Verifying token with secret (first 10 chars):', secret.substring(0, 10));
    console.log('[JWT] Token (first 50 chars):', token.substring(0, 50));
    
    // jwt.verify 返回验证结果对象，包含 header 和 payload
    const verificationResult = await jwt.verify(token, secret);
    console.log('[JWT] Token verification result:', JSON.stringify(verificationResult, null, 2));
    
    // 检查验证结果
    if (!verificationResult) {
      console.error('[JWT] Token verification failed: invalid result');
      return { valid: false, error: 'Invalid token signature' };
    }

    // 从验证结果中提取 payload
    // 根据日志，jwt.verify 返回 { header, payload } 格式
    let payload: { address: string; role?: string; iat?: number; exp?: number };
    
    if (typeof verificationResult === 'object' && 'payload' in verificationResult) {
      // jwt.verify 返回 { header, payload } 格式
      const result = verificationResult as any;
      payload = result.payload as {
        address: string;
        role?: string;
        iat?: number;
        exp?: number;
      };
      console.log('[JWT] Extracted payload from verificationResult.payload');
    } else if (typeof verificationResult === 'object' && 'address' in verificationResult) {
      // 如果 verificationResult 本身就是 payload，直接使用
      payload = verificationResult as {
        address: string;
        role?: string;
        iat?: number;
        exp?: number;
      };
      console.log('[JWT] Using verificationResult as payload directly');
    } else {
      // 如果都不匹配，尝试使用 jwt.decode
      console.log('[JWT] Verification result format unexpected, trying jwt.decode...');
      const decoded = jwt.decode(token);
      payload = decoded as {
        address: string;
        role?: string;
        iat?: number;
        exp?: number;
      };
      console.log('[JWT] Used jwt.decode as fallback');
    }
    
    console.log('[JWT] Extracted payload:', {
      address: payload?.address,
      role: payload?.role,
      iat: payload?.iat,
      exp: payload?.exp,
      currentTime: Math.floor(Date.now() / 1000),
    });

    // 验证 payload 是否存在且有 address
    if (!payload || !payload.address) {
      console.error('[JWT] Token payload missing or invalid:', payload);
      return { valid: false, error: 'Invalid token payload: missing address' };
    }

    // 检查是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('[JWT] Token expired:', {
        exp: payload.exp,
        current: Math.floor(Date.now() / 1000),
        diff: Math.floor(Date.now() / 1000) - payload.exp,
      });
      return { valid: false, error: 'Token expired' };
    }

    console.log('[JWT] Token is valid, address:', payload.address);
    return { valid: true, payload };
  } catch (error) {
    console.error('[JWT] Verification error:', error);
    console.error('[JWT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}


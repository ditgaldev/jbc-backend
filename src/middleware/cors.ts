import { cors } from 'hono/cors';

/**
 * CORS 中间件配置
 */
export const corsMiddleware = cors({
  origin: '*', // 生产环境应该限制为特定域名
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
});


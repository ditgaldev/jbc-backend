import { cors } from 'hono/cors';

/**
 * CORS 中间件配置
 * 允许前端域名访问后端 API
 */
export const corsMiddleware = cors({
  origin: [
    'https://jbc-backend.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  credentials: true,
});


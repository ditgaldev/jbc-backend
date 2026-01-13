import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error';
import { migrationMiddleware } from './middleware/migration';
import routes from './routes';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use('*', corsMiddleware);
// 数据库迁移中间件（自动检测并执行迁移）
app.use('*', migrationMiddleware);

// 路由
app.route('/api', routes);

// 根路径
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Web3 B2B SaaS Platform API',
    version: '1.0.0',
  });
});

// 错误处理
app.onError(errorHandler);
app.notFound(notFoundHandler);

export default app;


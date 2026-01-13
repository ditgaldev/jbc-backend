import { Context, Next } from 'hono';
import { runMigrations } from '../db';
import type { Env } from '../types';

/**
 * 快速检查 migrations 表是否存在
 */
async function isMigrationsTableExists(db: D1Database): Promise<boolean> {
  try {
    await db.prepare('SELECT 1 FROM migrations LIMIT 1').first();
    return true;
  } catch (error) {
    // 表不存在或其他错误
    return false;
  }
}

/**
 * 检查并执行数据库迁移
 * 迁移本身是幂等的，会检查每个迁移是否已执行
 */
async function checkAndRunMigrations(db: D1Database): Promise<void> {
  try {
    // 快速检查 migrations 表是否存在
    const tableExists = await isMigrationsTableExists(db);
    
    if (!tableExists) {
      // 表不存在，需要执行迁移
      console.log('[Migration] Migrations table not found, running migrations...');
      await runMigrations(db);
      console.log('[Migration] Migrations completed successfully');
    } else {
      // 表存在，执行迁移（迁移函数会检查每个迁移是否已执行，所以是安全的）
      // 这样可以确保新增的迁移会被执行
      await runMigrations(db);
    }
  } catch (error) {
    console.error('[Migration] Migration check failed:', error);
    // 不抛出错误，允许请求继续（迁移可能已经部分完成）
    // 如果迁移失败，会在下次请求时重试
  }
}

/**
 * 数据库迁移中间件
 * 在每次请求时检查并执行迁移（迁移是幂等的，所以多次执行是安全的）
 * 为了性能，只在 migrations 表不存在时才执行完整迁移
 */
export async function migrationMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response> {
  // 异步执行迁移检查，不阻塞请求处理
  if (c.env && c.env.DB) {
    // 使用 waitUntil 确保迁移在请求完成后继续执行（如果支持）
    // 如果不支持，迁移会在后台执行，不会阻塞请求
    const migrationPromise = checkAndRunMigrations(c.env.DB);
    
    // 如果支持 waitUntil（Cloudflare Workers 环境）
    if (typeof (c as any).executionCtx?.waitUntil === 'function') {
      (c as any).executionCtx.waitUntil(migrationPromise);
    } else {
      // 否则在后台执行，不等待
      migrationPromise.catch((error) => {
        console.error('[Migration] Background migration check failed:', error);
      });
    }
  }

  // 继续处理请求
  return next();
}


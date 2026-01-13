import { Context, Next } from 'hono';
import { runMigrations } from '../db';
import type { Env } from '../types';

/**
 * 检查 migrations 表是否存在且有数据
 */
async function checkMigrationsStatus(db: D1Database): Promise<{ exists: boolean; hasData: boolean }> {
  try {
    // 尝试查询 migrations 表
    const result = await db.prepare('SELECT COUNT(*) as count FROM migrations').first<{ count: number }>();
    return {
      exists: true,
      hasData: (result?.count ?? 0) > 0,
    };
  } catch (error) {
    // 表不存在
    return {
      exists: false,
      hasData: false,
    };
  }
}

/**
 * 检查并执行数据库迁移
 * 迁移本身是幂等的，会检查每个迁移是否已执行
 */
async function checkAndRunMigrations(db: D1Database): Promise<void> {
  try {
    // 检查 migrations 表状态
    const status = await checkMigrationsStatus(db);
    
    if (!status.exists || !status.hasData) {
      // 表不存在或没有数据，需要执行迁移
      console.log('[Migration] Migrations table not found or empty, running migrations...');
      await runMigrations(db);
      console.log('[Migration] Migrations completed successfully');
    } else {
      // 表存在且有数据，执行迁移（迁移函数会检查每个迁移是否已执行，所以是安全的）
      // 这样可以确保新增的迁移会被执行
      await runMigrations(db);
    }
  } catch (error) {
    console.error('[Migration] Migration check failed:', error);
    // 不抛出错误，允许请求继续（迁移可能已经部分完成）
    // 如果迁移失败，会在下次请求时重试
  }
}

// 标记是否正在执行迁移，避免并发执行
let migrationInProgress = false;
let migrationCompleted = false;

/**
 * 数据库迁移中间件
 * 在每次请求时检查并执行迁移（迁移是幂等的，所以多次执行是安全的）
 * 首次迁移会同步等待完成，确保迁移正确执行
 */
export async function migrationMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<void> {
  if (c.env && c.env.DB) {
    // 如果迁移已完成，异步检查新迁移（不阻塞）
    if (migrationCompleted) {
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
    } else if (!migrationInProgress) {
      // 首次迁移，同步等待完成
      migrationInProgress = true;
      try {
        await checkAndRunMigrations(c.env.DB);
        migrationCompleted = true;
        console.log('[Migration] Initial migration completed');
      } catch (error) {
        console.error('[Migration] Initial migration failed:', error);
        // 即使失败也标记为已完成，避免无限重试阻塞请求
        migrationCompleted = true;
      } finally {
        migrationInProgress = false;
      }
    }
    // 如果迁移正在进行中，跳过本次检查，继续处理请求
  }

  // 继续处理请求
  await next();
}


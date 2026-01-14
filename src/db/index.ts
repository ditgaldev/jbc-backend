// 数据库工具函数
// 注意：Cloudflare D1 使用原生 SQL API，不需要 ORM

// 迁移 SQL 内容（从迁移文件嵌入）
const MIGRATIONS = [
  {
    id: '0001_initial',
    sql: `-- 用户表 (基于钱包地址)
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL
);

-- DApp 项目表
CREATE TABLE IF NOT EXISTS dapps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  logo_r2_key TEXT,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  is_featured INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL
);

-- 发币记录表 (链上数据索引)
CREATE TABLE IF NOT EXISTS deployed_tokens (
  chain_id INTEGER NOT NULL,
  token_address TEXT PRIMARY KEY,
  deployer_address TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  deployed_at INTEGER NOT NULL
);

-- 代币收录表
CREATE TABLE IF NOT EXISTS listed_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  submitter_address TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0 NOT NULL,
  payment_tx_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 支付记录表 (用于验证链上支付)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  payment_type TEXT NOT NULL,
  related_id TEXT,
  block_number INTEGER,
  confirmed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 迁移记录表（用于跟踪已执行的迁移）
CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  executed_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dapps_owner ON dapps(owner_address);
CREATE INDEX IF NOT EXISTS idx_dapps_status ON dapps(status);
CREATE INDEX IF NOT EXISTS idx_listed_tokens_address ON listed_tokens(token_address);
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payments_from ON payments(from_address);`,
  },
  {
    id: '0002_set_admin',
    sql: `-- 设置初始管理员
-- 将指定地址设置为管理员角色
INSERT OR REPLACE INTO users (wallet_address, created_at, role)
VALUES ('0x4064570fd15dd67281f1f410a7ce3ee0b10fa422', strftime('%s', 'now') * 1000, 'admin');`,
  },
  {
    id: '0003_add_logo_to_tokens',
    sql: `-- 为 deployed_tokens 表添加 logo_r2_key 字段
ALTER TABLE deployed_tokens ADD COLUMN logo_r2_key TEXT;

-- 为 listed_tokens 表添加 logo_r2_key 字段
ALTER TABLE listed_tokens ADD COLUMN logo_r2_key TEXT;`,
  },
  {
    id: '0004_add_sort_order',
    sql: `-- 为 dapps 表添加 sort_order 字段
ALTER TABLE dapps ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 为 listed_tokens 表添加 sort_order 字段
ALTER TABLE listed_tokens ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 为 deployed_tokens 表添加 sort_order 字段
ALTER TABLE deployed_tokens ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 创建索引以优化排序查询
CREATE INDEX IF NOT EXISTS idx_dapps_sort_order ON dapps(sort_order);
CREATE INDEX IF NOT EXISTS idx_listed_tokens_sort_order ON listed_tokens(sort_order);
CREATE INDEX IF NOT EXISTS idx_deployed_tokens_sort_order ON deployed_tokens(sort_order);`,
  },
  {
    id: '0005_add_apk_files',
    sql: `-- 创建 APK 文件表
CREATE TABLE IF NOT EXISTS apk_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  version TEXT,
  description TEXT,
  r2_key TEXT NOT NULL,
  download_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_apk_files_uploaded_by ON apk_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_apk_files_uploaded_at ON apk_files(uploaded_at);`,
  },
];

/**
 * 检查迁移是否已执行
 */
async function isMigrationExecuted(db: D1Database, migrationId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('SELECT id FROM migrations WHERE id = ?')
      .bind(migrationId)
      .first();
    return !!result;
  } catch (error) {
    // 如果 migrations 表不存在，返回 false
    return false;
  }
}

/**
 * 标记迁移为已执行
 */
async function markMigrationExecuted(db: D1Database, migrationId: string): Promise<void> {
  const timestamp = Date.now();
  await db
    .prepare('INSERT OR REPLACE INTO migrations (id, executed_at) VALUES (?, ?)')
    .bind(migrationId, timestamp)
    .run();
}

/**
 * 执行单个迁移
 */
async function executeMigration(db: D1Database, migration: { id: string; sql: string }): Promise<void> {
  console.log(`[Migration] Executing migration: ${migration.id}`);
  
  // 检查是否已执行
  if (await isMigrationExecuted(db, migration.id)) {
    console.log(`[Migration] Migration ${migration.id} already executed, skipping`);
    return;
  }

  try {
    // 执行 SQL（可能包含多条语句）
    const statements = migration.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await db.prepare(statement).run();
        } catch (error: any) {
          // 如果是 ALTER TABLE ADD COLUMN 且列已存在，忽略错误
          // SQLite 错误代码 1 通常表示语法错误或列已存在
          if (
            statement.toUpperCase().includes('ALTER TABLE') &&
            statement.toUpperCase().includes('ADD COLUMN') &&
            (error?.message?.includes('duplicate column') || 
             error?.message?.includes('already exists') ||
             error?.code === 1)
          ) {
            console.log(`[Migration] Column may already exist, skipping: ${statement.substring(0, 50)}...`);
            continue;
          }
          // 其他错误继续抛出
          throw error;
        }
      }
    }

    // 标记为已执行
    await markMigrationExecuted(db, migration.id);
    console.log(`[Migration] Migration ${migration.id} executed successfully`);
  } catch (error) {
    console.error(`[Migration] Error executing migration ${migration.id}:`, error);
    throw error;
  }
}

/**
 * 执行所有数据库迁移
 */
export async function runMigrations(db: D1Database): Promise<void> {
  console.log('[Migration] Starting database migrations...');
  
  try {
    // 首先确保 migrations 表存在（第一个迁移会创建它）
    // 如果不存在，先创建 migrations 表
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS migrations (
          id TEXT PRIMARY KEY,
          executed_at INTEGER NOT NULL
        )
      `).run();
    } catch (error) {
      // 如果创建失败，可能是表已存在，继续执行
      console.log('[Migration] Migrations table may already exist');
    }

    // 按顺序执行所有迁移
    for (const migration of MIGRATIONS) {
      await executeMigration(db, migration);
    }

    console.log('[Migration] All migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}


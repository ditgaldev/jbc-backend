-- 用户表 (基于钱包地址)
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dapps_owner ON dapps(owner_address);
CREATE INDEX IF NOT EXISTS idx_dapps_status ON dapps(status);
CREATE INDEX IF NOT EXISTS idx_listed_tokens_address ON listed_tokens(token_address);
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payments_from ON payments(from_address);


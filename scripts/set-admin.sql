-- 设置管理员脚本
-- 使用方法: wrangler d1 execute jbc-db --file=scripts/set-admin.sql

-- 设置指定地址为管理员
INSERT OR REPLACE INTO users (wallet_address, created_at, role)
VALUES ('0x4064570fd15dd67281f1f410a7ce3ee0b10fa422', strftime('%s', 'now') * 1000, 'admin');

-- 验证设置
SELECT wallet_address, role, created_at FROM users WHERE wallet_address = '0x4064570fd15dd67281f1f410a7ce3ee0b10fa422';


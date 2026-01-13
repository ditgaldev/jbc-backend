-- 设置初始管理员
-- 将指定地址设置为管理员角色
INSERT OR REPLACE INTO users (wallet_address, created_at, role)
VALUES ('0x4064570fd15dd67281f1f410a7ce3ee0b10fa422', strftime('%s', 'now') * 1000, 'admin');


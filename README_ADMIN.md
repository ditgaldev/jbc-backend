# 设置管理员

## 方法 1: 使用 SQL 脚本（推荐）

在项目根目录运行：

```bash
# 本地开发环境
wrangler d1 execute jbc-db --local --file=scripts/set-admin.sql

# 生产环境（谨慎使用）
wrangler d1 execute jbc-db --file=scripts/set-admin.sql
```

## 方法 2: 使用 API 端点（开发环境）

如果已经有一个管理员账户，可以使用 API 设置：

```bash
curl -X POST http://localhost:8787/api/admin/users/0x4064570fd15dd67281f1f410a7ce3ee0b10fa422/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SIWE_TOKEN>" \
  -d '{"role": "admin"}'
```

## 方法 3: 直接执行 SQL

连接到 D1 数据库后执行：

```sql
INSERT OR REPLACE INTO users (wallet_address, created_at, role)
VALUES ('0x4064570fd15dd67281f1f410a7ce3ee0b10fa422', strftime('%s', 'now') * 1000, 'admin');
```

## 验证管理员设置

访问 `/api/users/0x4064570fd15dd67281f1f410a7ce3ee0b10fa422` 应该返回：

```json
{
  "success": true,
  "data": {
    "walletAddress": "0x4064570fd15dd67281f1f410a7ce3ee0b10fa422",
    "role": "admin",
    "createdAt": 1234567890
  }
}
```

## 注意事项

- 地址会自动转换为小写
- 确保地址格式正确（42 字符，以 0x 开头）
- 生产环境请谨慎操作，建议使用迁移文件


# 自动部署配置说明

## 一、GitHub Actions 自动部署

项目已配置 GitHub Actions，支持自动部署前后端到 Cloudflare。

### 工作流说明

1. **`.github/workflows/deploy-backend.yml`**
   - 触发条件：`src/`、`package.json`、`wrangler.toml` 等后端文件变更
   - 功能：自动部署后端到 Cloudflare Workers (生产环境)
   - 自动执行数据库迁移（如果迁移文件存在）

2. **`.github/workflows/deploy-frontend.yml`**
   - 触发条件：`frontend/` 目录文件变更
   - 功能：自动构建并部署前端到 Cloudflare Pages

3. **`.github/workflows/deploy-all.yml`**
   - 触发条件：推送到 `main` 分支
   - 功能：按顺序部署后端和前端

## 二、配置步骤

### 1. 创建 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **My Profile** → **API Tokens**
3. 点击 **Create Token**
4. 使用 **Edit Cloudflare Workers** 模板，或自定义以下权限：
   - **Account** → `Cloudflare Workers:Edit`
   - **Account** → `Cloudflare Pages:Edit`
   - **Account** → `Account:Read`
   - **Account** → `D1:Edit` (用于数据库操作)
5. 复制生成的 Token（只显示一次，请妥善保存）

### 2. 获取 Account ID

在 Cloudflare Dashboard 右侧边栏可以看到 **Account ID**

### 3. 配置 GitHub Secrets

1. 进入 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | `your-api-token-here` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | `1234567890abcdef` |
| `VITE_API_BASE_URL` | 后端 API 地址 | `https://jbc-backend-prod.xxx.workers.dev/api` |
| `VITE_FACTORY_CONTRACT_ADDRESS` | Factory 合约地址 | `0x...` |
| `VITE_USDT_SEPOLIA_ADDRESS` | USDT 合约地址 | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| `VITE_PAYMENT_RECEIVER_ADDRESS` | 支付接收地址 | `0x4064570fd15dd67281F1F410a7Ce3ee0B10fA422` |

### 4. 配置 Workers 环境变量（Secret）

在 Cloudflare Dashboard 或使用 Wrangler CLI 设置：

```bash
# 使用 Wrangler CLI
wrangler secret put JWT_SECRET --env production
# 输入你的 JWT 密钥

wrangler secret put SEPOLIA_RPC_URL --env production
# 可选，输入你的 Sepolia RPC URL
```

或在 Cloudflare Dashboard：
1. 进入 **Workers & Pages** → 选择你的 Worker
2. 进入 **Settings** → **Variables and Secrets**
3. 在 **Encrypted** 部分添加 Secret

## 三、首次部署前准备

### 1. 创建 D1 数据库

```bash
wrangler d1 create jbc-db
```

更新 `wrangler.toml` 中的 `database_id`

### 2. 创建 R2 存储桶

```bash
wrangler r2 bucket create jbc-storage
```

### 3. 执行初始数据库迁移

```bash
# 本地执行（用于测试）
wrangler d1 execute jbc-db --file=src/db/migrations/0001_initial.sql --env production --remote
wrangler d1 execute jbc-db --file=src/db/migrations/0002_set_admin.sql --env production --remote
wrangler d1 execute jbc-db --file=src/db/migrations/0003_add_logo_to_tokens.sql --env production --remote
wrangler d1 execute jbc-db --file=src/db/migrations/0004_add_sort_order.sql --env production --remote
```

## 四、部署流程

### 自动部署

1. **推送代码到 `main` 分支**
   ```bash
   git push origin main
   ```

2. **GitHub Actions 自动触发**
   - 检查 GitHub 仓库的 **Actions** 标签页
   - 查看部署进度和日志

3. **部署完成**
   - 后端：自动部署到 Cloudflare Workers
   - 前端：自动构建并部署到 Cloudflare Pages

### 手动触发部署

在 GitHub 仓库的 **Actions** 标签页：
1. 选择对应的工作流
2. 点击 **Run workflow**
3. 选择分支（通常是 `main`）
4. 点击 **Run workflow**

## 五、部署验证

### 检查后端部署

```bash
# 查看 Workers 日志
wrangler tail --env production

# 测试 API
curl https://你的workers-url/api/health
```

### 检查前端部署

1. 访问 Cloudflare Pages 项目 URL
2. 检查浏览器控制台是否有错误
3. 测试功能是否正常

## 六、故障排查

### 部署失败

1. **检查 GitHub Actions 日志**
   - 进入 **Actions** 标签页
   - 查看失败的 workflow
   - 检查错误信息

2. **常见问题**
   - **API Token 无效**：检查 Secret 配置是否正确
   - **Account ID 错误**：确认 Account ID 正确
   - **构建失败**：检查代码是否有语法错误
   - **环境变量缺失**：确认所有必需的 Secret 都已配置

### 后端部署问题

- 检查 `wrangler.toml` 配置是否正确
- 确认数据库和 R2 存储桶已创建
- 检查 Workers 环境变量（Secret）是否设置

### 前端部署问题

- 检查构建日志中的错误
- 确认环境变量（VITE_*）是否正确
- 检查 `frontend/dist` 目录是否生成

## 七、环境变量说明

### 后端环境变量（Workers Secrets）

| 变量名 | 说明 | 是否必需 |
|--------|------|---------|
| `JWT_SECRET` | JWT 签名密钥 | ✅ 必需 |
| `SEPOLIA_RPC_URL` | Sepolia RPC 地址 | ❌ 可选（有默认值） |

### 前端环境变量（Build-time）

| 变量名 | 说明 | 是否必需 |
|--------|------|---------|
| `VITE_API_BASE_URL` | 后端 API 地址 | ✅ 必需 |
| `VITE_FACTORY_CONTRACT_ADDRESS` | Factory 合约地址 | ❌ 可选 |
| `VITE_USDT_SEPOLIA_ADDRESS` | USDT 合约地址 | ❌ 可选（有默认值） |
| `VITE_PAYMENT_RECEIVER_ADDRESS` | 支付接收地址 | ❌ 可选（有默认值） |

## 八、最佳实践

1. **使用分支保护**
   - 在 GitHub 仓库设置中启用分支保护
   - 要求代码审查后才能合并到 `main`

2. **测试环境**
   - 可以创建 `develop` 分支用于测试
   - 配置单独的测试环境部署

3. **监控和日志**
   - 定期检查 Cloudflare Workers 日志
   - 设置错误告警

4. **回滚机制**
   - 在 Cloudflare Dashboard 可以回滚到之前的版本
   - 保留重要的 commit 记录


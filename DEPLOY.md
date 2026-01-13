# Cloudflare 部署指南

本文档说明如何在 Cloudflare 上部署 MaToken 平台的前后端。

## 目录结构

```
jbc-backend/
├── src/              # 后端代码 (Cloudflare Workers)
├── frontend/         # 前端代码 (Cloudflare Pages)
├── wrangler.toml    # Workers 配置
└── package.json      # 后端依赖
```

## 前置要求

1. Cloudflare 账号
2. 已安装 Wrangler CLI: `npm install -g wrangler`
3. 已登录 Cloudflare: `wrangler login`

## 一、后端部署 (Cloudflare Workers)

### 1. 配置环境变量

在 Cloudflare Dashboard 或使用 Wrangler 设置环境变量：

```bash
# 开发环境
wrangler secret put JWT_SECRET --env development
wrangler secret put SEPOLIA_RPC_URL --env development  # 可选，有默认值

# 生产环境
wrangler secret put JWT_SECRET --env production
wrangler secret put SEPOLIA_RPC_URL --env production  # 可选
```

### 2. 创建 D1 数据库

```bash
# 创建数据库（如果还没有）
wrangler d1 create jbc-db

# 执行迁移
wrangler d1 execute jbc-db --file=src/db/migrations/0001_initial.sql --env development
wrangler d1 execute jbc-db --file=src/db/migrations/0002_set_admin.sql --env development
wrangler d1 execute jbc-db --file=src/db/migrations/0003_add_logo_to_tokens.sql --env development
wrangler d1 execute jbc-db --file=src/db/migrations/0004_add_sort_order.sql --env development

# 生产环境
wrangler d1 execute jbc-db --file=src/db/migrations/0001_initial.sql --env production --remote
wrangler d1 execute jbc-db --file=src/db/migrations/0002_set_admin.sql --env production --remote
wrangler d1 execute jbc-db --file=src/db/migrations/0003_add_logo_to_tokens.sql --env production --remote
wrangler d1 execute jbc-db --file=src/db/migrations/0004_add_sort_order.sql --env production --remote
```

### 3. 创建 R2 存储桶

```bash
# 在 Cloudflare Dashboard 创建 R2 存储桶，名称为 "jbc-storage"
# 或使用 Wrangler
wrangler r2 bucket create jbc-storage
```

### 4. 更新 wrangler.toml

确保 `wrangler.toml` 中的数据库 ID 和存储桶名称正确：

```toml
[[d1_databases]]
binding = "DB"
database_name = "jbc-db"
database_id = "你的数据库ID"  # 从 wrangler d1 create 命令获取

[[r2_buckets]]
binding = "R2"
bucket_name = "jbc-storage"
```

### 5. 部署后端

```bash
# 安装依赖
npm install

# 开发环境部署
wrangler deploy --env development

# 生产环境部署
wrangler deploy --env production
```

部署成功后，你会得到 Workers 的 URL，例如：
- 开发环境: `https://jbc-backend-dev.你的账号.workers.dev`
- 生产环境: `https://jbc-backend-prod.你的账号.workers.dev`

## 二、前端部署 (Cloudflare Pages)

### 1. 通过 Cloudflare Dashboard 部署

1. 登录 Cloudflare Dashboard
2. 进入 **Pages** 页面
3. 点击 **Create a project**
4. 选择 **Connect to Git**
5. 选择你的 Git 仓库
6. 配置构建设置：
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (项目根目录)

### 2. 配置环境变量

在 Cloudflare Pages 项目设置中添加环境变量：

```
VITE_API_BASE_URL=https://jbc-backend-prod.你的账号.workers.dev/api
VITE_FACTORY_CONTRACT_ADDRESS=你的Factory合约地址
VITE_USDT_SEPOLIA_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
VITE_PAYMENT_RECEIVER_ADDRESS=0x4064570fd15dd67281F1F410a7Ce3ee0B10fA422
```

### 3. 通过 Wrangler 部署（可选）

```bash
cd frontend
npm install
npm run build

# 使用 wrangler pages deploy
wrangler pages deploy dist --project-name=matoken-frontend
```

### 4. 配置自定义域名（可选）

在 Cloudflare Pages 项目设置中：
1. 进入 **Custom domains**
2. 添加你的域名
3. Cloudflare 会自动配置 DNS

## 三、R2 公开访问配置（用于图片访问）

### 1. 创建 R2 公开访问

1. 在 Cloudflare Dashboard 进入 R2
2. 选择 `jbc-storage` 存储桶
3. 进入 **Settings** → **Public Access**
4. 启用 **Public Access**
5. 配置 **Custom Domain**（可选，推荐）

### 2. 获取图片访问 URL

如果使用自定义域名：
```
https://你的域名.com/logos/xxx.png
```

如果使用 R2 默认域名：
```
https://你的账号ID.r2.cloudflarestorage.com/jbc-storage/logos/xxx.png
```

### 3. 更新前端代码（如果需要）

如果使用自定义域名，需要在后端 `src/routes/upload.ts` 中更新返回的 URL。

## 四、CORS 配置

后端已配置 CORS，允许前端域名访问。如果需要限制，修改 `src/middleware/cors.ts`：

```typescript
origin: ['https://你的前端域名.com', 'https://*.pages.dev']
```

## 五、生产环境检查清单

- [ ] 设置强密码的 JWT_SECRET
- [ ] 配置生产环境 RPC URL
- [ ] 执行所有数据库迁移
- [ ] 配置 R2 公开访问
- [ ] 更新前端 API_BASE_URL
- [ ] 配置自定义域名（可选）
- [ ] 测试所有功能
- [ ] 设置管理员地址

## 六、常用命令

```bash
# 查看 Workers 日志
wrangler tail --env production

# 查看 D1 数据库
wrangler d1 execute jbc-db --command="SELECT * FROM dapps LIMIT 10" --env production --remote

# 本地开发
npm run dev  # 后端
cd frontend && npm run dev  # 前端

# 查看部署状态
wrangler deployments list --env production
```

## 七、故障排查

### 后端无法访问数据库
- 检查 `wrangler.toml` 中的数据库 ID
- 确认已执行数据库迁移
- 检查 Workers 绑定配置

### 前端无法调用 API
- 检查 `VITE_API_BASE_URL` 环境变量
- 检查后端 CORS 配置
- 查看浏览器控制台错误

### 图片无法显示
- 检查 R2 公开访问是否启用
- 确认图片路径正确
- 检查 CORS 配置

## 八、更新部署

```bash
# 后端更新
git pull
npm install
wrangler deploy --env production

# 前端更新（通过 Git 推送自动部署，或手动）
cd frontend
npm install
npm run build
wrangler pages deploy dist --project-name=matoken-frontend
```


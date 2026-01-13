# Cloudflare Workers 配置说明

## 配置界面说明

当你在 Cloudflare Dashboard 中创建 Worker 项目时，会看到以下配置界面：

### 1. 项目名称 (Project Name)

**当前值**: `jbc-backend`

**说明**: 
- 这是你的 Worker 项目名称
- 会显示在 Cloudflare Dashboard 中
- 可以保持默认值，或修改为你喜欢的名称

**建议**: 保持 `jbc-backend` 即可

### 2. 构建命令 (Build Command)

**当前值**: 空

**说明**: 
- 这是构建 Worker 代码的命令
- 对于 TypeScript 项目，通常需要编译 TypeScript 代码

**应该填写**:
```
npm run build
```

或者如果 `package.json` 中没有 `build` 脚本，可以填写：
```
npx wrangler deploy --dry-run
```

**注意**: 
- 如果使用 `wrangler deploy`，它会自动处理 TypeScript 编译
- 所以这个字段可以留空，或者填写 `npm install`（如果需要安装依赖）

### 3. 部署命令 (Deploy Command)

**当前值**: `npx wrangler deploy`

**说明**: 
- 这是实际部署 Worker 到 Cloudflare 的命令
- 这个值通常是正确的

**可以保持**: `npx wrangler deploy`

**如果需要指定环境**:
```
npx wrangler deploy --env production
```

### 4. 非生产分支构建 (Non-production branch build)

**当前状态**: ✅ 已勾选

**说明**: 
- 勾选后，非生产分支（如 `develop`、`feature/*`）的推送也会触发构建
- 会创建预览部署（Preview Deployments）

**建议**: 
- 如果只需要 `main` 分支部署，可以取消勾选
- 如果需要测试其他分支，保持勾选

### 5. 高级设置 (Advanced Settings)

点击 **高级设置 >** 可以配置：

- **环境变量 (Environment Variables)**
- **绑定 (Bindings)**: D1 数据库、R2 存储等
- **构建配置 (Build Configuration)**
- **自定义域名 (Custom Domains)**

## 推荐配置

### 基础配置

```
项目名称: jbc-backend
构建命令: （留空或填写 npm install）
部署命令: npx wrangler deploy --env production
非生产分支构建: ✅ 已勾选（可选）
```

### 为什么构建命令可以留空？

1. **Wrangler 自动处理**: `wrangler deploy` 会自动：
   - 编译 TypeScript
   - 打包代码
   - 上传到 Cloudflare

2. **如果需要在构建前安装依赖**:
   ```
   npm install
   ```

3. **如果需要自定义构建**:
   在 `package.json` 中添加 `build` 脚本：
   ```json
   {
     "scripts": {
       "build": "tsc"
     }
   }
   ```
   然后填写：`npm run build`

## 重要提示

### ⚠️ 注意事项

1. **环境变量配置**:
   - 在 **高级设置** 中配置环境变量
   - 或者使用 `wrangler secret put` 命令设置 Secret

2. **绑定配置**:
   - D1 数据库和 R2 存储需要在 `wrangler.toml` 中配置
   - 或者在 Cloudflare Dashboard 中手动绑定

3. **首次部署前**:
   - 确保已创建 D1 数据库
   - 确保已创建 R2 存储桶
   - 确保已设置必要的环境变量（Secret）

## 配置步骤

### 步骤 1: 填写基础配置

1. **项目名称**: 保持 `jbc-backend`
2. **构建命令**: 留空或填写 `npm install`
3. **部署命令**: `npx wrangler deploy --env production`
4. **非生产分支构建**: 根据需要勾选

### 步骤 2: 配置高级设置

点击 **高级设置 >**，配置：

1. **环境变量**:
   - 添加 `ENVIRONMENT=production`
   - 其他变量通过 Secret 设置

2. **绑定**:
   - D1 数据库：`DB` → 选择你的数据库
   - R2 存储：`R2` → 选择你的存储桶

### 步骤 3: 部署

点击 **部署** 按钮，Cloudflare 会：
1. 克隆你的 Git 仓库
2. 安装依赖（如果有构建命令）
3. 执行部署命令
4. 部署 Worker 到 Cloudflare

## 与 wrangler.toml 的关系

你的 `wrangler.toml` 文件已经配置了：

```toml
name = "jbc-backend"
main = "src/index.ts"

[[d1_databases]]
binding = "DB"
database_name = "jbc-db"
database_id = "a21346ac-24a9-4842-b270-ce69d3ea9cfc"

[[r2_buckets]]
binding = "R2"
bucket_name = "jbc-storage"
```

这些配置会在部署时自动使用，无需在 Dashboard 中重复配置。

## 部署后的操作

部署成功后：

1. **设置 Secret**:
   ```bash
   wrangler secret put JWT_SECRET --env production
   ```

2. **执行数据库迁移**:
   ```bash
   wrangler d1 execute jbc-db --file=src/db/migrations/0001_initial.sql --env production --remote
   # ... 其他迁移文件
   ```

3. **测试 API**:
   ```
   https://jbc-backend-prod.xxx.workers.dev/api/health
   ```

## 常见问题

### Q: 构建命令必须填写吗？
A: 不是必须的。如果留空，`wrangler deploy` 会自动处理构建。

### Q: 部署命令可以修改吗？
A: 可以。如果需要指定环境，使用 `npx wrangler deploy --env production`。

### Q: 如何配置环境变量？
A: 在高级设置中配置，或使用 `wrangler secret put` 命令。

### Q: 绑定在哪里配置？
A: 在 `wrangler.toml` 中配置，或在 Dashboard 的高级设置中配置。


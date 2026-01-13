# Cloudflare Pages 配置指南

## 一、在 Cloudflare Dashboard 中配置 Pages 项目

### 1. 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create application** → **Pages** → **Connect to Git**
4. 选择 **GitHub**，授权并选择仓库 `ditgaldev/jbc-backend`

### 2. 配置构建设置

在 **设置 (Settings)** → **构建 (Build)** 页面配置：

#### 构建配置 (Build Configuration)

- **构建命令 (Build Command)**: 
  ```
  cd frontend && npm run build
  ```
  或者如果根目录设置为 `frontend`，则使用：
  ```
  npm run build
  ```

- **构建输出目录 (Build Output Directory)**: 
  ```
  frontend/dist
  ```
  或者如果根目录设置为 `frontend`，则使用：
  ```
  dist
  ```

- **根目录 (Root Directory)**: 
  ```
  frontend
  ```
  ⚠️ **重要**：必须设置为 `frontend`，因为前端代码在 `frontend/` 目录下

#### 分支控制 (Branch Control)

- **生产分支 (Production Branch)**: `main`
- **自动部署 (Automatic Deployment)**: 已启用 ✅

#### 构建监视路径 (Build Watch Path)

- **包括路径 (Include Path)**: `frontend/**`
  - 这样只有 `frontend/` 目录下的文件变更才会触发构建

### 3. 配置环境变量

在 **设置 (Settings)** → **变量和机密 (Variables and Secrets)** 页面添加：

#### 构建时环境变量 (Build-time Variables)

点击 **+ 添加**，添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://jbc-backend-prod.xxx.workers.dev/api` | 后端 API 地址（替换为你的 Workers URL） |
| `VITE_FACTORY_CONTRACT_ADDRESS` | `你的Factory合约地址` | Factory 合约地址（可选） |
| `VITE_USDT_SEPOLIA_ADDRESS` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | USDT 合约地址（可选，有默认值） |
| `VITE_PAYMENT_RECEIVER_ADDRESS` | `0x4064570fd15dd67281F1F410a7Ce3ee0B10fA422` | 支付接收地址（可选，有默认值） |

⚠️ **注意**：
- 所有 `VITE_` 开头的变量都是**构建时变量**，会在构建时注入到前端代码中
- 变量值中的 `xxx` 需要替换为你的实际 Workers 域名

### 4. 配置自定义域名（可选）

在 **自定义域 (Custom Domains)** 页面：
1. 点击 **设置自定义域**
2. 输入你的域名（如 `matoken.com`）
3. Cloudflare 会自动配置 DNS 记录

## 二、配置步骤详解

### 步骤 1：设置根目录

1. 在 **构建配置** 区域，点击编辑图标 ✏️
2. 在 **根目录** 字段输入：`frontend`
3. 点击 **保存**

### 步骤 2：设置构建命令

1. 在 **构建配置** 区域，点击编辑图标 ✏️
2. 在 **构建命令** 字段输入：
   ```
   npm run build
   ```
   （因为根目录已设置为 `frontend`，所以不需要 `cd frontend`）

### 步骤 3：设置构建输出目录

1. 在 **构建配置** 区域，点击编辑图标 ✏️
2. 在 **构建输出目录** 字段输入：
   ```
   dist
   ```
   （因为根目录已设置为 `frontend`，所以输出路径是相对于 `frontend/` 的）

### 步骤 4：添加环境变量

1. 在 **变量和机密** 区域，点击 **+ 添加**
2. 选择 **变量类型**：**构建时变量**
3. 输入变量名和值
4. 点击 **保存**
5. 重复添加所有需要的环境变量

### 步骤 5：配置构建监视路径（可选）

1. 在 **构建监视路径** 区域，点击编辑图标 ✏️
2. 在 **包括路径** 字段输入：
   ```
   frontend/**
   ```
3. 点击 **保存**

这样只有 `frontend/` 目录下的文件变更才会触发自动部署。

## 三、配置示例

### 完整配置示例

```
项目名称: matoken-frontend
Git 存储库: ditgaldev/jbc-backend
生产分支: main

构建配置:
  根目录: frontend
  构建命令: npm run build
  构建输出目录: dist
  构建注释: 已启用

分支控制:
  生产分支: main
  自动部署: 已启用

构建监视路径:
  包括路径: frontend/**

环境变量:
  VITE_API_BASE_URL = https://jbc-backend-prod.xxx.workers.dev/api
  VITE_FACTORY_CONTRACT_ADDRESS = 0x...
  VITE_USDT_SEPOLIA_ADDRESS = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
  VITE_PAYMENT_RECEIVER_ADDRESS = 0x4064570fd15dd67281F1F410a7Ce3ee0B10fA422
```

## 四、验证配置

### 1. 触发首次部署

配置完成后，Cloudflare Pages 会自动触发首次构建。你可以：

1. 在 **部署 (Deployment)** 页面查看构建状态
2. 等待构建完成（通常需要 2-5 分钟）
3. 点击部署链接访问网站

### 2. 检查构建日志

如果构建失败：

1. 进入 **部署** 页面
2. 点击失败的部署
3. 查看 **构建日志**，找出错误原因

### 3. 常见问题

#### 问题 1：构建失败 - "找不到 package.json"

**原因**：根目录未设置为 `frontend`

**解决**：在构建配置中设置 **根目录** 为 `frontend`

#### 问题 2：构建失败 - "找不到 dist 目录"

**原因**：构建输出目录配置错误

**解决**：确保 **构建输出目录** 设置为 `dist`（如果根目录是 `frontend`）

#### 问题 3：API 请求失败

**原因**：`VITE_API_BASE_URL` 环境变量未配置或配置错误

**解决**：
1. 检查环境变量是否正确配置
2. 确认 Workers URL 是否正确
3. 检查后端 CORS 配置是否允许 Pages 域名访问

#### 问题 4：页面显示空白

**原因**：可能是路由配置问题

**解决**：确保 `frontend/_redirects` 文件存在，内容为：
```
/*    /index.html   200
```

## 五、与 GitHub Actions 的配合

### 方式 1：使用 Cloudflare Pages 自动部署（推荐）

- 配置好 Cloudflare Pages 后，每次推送到 `main` 分支会自动部署
- 无需 GitHub Actions 部署前端
- 只需 GitHub Actions 部署后端（Workers）

### 方式 2：使用 GitHub Actions 部署

- 如果使用 GitHub Actions 部署，可以禁用 Cloudflare Pages 的自动部署
- 在 **分支控制** 中关闭 **自动部署**

## 六、最佳实践

1. **使用根目录配置**：将根目录设置为 `frontend`，简化构建命令
2. **配置构建监视路径**：只监听 `frontend/**`，避免后端代码变更触发前端构建
3. **环境变量管理**：使用 Cloudflare Dashboard 管理环境变量，不要提交到 Git
4. **预览部署**：每次 Pull Request 会自动创建预览部署，方便测试
5. **自定义域名**：配置自定义域名，提升品牌形象

## 七、快速检查清单

- [ ] 根目录设置为 `frontend`
- [ ] 构建命令设置为 `npm run build`
- [ ] 构建输出目录设置为 `dist`
- [ ] 生产分支设置为 `main`
- [ ] 自动部署已启用
- [ ] 环境变量 `VITE_API_BASE_URL` 已配置
- [ ] 环境变量值中的 Workers URL 已更新为实际地址
- [ ] `frontend/_redirects` 文件存在
- [ ] 首次部署成功完成

配置完成后，每次推送到 `main` 分支，Cloudflare Pages 会自动构建并部署前端应用！


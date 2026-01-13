# 前端部署命令配置说明

## ⚠️ 重要：前端应该使用 Cloudflare Pages，不是 Workers

前端是静态网站，应该使用 **Cloudflare Pages** 部署，而不是 Workers。

## 方式 1：使用 Cloudflare Pages（推荐）

### 在 Cloudflare Dashboard 中创建 Pages 项目

1. 进入 **Workers & Pages** → **Pages**
2. 点击 **Create a project** → **Connect to Git**
3. 选择仓库 `ditgaldev/jbc-backend`

### Pages 配置（不需要部署命令）

**构建配置：**
- **根目录 (Root Directory)**: `frontend`
- **构建命令 (Build Command)**: `npm run build`
- **构建输出目录 (Build Output Directory)**: `dist`
- **部署命令**: ❌ **不需要填写**（Pages 会自动部署）

**说明**：
- Pages 会自动执行构建命令
- 构建完成后自动部署，无需手动部署命令
- 每次推送到 Git 会自动触发构建和部署

## 方式 2：如果误用了 Workers（不推荐）

如果你在 Workers 配置界面中，应该：

### Workers 配置（用于后端，不适用于前端）

**构建命令**: 
```
npm install
```
或留空

**部署命令**: 
```
npx wrangler deploy --env production
```

**路径**: 
留空或 `/`（Workers 不需要路径配置）

**⚠️ 注意**：Workers 用于部署后端 API，不适合部署前端静态网站。

## 正确的部署方式

### 后端（Workers）

```
项目名称: jbc-backend
构建命令: npm install（或留空）
部署命令: npx wrangler deploy --env production
路径: （留空）
```

### 前端（Pages）

```
项目名称: matoken-frontend
根目录: frontend
构建命令: npm run build
构建输出目录: dist
部署命令: （不需要，自动部署）
```

## 快速检查

- ✅ **前端** → 使用 **Cloudflare Pages**
- ✅ **后端** → 使用 **Cloudflare Workers**

如果你在 Workers 配置界面，说明你选错了服务类型。应该：
1. 取消当前操作
2. 进入 **Pages** 页面
3. 创建 Pages 项目来部署前端


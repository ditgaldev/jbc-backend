# MaToken 平台架构说明

## 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare 平台                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │  Cloudflare      │         │  Cloudflare      │    │
│  │  Pages           │  HTTP   │  Workers         │    │
│  │  (前端静态网站)   │ ◄──────► │  (后端 API)      │    │
│  │                  │         │                  │    │
│  │  - React 应用    │         │  - Hono API      │    │
│  │  - 静态资源      │         │  - D1 数据库      │    │
│  │  - 用户界面      │         │  - R2 存储        │    │
│  └──────────────────┘         └──────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 通信方式

### 1. HTTP/HTTPS 请求

**前端（Pages）** 通过标准的 HTTP/HTTPS 请求调用 **后端（Workers）** 的 API 接口。

#### 通信流程

```
用户浏览器
    │
    │ 1. 访问前端页面
    ▼
Cloudflare Pages (前端)
    │
    │ 2. 前端 JavaScript 发起 API 请求
    │    fetch('https://workers-url/api/dapps')
    ▼
Cloudflare Workers (后端)
    │
    │ 3. 处理请求，查询数据库
    │    - 查询 D1 数据库
    │    - 读取 R2 存储
    │    - 验证 JWT Token
    ▼
    │ 4. 返回 JSON 响应
    ▼
Cloudflare Pages (前端)
    │
    │ 5. 更新 UI 显示数据
    ▼
用户浏览器
```

### 2. 配置说明

#### 前端配置（Pages）

**文件：`frontend/src/config/contracts.ts`**

```typescript
// API 基础 URL - 指向 Workers 的地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787/api';
```

**环境变量配置：**
- 开发环境：`VITE_API_BASE_URL=http://127.0.0.1:8787/api` (本地 Workers)
- 生产环境：`VITE_API_BASE_URL=https://jbc-backend-prod.xxx.workers.dev/api` (Cloudflare Workers)

#### 后端配置（Workers）

**文件：`src/index.ts`**

```typescript
// 所有 API 路由挂载在 /api 路径下
app.route('/api', routes);
```

**API 路由结构：**
- `/api/health` - 健康检查
- `/api/users` - 用户相关接口
- `/api/dapps` - DApp 相关接口
- `/api/tokens` - 代币相关接口
- `/api/admin` - 管理后台接口
- `/api/upload` - 文件上传接口

### 3. CORS 配置

由于前端和后端部署在不同的域名，需要配置 CORS（跨域资源共享）。

**文件：`src/middleware/cors.ts`**

```typescript
// 允许前端域名访问后端 API
origin: ['https://你的pages域名.com', 'https://*.pages.dev']
```

### 4. 实际通信示例

#### 前端发起请求

**文件：`frontend/src/lib/api.ts`**

```typescript
class ApiClient {
  private baseUrl: string; // 例如: https://jbc-backend-prod.xxx.workers.dev/api
  
  async getDApps(filters?: { status?: string }) {
    // 构建完整 URL
    // https://jbc-backend-prod.xxx.workers.dev/api/dapps?status=active
    return this.request('/dapps', {
      method: 'GET',
      // 自动添加查询参数
    });
  }
}
```

#### 后端处理请求

**文件：`src/routes/dapps.ts`**

```typescript
// GET /api/dapps
dapps.get('/', async (c) => {
  const status = c.req.query('status');
  const dappsList = await getDApps(db, { status });
  return c.json({ success: true, data: dappsList });
});
```

### 5. 认证流程

#### SIWE + JWT 认证

```
1. 前端：用户连接钱包，生成 SIWE 消息
   ↓
2. 前端：用户签名 SIWE 消息
   ↓
3. 前端：POST /api/users/login
   Body: { message, signature }
   ↓
4. 后端：验证 SIWE 签名
   ↓
5. 后端：生成 JWT Token
   ↓
6. 后端：返回 JWT Token
   ↓
7. 前端：存储 JWT Token (localStorage)
   ↓
8. 前端：后续请求携带 JWT Token
   Header: Authorization: Bearer <JWT_TOKEN>
   ↓
9. 后端：验证 JWT Token，提取用户信息
```

## 部署后的实际 URL

### 开发环境

- **前端（本地）**: `http://localhost:3000`
- **后端（本地 Workers）**: `http://127.0.0.1:8787`
- **API 地址**: `http://127.0.0.1:8787/api`

### 生产环境

- **前端（Pages）**: `https://matoken-frontend.pages.dev`
- **后端（Workers）**: `https://jbc-backend-prod.xxx.workers.dev`
- **API 地址**: `https://jbc-backend-prod.xxx.workers.dev/api`

## 数据存储

### D1 数据库（Workers）

- 用户数据
- DApp 数据
- 代币数据
- 支付记录

### R2 存储（Workers）

- 图片文件（DApp Logo、代币 Logo）
- 通过 Workers API 上传和访问

### 前端存储

- `localStorage`: JWT Token
- `sessionStorage`: 临时数据（如支付交易哈希）

## 网络请求示例

### 获取 DApp 列表

```javascript
// 前端代码
const response = await fetch('https://jbc-backend-prod.xxx.workers.dev/api/dapps?status=active', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
// { success: true, data: [...] }
```

### 创建 DApp（需要认证）

```javascript
// 前端代码
const response = await fetch('https://jbc-backend-prod.xxx.workers.dev/api/dapps', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`, // JWT Token
  },
  body: JSON.stringify({
    name: 'My DApp',
    url: 'https://example.com',
    category: 'DeFi',
  }),
});
```

## 关键点总结

1. **独立部署**：前端（Pages）和后端（Workers）是独立部署的
2. **HTTP 通信**：通过标准的 HTTP/HTTPS 请求通信
3. **CORS 配置**：后端需要配置 CORS 允许前端域名访问
4. **环境变量**：前端通过 `VITE_API_BASE_URL` 配置后端地址
5. **认证机制**：使用 SIWE + JWT 进行用户认证
6. **数据存储**：后端使用 D1 数据库和 R2 存储

## 优势

1. **分离关注点**：前后端完全分离，可以独立开发和部署
2. **全球加速**：Cloudflare 的 CDN 网络提供全球加速
3. **无服务器**：无需管理服务器，自动扩展
4. **成本效益**：按使用量计费，成本低
5. **安全性**：Cloudflare 提供 DDoS 防护和 SSL 证书


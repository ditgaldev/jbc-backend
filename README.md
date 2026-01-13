# Web3 B2B Tooling Platform (SaaS)

## 1. 项目概述
[cite_start]本项目是一个基于 Web3 的 B2B 自动化服务平台，旨在为 B 端用户提供“全自助、纯链上”的代币发行、DApp 入驻及代币展示服务 [cite: 3, 4]。

**核心原则：**
* [cite_start]**全自助 (Self-Service):** 基于工厂合约的一键式交付 [cite: 6]。
* [cite_start]**纯链上身份:** 仅使用 WalletConnect/Metamask 登录，无传统注册 [cite: 7, 10]。
* [cite_start]**PWA 架构:** 基于 Web 技术栈，规避 App Store 审核风险 。

## 2. 技术栈 (Cloudflare + React Native Web / React)

### 前端 (Frontend)
* **Framework:** React (Vite) + TypeScript
* [cite_start]**UI Library:** Tailwind CSS + Shadcn/UI (符合“黑暗模式”设计 [cite: 36])
* **Web3 Hooks:** `wagmi` + `viem`
* [cite_start]**Wallet UI:** RainbowKit (支持 Metamask, TrustWallet 等 [cite: 10])
* **Hosting:** Cloudflare Pages

### 后端与基础设施 (Serverless Backend)
* **API / Logic:** Cloudflare Workers (Hono 框架推荐)
* [cite_start]**Database:** Cloudflare D1 (SQLite 边缘数据库 - 替代 Firebase [cite: 52])
* [cite_start]**Storage:** Cloudflare R2 (存储 Logo、项目图标 [cite: 53])
* **Authentication:** SIWE (Sign-In with Ethereum) 结合 Workers 验证签名

### 智能合约 (Smart Contracts)
* [cite_start]**Chain:** BSC / Arbitrum [cite: 57]
* [cite_start]**Core:** OpenZeppelin 库 [cite: 66]
* **Architecture:** Factory Pattern (工厂模式)

## 3. 核心功能模块 (Features)

### [cite_start]A. 一键发币 (Token Launchpad) [cite: 14]
* **流程:** 连接钱包 -> 填写参数 (Name, Symbol, Supply) -> 调用 `deployToken` -> 支付 USDT -> 获得合约权限。
* **技术实现:** 前端调用工厂合约，合约内部完成 `ERC20` 部署并转移 Owner 权限。
* [cite_start]**定价:** $299/次 (USDT) [cite: 19]。

### [cite_start]B. DApp 入驻 (DApp Listing) [cite: 21]
* **流程:** 提交 DApp 信息 (URL, Category) -> 支付入驻费 -> 写入 D1 数据库 -> 管理员(或合约)审核。
* [cite_start]**展示:** C 端用户可通过内嵌 Web3 浏览器访问 [cite: 46]。
* [cite_start]**定价:** $199 入驻 + $500 推荐位 [cite: 26]。

### [cite_start]C. 代币收录 (Token Listing) [cite: 28]
* [cite_start]**流程:** 提交合约地址 -> 支付费用 -> 后端 Worker 调用 CoinGecko API 获取价格 。
* [cite_start]**定价:** $99 收录 + $999 置顶 [cite: 32]。

## 4. 数据库设计 (Cloudflare D1 Schema)

```sql
-- 用户表 (基于钱包地址)
CREATE TABLE users (
  wallet_address TEXT PRIMARY KEY,
  created_at INTEGER,
  role TEXT DEFAULT 'user' -- user, admin
);

-- DApp 项目表
CREATE TABLE dapps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_address TEXT,
  name TEXT,
  description TEXT,
  url TEXT,
  logo_r2_key TEXT, -- 指向 R2 存储
  category TEXT,
  status TEXT DEFAULT 'pending', -- pending, active, rejected
  is_featured BOOLEAN DEFAULT 0,
  created_at INTEGER
);

-- 发币记录表 (链上数据索引)
CREATE TABLE deployed_tokens (
  chain_id INTEGER,
  token_address TEXT PRIMARY KEY,
  deployer_address TEXT,
  name TEXT,
  symbol TEXT,
  deployed_at INTEGER
);
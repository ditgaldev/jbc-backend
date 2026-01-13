import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 用户表 (基于钱包地址)
export const users = sqliteTable('users', {
  walletAddress: text('wallet_address').primaryKey(),
  createdAt: integer('created_at').notNull(),
  role: text('role').default('user').notNull(), // user, admin
});

// DApp 项目表
export const dapps = sqliteTable('dapps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerAddress: text('owner_address').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  url: text('url').notNull(),
  logoR2Key: text('logo_r2_key'), // 指向 R2 存储
  category: text('category').notNull(),
  status: text('status').default('pending').notNull(), // pending, active, rejected
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(), // 排序顺序，数字越小越靠前
  createdAt: integer('created_at').notNull(),
});

// 发币记录表 (链上数据索引)
export const deployedTokens = sqliteTable('deployed_tokens', {
  chainId: integer('chain_id').notNull(),
  tokenAddress: text('token_address').primaryKey(),
  deployerAddress: text('deployer_address').notNull(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  logoR2Key: text('logo_r2_key'), // 指向 R2 存储
  sortOrder: integer('sort_order').default(0).notNull(), // 排序顺序，数字越小越靠前
  deployedAt: integer('deployed_at').notNull(),
});

// 代币收录表
export const listedTokens = sqliteTable('listed_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chainId: integer('chain_id').notNull(),
  tokenAddress: text('token_address').notNull(),
  submitterAddress: text('submitter_address').notNull(),
  logoR2Key: text('logo_r2_key'), // 指向 R2 存储
  isPinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(), // 排序顺序，数字越小越靠前
  paymentTxHash: text('payment_tx_hash'), // 支付交易哈希
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 支付记录表 (用于验证链上支付)
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  txHash: text('tx_hash').notNull().unique(),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  amount: text('amount').notNull(), // BigInt as string
  currency: text('currency').notNull(), // USDT, ETH
  chainId: integer('chain_id').notNull(),
  paymentType: text('payment_type').notNull(), // token_deploy, dapp_listing, dapp_featured, token_listing, token_pinned
  relatedId: text('related_id'), // 关联的业务ID (dapp_id, token_id等)
  blockNumber: integer('block_number'),
  confirmedAt: integer('confirmed_at').notNull(),
  createdAt: integer('created_at').notNull(),
});


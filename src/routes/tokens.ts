import { Hono } from 'hono';
import { jwtAuth } from '../middleware/auth';
import {
  indexDeployedToken,
  listToken,
  pinToken,
  getDeployedTokens,
  getListedTokens,
} from '../services/token';
import type { Env, ListTokenRequest, PinTokenRequest } from '../types';

const tokens = new Hono<{ Bindings: Env }>();

// 获取已部署的代币列表（公开接口）
tokens.get('/deployed', async (c) => {
  const db = c.env.DB;
  const chainId = c.req.query('chain_id');
  const deployerAddress = c.req.query('deployer_address');

  const filters: any = {};
  if (chainId) filters.chainId = parseInt(chainId);
  if (deployerAddress) filters.deployerAddress = deployerAddress;

  const tokens = await getDeployedTokens(db, filters);

  return c.json({ success: true, data: tokens });
});

// 获取收录的代币列表（公开接口）
tokens.get('/listed', async (c) => {
  const db = c.env.DB;
  const chainId = c.req.query('chain_id');
  const submitterAddress = c.req.query('submitter_address');
  const pinned = c.req.query('pinned');

  const filters: any = {};
  if (chainId) filters.chainId = parseInt(chainId);
  if (submitterAddress) filters.submitterAddress = submitterAddress;
  if (pinned) filters.pinned = pinned === 'true';

  const tokens = await getListedTokens(db, filters);

  return c.json({ success: true, data: tokens });
});

// 索引已部署的代币（在链上交易确认后调用，需要认证）
tokens.post('/deployed', jwtAuth, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json<{
    chainId: number;
    tokenAddress: string;
    deployerAddress: string;
    name: string;
    symbol: string;
    logoR2Key?: string;
    deployedAt: number;
  }>();

  // 验证请求体
  if (
    !body.chainId ||
    !body.tokenAddress ||
    !body.deployerAddress ||
    !body.name ||
    !body.symbol
  ) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  const result = await indexDeployedToken(db, {
    chainId: body.chainId,
    tokenAddress: body.tokenAddress,
    deployerAddress: body.deployerAddress,
    name: body.name,
    symbol: body.symbol,
    logoR2Key: body.logoR2Key,
    deployedAt: body.deployedAt || Date.now(),
  });

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'Token indexed successfully' }, 201);
});

// 收录代币（需要认证）
tokens.post('/list', jwtAuth, async (c) => {
  const userAddress = (c as any).get('userAddress');
  if (!userAddress) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const db = c.env.DB;
  const body = await c.req.json<ListTokenRequest>();

  // 验证请求体
  if (!body.chainId || !body.tokenAddress || !body.paymentTxHash) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  const result = await listToken(db, body, userAddress, c.env);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, data: result.token }, 201);
});

// 置顶代币（需要认证）
tokens.post('/:id/pin', jwtAuth, async (c) => {
  const userAddress = (c as any).get('userAddress');
  if (!userAddress) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid token ID' }, 400);
  }

  const body = await c.req.json<PinTokenRequest>();

  if (!body.paymentTxHash) {
    return c.json({ success: false, error: 'Missing payment transaction hash' }, 400);
  }

  const request: PinTokenRequest = {
    tokenId: id,
    paymentTxHash: body.paymentTxHash,
  };

  const result = await pinToken(db, request, userAddress, c.env);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'Token pinned successfully' });
});

export default tokens;


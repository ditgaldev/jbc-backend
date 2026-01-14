import { Hono } from 'hono';
import { jwtAuth } from '../middleware/auth';
import { createDApp, featureDApp, getDApps, getDAppById } from '../services/dapp';
import type { Env, CreateDAppRequest, FeatureDAppRequest } from '../types';

const dapps = new Hono<{ Bindings: Env }>();

// 获取 DApp 列表（公开接口，支持筛选）
dapps.get('/', async (c) => {
  const db = c.env.DB;
  const status = c.req.query('status');
  const category = c.req.query('category');
  const featured = c.req.query('featured');
  const ownerAddress = c.req.query('owner_address');

  const filters: any = {};
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (featured) filters.featured = featured === 'true';
  if (ownerAddress) filters.ownerAddress = ownerAddress;

  const dappsList = await getDApps(db, filters);

  return c.json({ success: true, data: dappsList });
});

// 获取单个 DApp（公开接口）
dapps.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid DApp ID' }, 400);
  }

  const dapp = await getDAppById(db, id);
  if (!dapp) {
    return c.json({ success: false, error: 'DApp not found' }, 404);
  }

  return c.json({ success: true, data: dapp });
});

// 创建 DApp（需要认证）
dapps.post('/', jwtAuth, async (c) => {
  try {
    console.log('[Backend] DApp creation request received');
    // 使用类型断言获取 userAddress
    const userAddress = (c as any).get('userAddress');
    console.log('[Backend] User address from context:', userAddress);
    console.log('[Backend] Context keys:', Object.keys(c));
    
    if (!userAddress) {
      console.error('[Backend] Unauthorized: No user address in context');
      console.error('[Backend] This means JWT middleware did not set userAddress properly');
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const db = c.env.DB;
    let body: CreateDAppRequest;
    
    try {
      body = await c.req.json<CreateDAppRequest>();
      console.log('[Backend] Request body:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('[Backend] Failed to parse request body:', error);
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    // 验证请求体（不再需要 paymentTxHash）
    if (!body.name || !body.url || !body.category) {
      console.error('[Backend] Missing required fields:', { name: !!body.name, url: !!body.url, category: !!body.category });
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    console.log('[Backend] Creating DApp...');
    const result = await createDApp(db, body, userAddress, c.env);
    console.log('[Backend] DApp creation result:', result);

    if (!result.success) {
      console.error('[Backend] DApp creation failed:', result.error);
      return c.json({ success: false, error: result.error }, 400);
    }

    console.log('[Backend] DApp created successfully:', result.dapp?.id);
    return c.json({ success: true, data: result.dapp }, 201);
  } catch (error) {
    console.error('[Backend] Unexpected error in DApp creation:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// 设置 DApp 为推荐位（需要认证）
dapps.post('/:id/feature', jwtAuth, async (c) => {
  const userAddress = (c as any).get('userAddress');
  if (!userAddress) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid DApp ID' }, 400);
  }

  const body = await c.req.json<{ paymentTxHash: string; chainId?: number }>();

  if (!body.paymentTxHash) {
    return c.json({ success: false, error: 'Missing payment transaction hash' }, 400);
  }

  if (!body.chainId) {
    return c.json({ success: false, error: 'Missing chain ID' }, 400);
  }

  const request: FeatureDAppRequest = {
    dappId: id,
    paymentTxHash: body.paymentTxHash,
    chainId: body.chainId,
  };

  const result = await featureDApp(db, request, userAddress, c.env);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }

  return c.json({ success: true, message: 'DApp featured successfully' });
});

export default dapps;


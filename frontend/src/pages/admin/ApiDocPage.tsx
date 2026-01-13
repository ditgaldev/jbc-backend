import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Copy, CheckCircle } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useState } from 'react';
import { API_BASE_URL } from '@/config/contracts';

export function ApiDocPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const apiEndpoints = [
    {
      title: '获取 DApp 列表',
      method: 'GET',
      path: '/api/dapps',
      description: '获取所有 DApp 列表，支持筛选',
      auth: false,
      queryParams: [
        { name: 'status', type: 'string', optional: true, description: '筛选状态：pending, active, rejected' },
        { name: 'category', type: 'string', optional: true, description: '筛选分类' },
        { name: 'featured', type: 'boolean', optional: true, description: '是否推荐：true, false' },
        { name: 'owner_address', type: 'string', optional: true, description: '筛选所有者地址' },
      ],
      example: `${API_BASE_URL}/dapps?status=active&featured=true`,
      response: {
        success: true,
        data: [
          {
            id: 1,
            owner_address: '0x...',
            name: 'DApp 名称',
            description: 'DApp 描述',
            url: 'https://example.com',
            logo_r2_key: 'logos/xxx.png',
            category: 'DeFi',
            status: 'active',
            is_featured: true,
            sort_order: 0,
            created_at: 1234567890,
          },
        ],
      },
    },
    {
      title: '获取单个 DApp',
      method: 'GET',
      path: '/api/dapps/:id',
      description: '根据 ID 获取单个 DApp 详情',
      auth: false,
      queryParams: [],
      example: `${API_BASE_URL}/dapps/1`,
      response: {
        success: true,
        data: {
          id: 1,
          owner_address: '0x...',
          name: 'DApp 名称',
          description: 'DApp 描述',
          url: 'https://example.com',
          logo_r2_key: 'logos/xxx.png',
          category: 'DeFi',
          status: 'active',
          is_featured: true,
          sort_order: 0,
          created_at: 1234567890,
        },
      },
    },
    {
      title: '获取已部署代币列表',
      method: 'GET',
      path: '/api/tokens/deployed',
      description: '获取所有通过平台部署的代币列表',
      auth: false,
      queryParams: [
        { name: 'chain_id', type: 'number', optional: true, description: '筛选链 ID，如：11155111 (Sepolia)' },
        { name: 'deployer_address', type: 'string', optional: true, description: '筛选部署者地址' },
      ],
      example: `${API_BASE_URL}/tokens/deployed?chain_id=11155111`,
      response: {
        success: true,
        data: [
          {
            chain_id: 11155111,
            token_address: '0x...',
            deployer_address: '0x...',
            name: 'Token Name',
            symbol: 'TKN',
            logo_r2_key: 'logos/xxx.png',
            sort_order: 0,
            deployed_at: 1234567890,
          },
        ],
      },
    },
    {
      title: '获取收录代币列表',
      method: 'GET',
      path: '/api/tokens/listed',
      description: '获取所有收录到平台的代币列表',
      auth: false,
      queryParams: [
        { name: 'chain_id', type: 'number', optional: true, description: '筛选链 ID，如：11155111 (Sepolia)' },
        { name: 'submitter_address', type: 'string', optional: true, description: '筛选提交者地址' },
        { name: 'pinned', type: 'boolean', optional: true, description: '是否置顶：true, false' },
      ],
      example: `${API_BASE_URL}/tokens/listed?chain_id=11155111&pinned=true`,
      response: {
        success: true,
        data: [
          {
            id: 1,
            chain_id: 11155111,
            token_address: '0x...',
            submitter_address: '0x...',
            logo_r2_key: 'logos/xxx.png',
            is_pinned: true,
            sort_order: 0,
            payment_tx_hash: '0x...',
            created_at: 1234567890,
            updated_at: 1234567890,
          },
        ],
      },
    },
  ];

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <FileText className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">API 文档</h1>
            </div>
            <p className="text-gray-400">钱包调用接口文档 - 仅包含 GET 接口</p>
            <p className="text-sm text-gray-500">Base URL: {API_BASE_URL}</p>
          </div>

          {/* API 端点列表 */}
          <div className="space-y-6">
            {apiEndpoints.map((endpoint, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-400 border-green-500/50 font-mono"
                      >
                        {endpoint.method}
                      </Badge>
                      <CardTitle className="text-white">{endpoint.title}</CardTitle>
                    </div>
                    {!endpoint.auth && (
                      <Badge variant="outline" className="text-gray-400 border-gray-600">
                        公开接口
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-gray-400 mt-2">
                    {endpoint.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 路径 */}
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">路径</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-green-400 font-mono text-sm">
                        {endpoint.path}
                      </code>
                      <button
                        onClick={() => copyToClipboard(endpoint.path, index * 10 + 1)}
                        className="p-2 hover:bg-gray-800 rounded transition-colors"
                        title="复制路径"
                      >
                        {copiedIndex === index * 10 + 1 ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 查询参数 */}
                  {endpoint.queryParams.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">查询参数</p>
                      <div className="space-y-2">
                        {endpoint.queryParams.map((param, paramIndex) => (
                          <div
                            key={paramIndex}
                            className="flex items-start space-x-2 p-2 bg-gray-800/50 rounded"
                          >
                            <code className="text-green-400 font-mono text-sm min-w-[120px]">
                              {param.name}
                            </code>
                            <span className="text-gray-400 text-sm">({param.type})</span>
                            {param.optional && (
                              <Badge variant="outline" className="text-xs text-gray-500 border-gray-600">
                                可选
                              </Badge>
                            )}
                            <span className="text-gray-500 text-sm flex-1">- {param.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 示例请求 */}
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">示例请求</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-blue-400 font-mono text-sm break-all">
                        {endpoint.example}
                      </code>
                      <button
                        onClick={() => copyToClipboard(endpoint.example, index * 10 + 2)}
                        className="p-2 hover:bg-gray-800 rounded transition-colors"
                        title="复制示例"
                      >
                        {copiedIndex === index * 10 + 2 ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 响应示例 */}
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">响应示例</p>
                    <pre className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 font-mono text-xs overflow-x-auto">
                      {JSON.stringify(endpoint.response, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 使用说明 */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <div>
                <p className="font-medium text-white mb-1">1. 所有接口均为公开接口，无需认证</p>
                <p>直接使用 GET 请求即可获取数据</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">2. 响应格式统一</p>
                <p>所有接口返回格式为：`{'{ "success": true, "data": [...] }'}`</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">3. 排序规则</p>
                <p>
                  - DApp 列表：按 sort_order 升序 → is_featured 降序 → created_at 降序
                  <br />
                  - 代币列表：按 sort_order 升序 → is_pinned 降序 → created_at 降序
                </p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">4. Logo 图片访问</p>
                <p>
                  如果返回的 logo_r2_key 不为空，可以通过 R2 公开 URL 访问图片
                  <br />
                  （具体 URL 格式需要根据 R2 配置确定）
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


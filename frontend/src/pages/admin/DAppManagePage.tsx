import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { formatAddress, formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Star, ExternalLink, Globe, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useSignMessage } from 'wagmi';
import { CONTRACTS, PRICING } from '@/config/contracts';
import { createSIWEMessage, generateNonce } from '@/lib/siwe';

const TOKEN_DECIMALS = 6;
const FEATURE_PRICE = BigInt(PRICING.DAPP_FEATURED) * BigInt(10 ** TOKEN_DECIMALS);

export function DAppManagePage() {
  const queryClient = useQueryClient();
  const { address, isConnected, chainId } = useAccount();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [sortOrderEdits, setSortOrderEdits] = useState<Record<number, number>>({});
  const [featuringDAppId, setFeaturingDAppId] = useState<number | null>(null);
  
  const { signMessageAsync } = useSignMessage();
  const {
    writeContractAsync: writeUSDTAsync,
    data: usdtHash,
    isPending: isUSDTWriting,
  } = useWriteContract();
  
  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: usdtHash,
  });

  const { data: dapps, isLoading } = useQuery({
    queryKey: ['admin-dapps-all'],
    queryFn: async () => {
      const response = await apiClient.getDApps();
      return response.data || [];
    },
  });

  const updateDAppStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiClient.updateDAppStatus(
        id,
        status as 'pending' | 'active' | 'rejected'
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dapps-all'] });
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const updateDAppSortOrder = useMutation({
    mutationFn: async ({ id, sortOrder }: { id: number; sortOrder: number }) => {
      const response = await apiClient.updateDAppSortOrder(id, sortOrder);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dapps-all'] });
      setSortOrderEdits({});
    },
  });

  const handleApprove = (id: number) => {
    setProcessingId(id);
    updateDAppStatus.mutate({ id, status: 'active' });
  };

  const handleReject = (id: number) => {
    setProcessingId(id);
    updateDAppStatus.mutate({ id, status: 'rejected' });
  };

  const handleSortOrderChange = (id: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setSortOrderEdits((prev) => ({ ...prev, [id]: numValue }));
  };

  const handleSaveSortOrder = (id: number) => {
    const sortOrder = sortOrderEdits[id] ?? 0;
    updateDAppSortOrder.mutate({ id, sortOrder });
  };

  // 设置推荐位（需要支付）
  const handleFeatureDApp = async (dappId: number) => {
    if (!isConnected || !address || !chainId) {
      alert('请先连接钱包');
      return;
    }

    try {
      setFeaturingDAppId(dappId);

      // 第一步：完成 SIWE 签名并登录获取 JWT
      const nonce = generateNonce();
      const message = await createSIWEMessage(
        address,
        chainId,
        window.location.host,
        nonce
      );
      
      const signature = await signMessageAsync({ message });
      const loginResponse = await apiClient.login(message, signature);
      
      if (!loginResponse.success || !loginResponse.data?.token) {
        throw new Error(loginResponse.error || '登录失败，无法获取 JWT token');
      }

      // 第二步：支付
      const usdtAddress = CONTRACTS.USDT[chainId as keyof typeof CONTRACTS.USDT];
      if (!usdtAddress || usdtAddress === '') {
        alert('当前链不支持该代币，请切换到 Sepolia 测试网');
        return;
      }

      const paymentReceiver = CONTRACTS.PAYMENT_RECEIVER;
      if (!paymentReceiver || paymentReceiver === '') {
        alert('支付接收地址未配置，请联系管理员');
        return;
      }

      const hash = await writeUSDTAsync({
        address: usdtAddress as `0x${string}`,
        chainId: chainId,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
        functionName: 'transfer',
        args: [paymentReceiver as `0x${string}`, FEATURE_PRICE],
      });

      console.log('推荐位支付交易已发送，哈希:', hash);
    } catch (error: any) {
      console.error('Feature DApp error:', error);
      setFeaturingDAppId(null);
      if (error?.message?.includes('User rejected') || error?.message?.includes('user rejected') || error?.message?.includes('rejected')) {
        alert('用户取消了操作');
      } else if (error?.message) {
        alert(`设置推荐位失败: ${error.message}`);
      } else {
        alert('设置推荐位失败，请重试');
      }
    }
  };

  // 当支付交易确认后，自动提交推荐位设置
  useEffect(() => {
    const autoFeature = async () => {
      if (receipt && receipt.transactionHash && featuringDAppId) {
        const txHash = receipt.transactionHash;
        console.log('[Admin] Feature payment confirmed, transaction hash:', txHash);

        try {
          const response = await apiClient.featureDApp(featuringDAppId, txHash, chainId!);
          
          if (response.success) {
            alert('推荐位设置成功！');
            queryClient.invalidateQueries({ queryKey: ['admin-dapps-all'] });
          } else {
            alert(response.error || '设置推荐位失败，但支付已成功');
          }
        } catch (error: any) {
          console.error('[Admin] Feature DApp error:', error);
          alert('设置推荐位失败，但支付已成功。支付已转到: ' + CONTRACTS.PAYMENT_RECEIVER);
        } finally {
          setFeaturingDAppId(null);
        }
      }
    };

    autoFeature();
  }, [receipt, featuringDAppId, chainId, queryClient]);

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  const statusConfig = {
    pending: { label: '待审核', icon: Clock, color: 'text-yellow-500' },
    active: { label: '已通过', icon: CheckCircle, color: 'text-green-500' },
    rejected: { label: '已拒绝', icon: XCircle, color: 'text-red-500' },
  };

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Globe className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">DApp 管理</h1>
            </div>
            <p className="text-gray-400">审核和管理平台上的 DApp</p>
          </div>

          {dapps && Array.isArray(dapps) && dapps.length > 0 ? (
            <div className="space-y-4">
              {dapps.map((dapp: any) => {
                const status = statusConfig[dapp.status as keyof typeof statusConfig];
                const StatusIcon = status?.icon || Clock;

                return (
                  <Card key={dapp.id} className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CardTitle className="text-white">{dapp.name}</CardTitle>
                          {dapp.is_featured && (
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                          )}
                          <div className={`flex items-center space-x-1 ${status?.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-sm">{status?.label}</span>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="text-gray-400">{dapp.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {dapp.description && (
                        <p className="text-sm text-gray-400">{dapp.description}</p>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium mb-1 text-gray-300">URL</p>
                          <a
                            href={dapp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-green-400 hover:text-green-300 flex items-center transition-colors"
                          >
                            {dapp.url}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1 text-gray-300">所有者</p>
                          <p className="text-sm font-mono text-gray-400">{formatAddress(dapp.owner_address)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1 text-gray-300">提交时间</p>
                          <p className="text-sm text-gray-400">{formatDate(dapp.created_at)}</p>
                        </div>
                        <div>
                          <Label htmlFor={`sort-order-${dapp.id}`} className="text-sm font-medium mb-1 text-gray-300">
                            排序顺序
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id={`sort-order-${dapp.id}`}
                              type="number"
                              value={sortOrderEdits[dapp.id] !== undefined ? sortOrderEdits[dapp.id] : (dapp.sort_order || 0)}
                              onChange={(e) => handleSortOrderChange(dapp.id, e.target.value)}
                              className="bg-gray-800 border-gray-700 text-white w-24"
                              placeholder="0"
                            />
                            <Button
                              onClick={() => handleSaveSortOrder(dapp.id)}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              disabled={updateDAppSortOrder.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">数字越小越靠前</p>
                        </div>
                      </div>

                      {dapp.status === 'pending' && (
                        <div className="flex items-center space-x-2 pt-4 border-t border-gray-800">
                          <Button
                            onClick={() => handleApprove(dapp.id)}
                            disabled={processingId === dapp.id}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            通过
                          </Button>
                          <Button
                            onClick={() => handleReject(dapp.id)}
                            disabled={processingId === dapp.id}
                            variant="destructive"
                            size="sm"
                            className="bg-red-500 hover:bg-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            拒绝
                          </Button>
                        </div>
                      )}

                      {dapp.status === 'active' && (
                        <div className="flex items-center space-x-2 pt-4 border-t border-gray-800">
                          {!dapp.is_featured ? (
                            <Button
                              onClick={() => handleFeatureDApp(dapp.id)}
                              disabled={featuringDAppId === dapp.id || isUSDTWriting || isUSDTConfirming}
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                              <Star className="mr-2 h-4 w-4" />
                              {featuringDAppId === dapp.id ? '处理中...' : '设置推荐位'}
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2 text-yellow-400">
                              <Star className="h-4 w-4 fill-yellow-400" />
                              <span className="text-sm">已设置推荐位</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                暂无 DApp
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


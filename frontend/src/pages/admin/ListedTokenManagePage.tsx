import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { formatAddress, formatDate } from '@/lib/utils';
import { Wallet, Pin, ExternalLink, Save } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useSignMessage } from 'wagmi';
import { CONTRACTS, PRICING } from '@/config/contracts';
import { createSIWEMessage, generateNonce } from '@/lib/siwe';

const TOKEN_DECIMALS = 6;
const PIN_PRICE = BigInt(PRICING.TOKEN_PINNED) * BigInt(10 ** TOKEN_DECIMALS);

export function ListedTokenManagePage() {
  const queryClient = useQueryClient();
  const { address, isConnected, chainId } = useAccount();
  const [sortOrderEdits, setSortOrderEdits] = useState<Record<number, number>>({});
  const [pinningTokenId, setPinningTokenId] = useState<number | null>(null);
  
  const { signMessageAsync } = useSignMessage();
  const {
    writeContractAsync: writeUSDTAsync,
    data: usdtHash,
    isPending: isUSDTWriting,
  } = useWriteContract();
  
  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: usdtHash,
  });

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['admin-listed-tokens-all'],
    queryFn: async () => {
      const response = await apiClient.getListedTokens();
      return response.data || [];
    },
  });

  const updateSortOrder = useMutation({
    mutationFn: async ({ tokenId, sortOrder }: { tokenId: number; sortOrder: number }) => {
      const response = await apiClient.updateListedTokenSortOrder(tokenId, sortOrder);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listed-tokens-all'] });
      setSortOrderEdits({});
    },
  });

  const handleSortOrderChange = (tokenId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setSortOrderEdits((prev) => ({ ...prev, [tokenId]: numValue }));
  };

  const handleSaveSortOrder = (tokenId: number) => {
    const sortOrder = sortOrderEdits[tokenId] ?? 0;
    updateSortOrder.mutate({ tokenId, sortOrder });
  };

  // 置顶代币（需要支付）
  const handlePinToken = async (tokenId: number, tokenChainId: number) => {
    if (!isConnected || !address || !chainId) {
      alert('请先连接钱包');
      return;
    }

    // 检查链是否匹配
    if (chainId !== tokenChainId) {
      alert(`请切换到链 ID ${tokenChainId} 的网络`);
      return;
    }

    try {
      setPinningTokenId(tokenId);

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
        args: [paymentReceiver as `0x${string}`, PIN_PRICE],
      });

      console.log('置顶代币支付交易已发送，哈希:', hash);
    } catch (error: any) {
      console.error('Pin Token error:', error);
      setPinningTokenId(null);
      if (error?.message?.includes('User rejected') || error?.message?.includes('user rejected') || error?.message?.includes('rejected')) {
        alert('用户取消了操作');
      } else if (error?.message) {
        alert(`置顶代币失败: ${error.message}`);
      } else {
        alert('置顶代币失败，请重试');
      }
    }
  };

  // 当支付交易确认后，自动提交置顶设置
  useEffect(() => {
    const autoPin = async () => {
      if (receipt && receipt.transactionHash && pinningTokenId) {
        const txHash = receipt.transactionHash;
        console.log('[Admin] Pin payment confirmed, transaction hash:', txHash);

        try {
          const response = await apiClient.pinToken(pinningTokenId, txHash);
          
          if (response.success) {
            alert('代币置顶成功！');
            queryClient.invalidateQueries({ queryKey: ['admin-listed-tokens-all'] });
          } else {
            alert(response.error || '置顶代币失败，但支付已成功');
          }
        } catch (error: any) {
          console.error('[Admin] Pin Token error:', error);
          alert('置顶代币失败，但支付已成功。支付已转到: ' + CONTRACTS.PAYMENT_RECEIVER);
        } finally {
          setPinningTokenId(null);
        }
      }
    };

    autoPin();
  }, [receipt, pinningTokenId, queryClient]);

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Wallet className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">代币收录管理</h1>
            </div>
            <p className="text-gray-400">查看所有收录到平台的代币</p>
          </div>

          {tokens && Array.isArray(tokens) && tokens.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tokens.map((token: any) => (
                <Card key={token.id} className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <CardTitle className="text-lg text-white">代币收录</CardTitle>
                      </div>
                      {token.is_pinned && (
                        <Pin className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <CardDescription className="text-gray-400">链 ID: {token.chain_id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1 text-gray-300">代币地址</p>
                      <p className="text-sm font-mono text-gray-400">{formatAddress(token.token_address)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1 text-gray-300">提交者</p>
                      <p className="text-sm font-mono text-gray-400">{formatAddress(token.submitter_address)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1 text-gray-300">收录时间</p>
                        <p className="text-sm text-gray-400">{formatDate(token.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1 text-gray-300">状态</p>
                        <p className="text-sm text-gray-400">{token.is_pinned ? '已置顶' : '普通'}</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`sort-order-${token.id}`} className="text-sm font-medium mb-1 text-gray-300">
                        排序顺序
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id={`sort-order-${token.id}`}
                          type="number"
                          value={sortOrderEdits[token.id] !== undefined ? sortOrderEdits[token.id] : (token.sort_order || 0)}
                          onChange={(e) => handleSortOrderChange(token.id, e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white w-24"
                          placeholder="0"
                        />
                        <Button
                          onClick={() => handleSaveSortOrder(token.id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          disabled={updateSortOrder.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">数字越小越靠前</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-gray-800">
                      {!token.is_pinned ? (
                        <Button
                          onClick={() => handlePinToken(token.id, token.chain_id)}
                          disabled={pinningTokenId === token.id || isUSDTWriting || isUSDTConfirming}
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          <Pin className="mr-2 h-4 w-4" />
                          {pinningTokenId === token.id ? '处理中...' : '置顶代币'}
                        </Button>
                      ) : (
                        <div className="flex items-center space-x-2 text-yellow-400">
                          <Pin className="h-4 w-4 fill-yellow-400" />
                          <span className="text-sm">已置顶</span>
                        </div>
                      )}
                    </div>
                    <a
                      href={`https://bscscan.com/address/${token.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 hover:text-green-300 flex items-center transition-colors"
                    >
                      查看链上信息
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                暂无收录的代币
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


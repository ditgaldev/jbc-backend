import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { writeContractAsync: writeUSDTAsync, data: usdtHash, isPending: isUSDTWriting } = useWriteContract();
  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({ hash: usdtHash });

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['admin-listed-tokens-all'],
    queryFn: async () => {
      const response = await apiClient.getListedTokens();
      return response.data || [];
    },
  });

  const updateSortOrder = useMutation({
    mutationFn: async ({ tokenId, sortOrder }: { tokenId: number; sortOrder: number }) => {
      return await apiClient.updateListedTokenSortOrder(tokenId, sortOrder);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-listed-tokens-all'] }); setSortOrderEdits({}); },
  });

  const handleSortOrderChange = (tokenId: number, value: string) => {
    setSortOrderEdits((prev) => ({ ...prev, [tokenId]: parseInt(value) || 0 }));
  };

  const handleSaveSortOrder = (tokenId: number) => {
    updateSortOrder.mutate({ tokenId, sortOrder: sortOrderEdits[tokenId] ?? 0 });
  };

  const handlePinToken = async (tokenId: number, tokenChainId: number) => {
    if (!isConnected || !address || !chainId) { alert('请先连接钱包'); return; }
    if (chainId !== tokenChainId) { alert(`请切换到链 ID ${tokenChainId} 的网络`); return; }

    try {
      setPinningTokenId(tokenId);
      const nonce = generateNonce();
      const message = await createSIWEMessage(address, chainId, window.location.host, nonce);
      const signature = await signMessageAsync({ message });
      const loginResponse = await apiClient.login(message, signature);
      if (!loginResponse.success || !loginResponse.data?.token) { throw new Error(loginResponse.error || '登录失败'); }

      const usdtAddress = CONTRACTS.USDT[chainId as keyof typeof CONTRACTS.USDT];
      if (!usdtAddress) { alert('当前链不支持该代币'); return; }
      const paymentReceiver = CONTRACTS.PAYMENT_RECEIVER;
      if (!paymentReceiver) { alert('支付接收地址未配置'); return; }

      await writeUSDTAsync({
        address: usdtAddress as `0x${string}`,
        chainId: chainId,
        abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'transfer',
        args: [paymentReceiver as `0x${string}`, PIN_PRICE],
      });
    } catch (error: any) {
      setPinningTokenId(null);
      if (error?.message?.includes('rejected')) { alert('用户取消了操作'); }
      else { alert(`置顶代币失败: ${error?.message || ''}`); }
    }
  };

  useEffect(() => {
    const autoPin = async () => {
      if (receipt && receipt.transactionHash && pinningTokenId) {
        try {
          const response = await apiClient.pinToken(pinningTokenId, receipt.transactionHash);
          if (response.success) { alert('代币置顶成功！'); queryClient.invalidateQueries({ queryKey: ['admin-listed-tokens-all'] }); }
          else { alert(response.error || '置顶代币失败，但支付已成功'); }
        } catch { alert('置顶代币失败，但支付已成功'); }
        finally { setPinningTokenId(null); }
      }
    };
    autoPin();
  }, [receipt, pinningTokenId, queryClient]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <GeometricPattern />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-10">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Wallet className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-sm text-gray-400 tracking-wide">收录管理</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="neon-text">代币收录管理</span>
            </h1>
            <p className="text-gray-500">查看所有收录到平台的代币</p>
          </div>

          {tokens && Array.isArray(tokens) && tokens.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tokens.map((token: any) => (
                <div key={token.id} className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="icon-container w-10 h-10 rounded-xl flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">代币收录</h3>
                        <p className="text-xs text-gray-500">链 ID: {token.chain_id}</p>
                      </div>
                    </div>
                    {token.is_pinned && <Pin className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">代币地址</p>
                      <p className="font-mono text-gray-400">{formatAddress(token.token_address)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">提交者</p>
                      <p className="font-mono text-gray-400">{formatAddress(token.submitter_address)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">收录时间</p>
                        <p className="text-gray-400">{formatDate(token.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">状态</p>
                        <p className="text-gray-400">{token.is_pinned ? '已置顶' : '普通'}</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`sort-order-${token.id}`} className="text-xs text-gray-500 mb-1 block">排序顺序</Label>
                      <div className="flex items-center space-x-2">
                        <Input id={`sort-order-${token.id}`} type="number"
                          value={sortOrderEdits[token.id] !== undefined ? sortOrderEdits[token.id] : (token.sort_order || 0)}
                          onChange={(e) => handleSortOrderChange(token.id, e.target.value)}
                          className="bg-white/5 border-white/10 text-white w-20 h-9 rounded-lg" placeholder="0" />
                        <Button onClick={() => handleSaveSortOrder(token.id)} size="sm" className="btn-gradient text-white h-9 px-3" disabled={updateSortOrder.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                      {!token.is_pinned ? (
                        <Button onClick={() => handlePinToken(token.id, token.chain_id)} disabled={pinningTokenId === token.id || isUSDTWriting || isUSDTConfirming}
                          size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg">
                          <Pin className="mr-2 h-4 w-4" />{pinningTokenId === token.id ? '处理中...' : '置顶代币'}
                        </Button>
                      ) : (
                        <div className="flex items-center space-x-2 text-yellow-400">
                          <Pin className="h-4 w-4 fill-yellow-400" />
                          <span className="text-sm">已置顶</span>
                        </div>
                      )}
                    </div>
                    <a href={`https://bscscan.com/address/${token.token_address}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center transition-colors pt-2">
                      查看链上信息
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-16 text-center text-gray-500">暂无收录的代币</div>
          )}
        </div>
      </div>
    </div>
  );
}

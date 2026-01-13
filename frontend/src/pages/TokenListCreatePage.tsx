import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { CONTRACTS } from '@/config/contracts';
import { formatAmount } from '@/lib/utils';
import { createSIWEMessage, generateNonce } from '@/lib/siwe';
import { useSignMessage } from 'wagmi';
import { parseUnits } from 'viem';
import { Loader2, AlertCircle, Wallet, Info, Coins, CheckCircle, Upload, X } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { CHAIN_IDS } from '@/config/chains';

const PRICING = {
  TOKEN_LISTING: '1', // 测试价格：1 代币
} as const;

// USDC/USDT 通常是 6 位小数，不是 18 位
const TOKEN_DECIMALS = 6;
const PRICE = BigInt(PRICING.TOKEN_LISTING) * BigInt(10 ** TOKEN_DECIMALS);

export function TokenListCreatePage() {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [selectedChainId, setSelectedChainId] = useState<number>(CHAIN_IDS.SEPOLIA); // 默认以太坊 Sepolia
  const [tokenAddress, setTokenAddress] = useState('');
  const [paymentTxHash, setPaymentTxHash] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoR2Key, setLogoR2Key] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { signMessageAsync } = useSignMessage();

  const {
    writeContractAsync: writeUSDTAsync,
    data: usdtHash,
    isPending: isUSDTWriting,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: usdtHash,
  });

  // 处理文件选择并自动上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('文件大小不能超过 5MB');
        return;
      }
      
      // 设置文件并显示预览
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 自动上传（如果已连接钱包）
      if (isConnected && address) {
        try {
          setIsUploading(true);
          const response = await apiClient.uploadFile(file);
          
          if (response.success && response.data) {
            setLogoR2Key(response.data.key);
            console.log('[Frontend] Logo uploaded successfully:', response.data.key);
          } else {
            console.error('[Frontend] Upload failed:', response.error);
            alert(response.error || '上传失败，请重试');
            // 上传失败时清除文件
            setLogoFile(null);
            setLogoPreview(null);
          }
        } catch (error: any) {
          console.error('[Frontend] Upload error:', error);
          alert('上传失败，请重试');
          // 上传失败时清除文件
          setLogoFile(null);
          setLogoPreview(null);
        } finally {
          setIsUploading(false);
        }
      } else {
        // 未连接钱包时，只显示预览，等待连接后再上传
        console.log('[Frontend] Wallet not connected, logo will be uploaded when wallet is connected');
      }
    }
  };

  // 当钱包连接后，如果有未上传的文件，自动上传
  useEffect(() => {
    const autoUpload = async () => {
      if (logoFile && !logoR2Key && isConnected && address && !isUploading) {
        try {
          setIsUploading(true);
          const response = await apiClient.uploadFile(logoFile);
          
          if (response.success && response.data) {
            setLogoR2Key(response.data.key);
            console.log('[Frontend] Logo auto-uploaded after wallet connection:', response.data.key);
          } else {
            console.error('[Frontend] Auto-upload failed:', response.error);
          }
        } catch (error: any) {
          console.error('[Frontend] Auto-upload error:', error);
        } finally {
          setIsUploading(false);
        }
      }
    };

    autoUpload();
  }, [logoFile, logoR2Key, isConnected, address, isUploading]);

  // 移除图标
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoR2Key(null);
  };

  // 切换链
  const handleChainChange = async (newChainId: number) => {
    setSelectedChainId(newChainId);
    if (switchChain && chainId !== newChainId) {
      try {
        await switchChain({ chainId: newChainId });
      } catch (error) {
        console.error('Failed to switch chain:', error);
        alert('请手动切换到目标链');
      }
    }
  };

  // 当交易确认后，自动设置交易哈希
  useEffect(() => {
    if (receipt && receipt.transactionHash && !paymentTxHash) {
      setPaymentTxHash(receipt.transactionHash);
    }
  }, [receipt, paymentTxHash]);

  // 支付并提交代币收录（合并操作）
  const handlePaymentAndSubmit = async () => {
    // 验证表单
    if (!tokenAddress) {
      alert('请填写代币合约地址');
      return;
    }

    if (!isConnected || !address) {
      alert('请先连接钱包');
      return;
    }

    // 检查链是否匹配
    if (chainId !== selectedChainId) {
      alert(`请切换到 ${selectedChainId === CHAIN_IDS.SEPOLIA ? '以太坊 Sepolia' : '目标'} 网络`);
      return;
    }

    try {
      // 第一步：完成 SIWE 签名并登录获取 JWT
      const nonce = generateNonce();
      console.log('[Frontend] Step 1: Generating SIWE message for login...');
      
      const message = await createSIWEMessage(
        address,
        selectedChainId,
        window.location.host,
        nonce
      );
      
      const signature = await signMessageAsync({ message });
      console.log('[Frontend] SIWE signature received');

      // 调用登录接口获取 JWT
      console.log('[Frontend] Step 2: Logging in with SIWE to get JWT...');
      const loginResponse = await apiClient.login(message, signature);
      
      if (!loginResponse.success || !loginResponse.data?.token) {
        throw new Error(loginResponse.error || '登录失败，无法获取 JWT token');
      }
      
      console.log('[Frontend] Login successful, JWT token obtained and saved');

      // 保存代币数据，供支付成功后使用
      sessionStorage.setItem('pendingTokenSubmission', JSON.stringify({
        tokenAddress,
        logoR2Key: logoR2Key || undefined,
        chainId: selectedChainId,
      }));
      
      console.log('[Frontend] Token data saved to sessionStorage');

      const usdtAddress = CONTRACTS.USDT[selectedChainId as keyof typeof CONTRACTS.USDT];
      if (!usdtAddress || usdtAddress === '') {
        alert('当前链不支持该代币，请切换到 Sepolia 测试网');
        return;
      }

      const paymentReceiver = CONTRACTS.PAYMENT_RECEIVER;
      if (!paymentReceiver || paymentReceiver === '') {
        alert('支付接收地址未配置，请联系管理员');
        return;
      }

      // 使用 writeContractAsync 来触发钱包签名
      const hash = await writeUSDTAsync({
        address: usdtAddress as `0x${string}`,
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
        args: [paymentReceiver as `0x${string}`, PRICE],
      });

      console.log('交易已发送，哈希:', hash);
    } catch (error: any) {
      console.error('Payment error:', error);
      // 如果用户取消了签名或支付，清除保存的数据
      sessionStorage.removeItem('pendingTokenSubmission');
      if (error?.message?.includes('User rejected') || error?.message?.includes('user rejected') || error?.message?.includes('rejected')) {
        alert('用户取消了操作');
      } else if (error?.message) {
        alert(`支付失败: ${error.message}`);
      } else {
        alert('支付失败，请重试');
      }
    }
  };

  // 当支付交易确认后，自动提交代币收录
  useEffect(() => {
    const autoSubmit = async () => {
      if (receipt && receipt.transactionHash && !paymentTxHash) {
        const txHash = receipt.transactionHash;
        console.log('[Frontend] Payment confirmed, transaction hash:', txHash);
        setPaymentTxHash(txHash);

        // 从 sessionStorage 获取之前保存的提交数据
        const pendingData = sessionStorage.getItem('pendingTokenSubmission');
        if (!pendingData) {
          console.error('[Frontend] 未找到待提交的代币数据');
          return;
        }

        try {
          console.log('[Frontend] Parsing pending data from sessionStorage...');
          const { tokenAddress: savedTokenAddress, logoR2Key: savedLogoR2Key, chainId: savedChainId } = JSON.parse(pendingData);

          console.log('[Frontend] Token data to submit:', {
            chainId: savedChainId || selectedChainId,
            tokenAddress: savedTokenAddress,
            paymentTxHash: txHash,
            hasLogo: !!savedLogoR2Key,
          });

          // JWT token 已经保存在 localStorage 中，API 客户端会自动使用
          console.log('[Frontend] Calling apiClient.listToken with JWT token...');
          const response = await apiClient.listToken({
            chainId: savedChainId || selectedChainId,
            tokenAddress: savedTokenAddress,
            paymentTxHash: txHash,
            logoR2Key: savedLogoR2Key,
          });

          console.log('[Frontend] API response:', response);

          // 清除保存的数据
          sessionStorage.removeItem('pendingTokenSubmission');

          if (response.success) {
            console.log('[Frontend] Token listed successfully');
            alert('支付成功！代币已收录。');
            navigate('/tokens');
          } else {
            console.error('[Frontend] Token listing failed:', response.error);
            alert(response.error || '收录失败，但支付已成功。支付已转到: ' + CONTRACTS.PAYMENT_RECEIVER);
          }
        } catch (error: any) {
          console.error('[Frontend] Submit error:', error);
          console.error('[Frontend] Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          });
          sessionStorage.removeItem('pendingTokenSubmission');
          const errorMsg = error?.message || '未知错误';
          alert(`支付成功！但收录失败: ${errorMsg}\n\n支付已转到: ${CONTRACTS.PAYMENT_RECEIVER}\n\n请稍后手动提交或联系管理员。`);
        }
      }
    };

    autoSubmit();
  }, [receipt, paymentTxHash, navigate, selectedChainId]);

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Coins className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">代币收录</h1>
            </div>
            <p className="text-gray-400">
              将您的代币收录到平台，提升曝光度和知名度
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 左侧：表单 */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">代币信息</CardTitle>
                  <CardDescription className="text-gray-400">
                    填写代币合约地址
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {!isConnected && (
                    <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm text-yellow-400">请先连接钱包</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="chain" className="text-gray-300">
                      选择链 <span className="text-red-400">*</span>
                    </Label>
                    <select
                      id="chain"
                      value={selectedChainId}
                      onChange={(e) => handleChainChange(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500"
                    >
                      <option value={CHAIN_IDS.SEPOLIA}>以太坊 Sepolia (测试网)</option>
                    </select>
                    <p className="text-xs text-gray-500">当前仅支持以太坊 Sepolia 测试网</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo" className="text-gray-300">
                      代币图标
                    </Label>
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                        {isUploading && (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-yellow-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>上传中...</span>
                          </div>
                        )}
                        {!isUploading && logoR2Key && (
                          <p className="text-xs text-green-400 mt-2">✓ 图标已上传</p>
                        )}
                        {!isUploading && !logoR2Key && isConnected && (
                          <p className="text-xs text-gray-400 mt-2">等待上传...</p>
                        )}
                        {!isUploading && !logoR2Key && !isConnected && (
                          <p className="text-xs text-yellow-400 mt-2">请连接钱包后自动上传</p>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                        <input
                          type="file"
                          id="logo"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="logo"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-400">
                            点击选择图标（最大 5MB）
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tokenAddress" className="text-gray-300">
                      代币合约地址 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="tokenAddress"
                      placeholder="0x..."
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500 font-mono"
                    />
                    {tokenAddress && (
                      <a
                        href={`https://sepolia.etherscan.io/address/${tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:underline"
                      >
                        查看合约
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 支付并提交按钮 */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Wallet className="h-5 w-5 text-green-400" />
                    <span>支付并提交</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {/* 支付状态提示 */}
                  {usdtHash && !receipt && (
                    <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-400 font-medium">交易已发送，等待确认...</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                          {usdtHash}
                        </p>
                      </div>
                    </div>
                  )}

                  {receipt && receipt.transactionHash && !paymentTxHash && (
                    <div className="flex items-center space-x-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-400 font-medium">支付已确认，正在提交代币收录...</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                          {receipt.transactionHash}
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentTxHash && (
                    <div className="flex items-center space-x-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm text-green-400 font-medium">支付成功！</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                          交易哈希: {paymentTxHash}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          支付接收地址: {CONTRACTS.PAYMENT_RECEIVER}
                        </p>
                      </div>
                    </div>
                  )}

                  {writeError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="flex-1">
                        <p className="text-sm text-red-400 font-medium">
                          {writeError.message?.includes('User rejected') || writeError.message?.includes('user rejected') || writeError.message?.includes('rejected')
                            ? '用户取消了交易'
                            : `支付失败: ${writeError.message || '未知错误'}`}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePaymentAndSubmit}
                    disabled={
                      !isConnected ||
                      isUSDTWriting ||
                      isUSDTConfirming ||
                      !tokenAddress ||
                      !!paymentTxHash
                    }
                    className="w-full bg-green-500 hover:bg-green-600 text-white glow-green"
                    size="lg"
                  >
                    {isUSDTWriting || isUSDTConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isUSDTWriting ? '发送交易...' : '等待确认...'}
                      </>
                    ) : paymentTxHash ? (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        已提交
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-5 w-5" />
                        支付 {formatAmount(PRICE, TOKEN_DECIMALS)} 代币并提交
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    点击按钮将同时完成支付和提交，支付成功后会自动提交代币收录
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：费用和说明 */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Info className="h-5 w-5 text-green-400" />
                    <span>费用说明</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">收录费用</p>
                    <p className="text-3xl font-bold text-green-400">
                      {formatAmount(PRICE, TOKEN_DECIMALS)} 代币
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      收录后您的代币将显示在平台代币列表中，用户可以查看和交易。
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">注意事项</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>请确保合约地址正确且为 ERC20 代币</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>代币必须已部署在支持的链上</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>收录后可在代币列表查看</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

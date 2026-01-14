import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
import { Loader2, AlertCircle, Globe, Info, Wallet, Upload, X, CheckCircle } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';

const PRICING = {
  DAPP_LISTING: '1', // 测试价格：1 代币
} as const;

// USDC/USDT 通常是 6 位小数，不是 18 位
const TOKEN_DECIMALS = 6;
const PRICE = BigInt(PRICING.DAPP_LISTING) * BigInt(10 ** TOKEN_DECIMALS);

export function DAppCreatePage() {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
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
    reset: resetWriteContract,
  } = useWriteContract();

  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: usdtHash,
  });

  // 当交易确认后，自动设置交易哈希
  useEffect(() => {
    if (receipt && receipt.transactionHash && !paymentTxHash) {
      setPaymentTxHash(receipt.transactionHash);
    }
  }, [receipt, paymentTxHash]);

  // 处理文件选择并自动上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      // 验证文件大小（5MB）
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
          // 直接上传，不需要 SIWE 签名
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

  // 支付并提交 DApp（合并操作）
  const handlePaymentAndSubmit = async () => {
    // 验证表单
    if (!name || !url || !category) {
      alert('请填写必填字段');
      return;
    }

    if (!isConnected || !address || !chainId) {
      alert('请先连接钱包');
      return;
    }

    // 重置之前的错误状态
    if (writeError) {
      resetWriteContract();
    }

    try {
      // 第一步：完成 SIWE 签名并登录获取 JWT
      const nonce = generateNonce();
      console.log('[Frontend] Step 1: Generating SIWE message for login...', {
        address,
        chainId,
        domain: window.location.host,
        nonce,
      });
      
      const message = await createSIWEMessage(
        address,
        chainId,
        window.location.host,
        nonce
      );
      
      console.log('[Frontend] SIWE Message generated');
      
      const signature = await signMessageAsync({ message });
      console.log('[Frontend] SIWE signature received');

      // 调用登录接口获取 JWT
      console.log('[Frontend] Step 2: Logging in with SIWE to get JWT...');
      const loginResponse = await apiClient.login(message, signature);
      
      if (!loginResponse.success || !loginResponse.data?.token) {
        throw new Error(loginResponse.error || '登录失败，无法获取 JWT token');
      }
      
      console.log('[Frontend] Login successful, JWT token obtained and saved');

      // 保存 DApp 数据，供支付成功后使用
      sessionStorage.setItem('pendingDAppSubmission', JSON.stringify({
        name,
        description,
        url,
        category,
        logoR2Key: logoR2Key || undefined,
      }));
      
      console.log('[Frontend] DApp data saved to sessionStorage');

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

      // 验证钱包连接状态
      if (!isConnected || !address || !chainId) {
        alert('钱包未连接，请先连接钱包');
        return;
      }

      console.log('[Frontend] Step 3: Preparing payment transaction...', {
        usdtAddress,
        paymentReceiver,
        amount: PRICE.toString(),
        chainId,
        address,
        isConnected,
        writeUSDTAsync: typeof writeUSDTAsync,
      });

      // 检查 writeUSDTAsync 是否可用
      if (!writeUSDTAsync || typeof writeUSDTAsync !== 'function') {
        throw new Error('writeContractAsync 不可用，请检查钱包连接状态。请确保钱包已连接并解锁。');
      }

      // 验证所有参数
      if (!usdtAddress || !paymentReceiver || !PRICE) {
        throw new Error('支付参数不完整，请检查配置');
      }

      // 使用 writeContractAsync 来触发钱包签名
      // wagmi v2 会自动使用当前连接的链，不需要显式传递 chainId
      console.log('[Frontend] Calling writeUSDTAsync to trigger wallet signature...');
      console.log('[Frontend] Contract call params:', {
        address: usdtAddress,
        functionName: 'transfer',
        args: [paymentReceiver, PRICE.toString()],
        chainId,
        isConnected,
      });
      
      // 确保在调用前钱包已就绪
      if (isUSDTWriting) {
        console.warn('[Frontend] 已有交易正在处理中，请等待...');
        return;
      }

      try {
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

        console.log('[Frontend] Payment transaction sent, hash:', hash);
      } catch (writeError: any) {
        console.error('[Frontend] writeUSDTAsync error:', writeError);
        // 重新抛出错误以便外层 catch 处理
        throw writeError;
      }
    } catch (error: any) {
      console.error('[Frontend] Payment error:', error);
      console.error('[Frontend] Error details:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
      });
      
      // 如果用户取消了签名或支付，清除保存的数据
      sessionStorage.removeItem('pendingDAppSubmission');
      
      // 检查是否是用户拒绝
      if (
        error?.message?.includes('User rejected') || 
        error?.message?.includes('user rejected') || 
        error?.message?.includes('rejected') ||
        error?.code === 4001 ||
        error?.code === 'ACTION_REJECTED'
      ) {
        alert('用户取消了操作');
      } else if (error?.message) {
        alert(`支付失败: ${error.message}`);
      } else {
        alert(`支付失败，请重试。错误信息: ${JSON.stringify(error)}`);
      }
    }
  };

  // 当支付交易确认后，自动提交 DApp（使用之前保存的 SIWE token）
  useEffect(() => {
    const autoSubmit = async () => {
      if (receipt && receipt.transactionHash && !paymentTxHash) {
        const txHash = receipt.transactionHash;
        console.log('[Frontend] Payment confirmed, transaction hash:', txHash);
        setPaymentTxHash(txHash);

        // 从 sessionStorage 获取之前保存的提交数据
        const pendingData = sessionStorage.getItem('pendingDAppSubmission');
        if (!pendingData) {
          console.error('[Frontend] 未找到待提交的 DApp 数据');
          return;
        }

        try {
          console.log('[Frontend] Parsing pending data from sessionStorage...');
          const { name: savedName, description: savedDescription, url: savedUrl, category: savedCategory, logoR2Key: savedLogoR2Key } = JSON.parse(pendingData);

          console.log('[Frontend] DApp data to submit:', {
            name: savedName,
            url: savedUrl,
            category: savedCategory,
            hasDescription: !!savedDescription,
            hasLogo: !!savedLogoR2Key,
          });

          // JWT token 已经保存在 localStorage 中，API 客户端会自动使用
          console.log('[Frontend] Calling apiClient.createDApp with JWT token...');
          const response = await apiClient.createDApp({
            name: savedName,
            description: savedDescription,
            url: savedUrl,
            category: savedCategory,
            paymentTxHash: txHash,
            logoR2Key: savedLogoR2Key,
          });

          console.log('[Frontend] API response:', response);

          // 清除保存的数据
          sessionStorage.removeItem('pendingDAppSubmission');

          if (response.success) {
            console.log('[Frontend] DApp submitted successfully');
            alert('支付成功！DApp 已提交，等待管理员审核。');
            navigate('/dapps');
          } else {
            console.error('[Frontend] DApp submission failed:', response.error);
            alert(response.error || '提交失败，但支付已成功。支付已转到: ' + CONTRACTS.PAYMENT_RECEIVER);
          }
        } catch (error: any) {
          console.error('[Frontend] Submit error:', error);
          console.error('[Frontend] Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          });
          sessionStorage.removeItem('pendingDAppSubmission');
          const errorMsg = error?.message || '未知错误';
          alert(`支付成功！但提交失败: ${errorMsg}\n\n支付已转到: ${CONTRACTS.PAYMENT_RECEIVER}\n\n请稍后手动提交或联系管理员。`);
        }
      }
    };

    autoSubmit();
  }, [receipt, paymentTxHash, navigate]);

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Globe className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">DApp 入驻</h1>
            </div>
            <p className="text-gray-400">
              提交您的 DApp 到平台，让更多用户发现和使用
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 左侧：表单 */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">DApp 信息</CardTitle>
                  <CardDescription className="text-gray-400">
                    填写您的 DApp 基本信息
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
                    <Label htmlFor="name" className="text-gray-300">
                      DApp 名称 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="例如: My DApp"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">
                      描述
                    </Label>
                    <textarea
                      id="description"
                      placeholder="简要描述您的 DApp 功能和特点..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url" className="text-gray-300">
                      URL <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-300">
                      分类 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="category"
                      placeholder="DeFi, NFT, GameFi, Social 等"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo" className="text-gray-300">
                      DApp 图标
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
                        <p className="text-sm text-blue-400 font-medium">支付已确认，正在提交 DApp...</p>
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
                          {paymentTxHash}
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
                      !name ||
                      !url ||
                      !category ||
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
                    点击按钮将同时完成支付和提交，支付成功后会自动提交 DApp
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
                    <p className="text-sm text-gray-400 mb-2">入驻费用</p>
                    <p className="text-3xl font-bold text-green-400">
                      {formatAmount(PRICE, TOKEN_DECIMALS)} 代币
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      提交后需要管理员审核，审核通过后您的 DApp 将显示在平台上。
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
                    <span>请确保 URL 可正常访问</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>分类选择要准确，便于用户查找</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>提交后可在 DApp 列表查看审核状态</span>
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

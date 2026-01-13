import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useSwitchChain } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { parseUnits, decodeEventLog } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTRACTS } from '@/config/contracts';
import { formatAmount } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { createSIWEMessage, generateNonce } from '@/lib/siwe';
import { useSignMessage } from 'wagmi';
import { AlertCircle, CheckCircle, Loader2, Coins, Info, Wallet, Upload, X } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { CHAIN_IDS } from '@/config/chains';

const PRICING = {
  TOKEN_DEPLOY: '1', // 测试价格：1 代币
} as const;

const TOKEN_DECIMALS = 6; // USDC/USDT 通常是 6 位小数
const PRICE = BigInt(PRICING.TOKEN_DEPLOY) * BigInt(10 ** TOKEN_DECIMALS);

export function DeployTokenPage() {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const [selectedChainId, setSelectedChainId] = useState<number>(CHAIN_IDS.SEPOLIA); // 默认以太坊 Sepolia
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoR2Key, setLogoR2Key] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState<string | null>(null);

  const { signMessageAsync } = useSignMessage();

  const {
    writeContractAsync: writeContractAsync,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash,
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

  const handleDeploy = async () => {
    if (!name || !symbol || !supply) {
      alert('请填写所有字段');
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
      console.log('[Frontend] Step 1: Generating SIWE message for login...', {
        address,
        chainId: selectedChainId,
        domain: window.location.host,
        nonce,
      });
      
      const message = await createSIWEMessage(
        address,
        selectedChainId,
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

      // 保存代币数据，供部署成功后使用
      sessionStorage.setItem('pendingTokenDeployment', JSON.stringify({
        name,
        symbol,
        supply,
        logoR2Key: logoR2Key || undefined,
        chainId: selectedChainId,
      }));
      
      console.log('[Frontend] Token data saved to sessionStorage');

      // 第二步：部署代币合约
      console.log('[Frontend] Step 3: Deploying token contract...');
      const txHash = await writeContractAsync({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: [
          {
            name: 'deployToken',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: 'name', type: 'string' },
              { name: 'symbol', type: 'string' },
              { name: 'totalSupply', type: 'uint256' },
            ],
            outputs: [{ name: 'tokenAddress', type: 'address' }],
          },
        ],
        functionName: 'deployToken',
        args: [name, symbol, parseUnits(supply, 18)],
        value: PRICE,
      });

      console.log('[Frontend] Deployment transaction sent, hash:', txHash);
    } catch (error: any) {
      console.error('[Frontend] Deploy error:', error);
      // 如果用户取消了签名或部署，清除保存的数据
      sessionStorage.removeItem('pendingTokenDeployment');
      if (error?.message?.includes('User rejected') || error?.message?.includes('user rejected') || error?.message?.includes('rejected')) {
        alert('用户取消了操作');
      } else if (error?.message) {
        alert(`部署失败: ${error.message}`);
      } else {
        alert('部署失败，请重试');
      }
    }
  };

  // 当部署交易确认后，自动索引代币到后端
  useEffect(() => {
    const autoIndex = async () => {
      if (receipt && receipt.transactionHash && !deployedTokenAddress && address && publicClient) {
        const txHash = receipt.transactionHash;
        console.log('[Frontend] Deployment confirmed, transaction hash:', txHash);

        // 从 sessionStorage 获取之前保存的代币数据
        const pendingData = sessionStorage.getItem('pendingTokenDeployment');
        if (!pendingData) {
          console.error('[Frontend] 未找到待索引的代币数据');
          return;
        }

        try {
          console.log('[Frontend] Parsing pending data from sessionStorage...');
          const { name: savedName, symbol: savedSymbol, logoR2Key: savedLogoR2Key, chainId: savedChainId } = JSON.parse(pendingData);

          // 从交易收据中获取部署的代币地址
          // 工厂合约通常会发出 TokenDeployed 事件
          let tokenAddress: string | null = null;

          // 尝试从 logs 中解析 TokenDeployed 事件
          if (receipt.logs && receipt.logs.length > 0) {
            console.log('[Frontend] Attempting to decode events from', receipt.logs.length, 'logs');
            for (const log of receipt.logs) {
              try {
                // 尝试解码 TokenDeployed 事件（根据实际合约 ABI 调整）
                // 常见的事件格式：
                // 1. TokenDeployed(address indexed tokenAddress, string name, string symbol, address indexed deployer)
                // 2. TokenCreated(address indexed tokenAddress, ...)
                const decoded = decodeEventLog({
                  abi: [
                    {
                      name: 'TokenDeployed',
                      type: 'event',
                      inputs: [
                        { name: 'tokenAddress', type: 'address', indexed: true },
                        { name: 'name', type: 'string', indexed: false },
                        { name: 'symbol', type: 'string', indexed: false },
                        { name: 'deployer', type: 'address', indexed: true },
                      ],
                    },
                    {
                      name: 'TokenCreated',
                      type: 'event',
                      inputs: [
                        { name: 'tokenAddress', type: 'address', indexed: true },
                        { name: 'name', type: 'string', indexed: false },
                        { name: 'symbol', type: 'string', indexed: false },
                        { name: 'deployer', type: 'address', indexed: true },
                      ],
                    },
                  ],
                  data: log.data,
                  topics: log.topics,
                });

                if (decoded && 'tokenAddress' in decoded) {
                  tokenAddress = decoded.tokenAddress as string;
                  console.log('[Frontend] Found token address from event:', tokenAddress);
                  break;
                }
              } catch (e) {
                // 继续尝试下一个 log
                continue;
              }
            }
          }

          // 如果无法从事件中获取，尝试从交易收据的合约创建地址获取
          if (!tokenAddress && receipt.contractAddress) {
            tokenAddress = receipt.contractAddress;
            console.log('[Frontend] Using contract address from receipt:', tokenAddress);
          }

          // 如果还是无法获取，尝试从交易返回值中获取（如果工厂合约返回代币地址）
          if (!tokenAddress && publicClient) {
            try {
              console.log('[Frontend] Attempting to get token address from transaction return value...');
              await publicClient.getTransaction({ hash: txHash as `0x${string}` });
              // 注意：这里可能需要根据实际合约实现调整
              // 如果工厂合约的 deployToken 函数返回代币地址，可以通过模拟调用获取
            } catch (e) {
              console.warn('[Frontend] Failed to get token address from transaction:', e);
            }
          }

          if (!tokenAddress) {
            console.error('[Frontend] Cannot extract token address from receipt:', {
              hasLogs: !!receipt.logs,
              logsCount: receipt.logs?.length || 0,
              contractAddress: receipt.contractAddress,
            });
            throw new Error('无法从交易收据中获取代币地址，请手动记录代币地址');
          }

          setDeployedTokenAddress(tokenAddress);
          console.log('[Frontend] Token address:', tokenAddress);

          // JWT token 已经保存在 localStorage 中，API 客户端会自动使用
          console.log('[Frontend] Calling apiClient.indexDeployedToken with JWT token...');
          const response = await apiClient.indexDeployedToken({
            chainId: savedChainId || selectedChainId,
            tokenAddress,
            deployerAddress: address,
            name: savedName,
            symbol: savedSymbol,
            logoR2Key: savedLogoR2Key,
            deployedAt: Date.now(),
          });

          console.log('[Frontend] API response:', response);

          // 清除保存的数据
          sessionStorage.removeItem('pendingTokenDeployment');

          if (response.success) {
            console.log('[Frontend] Token indexed successfully');
            alert(`代币部署成功！\n\n代币地址: ${tokenAddress}\n\n已自动索引到平台。`);
            // 可选：跳转到代币列表页面
            // navigate('/tokens');
          } else {
            console.error('[Frontend] Token indexing failed:', response.error);
            alert(`代币部署成功！但索引失败: ${response.error}\n\n代币地址: ${tokenAddress}`);
          }
        } catch (error: any) {
          console.error('[Frontend] Index error:', error);
          console.error('[Frontend] Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          });
          sessionStorage.removeItem('pendingTokenDeployment');
          const errorMsg = error?.message || '未知错误';
          alert(`代币部署成功！但索引失败: ${errorMsg}\n\n请稍后手动索引或联系管理员。`);
        }
      }
    };

    autoIndex();
  }, [receipt, deployedTokenAddress, address, publicClient, navigate, selectedChainId]);

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 页面标题 */}
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Coins className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">一键发币</h1>
            </div>
            <p className="text-gray-400">
              基于工厂合约快速部署 ERC20 代币，快速创建您的专属代币
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 左侧：表单 */}
            <div className="md:col-span-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">代币信息</CardTitle>
                  <CardDescription className="text-gray-400">
                    填写代币基本信息
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
                    <Label htmlFor="name" className="text-gray-300">
                      代币名称 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="例如: My Token"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-gray-300">
                      代币符号 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="symbol"
                      placeholder="例如: MTK"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500">建议使用 3-6 个大写字母</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supply" className="text-gray-300">
                      总供应量 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="supply"
                      type="number"
                      placeholder="1000000"
                      value={supply}
                      onChange={(e) => setSupply(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-500">代币总供应量（18 位小数）</p>
                  </div>

                  {writeError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <span className="text-sm text-red-400">
                        {writeError.message.includes('User rejected')
                          ? '用户取消了交易'
                          : writeError.message}
                      </span>
                    </div>
                  )}

                  {receipt && receipt.transactionHash && !deployedTokenAddress && (
                    <div className="flex items-center space-x-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-400 font-medium">部署已确认，正在索引代币...</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                          {receipt.transactionHash}
                        </p>
                      </div>
                    </div>
                  )}

                  {deployedTokenAddress && (
                    <div className="flex items-center space-x-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm text-green-400 font-medium">代币部署成功！</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                          代币地址: {deployedTokenAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleDeploy}
                    disabled={
                      !isConnected ||
                      isWriting ||
                      isConfirming ||
                      !name ||
                      !symbol ||
                      !supply ||
                      !!deployedTokenAddress
                    }
                    className="w-full bg-green-500 hover:bg-green-600 text-white glow-green"
                    size="lg"
                  >
                    {isWriting || isConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isWriting ? '发送交易...' : '等待确认...'}
                      </>
                    ) : deployedTokenAddress ? (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        已部署
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-5 w-5" />
                        支付 {formatAmount(PRICE, TOKEN_DECIMALS)} 代币并部署
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    点击按钮将先完成登录，然后进行支付和部署，部署成功后会自动索引到平台
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
                    <p className="text-sm text-gray-400 mb-2">部署费用</p>
                    <p className="text-3xl font-bold text-green-400">
                      {formatAmount(PRICE, TOKEN_DECIMALS)} 代币
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      费用将在部署时自动扣除，部署成功后您将获得代币合约的所有权。
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
                    <span>代币符号一旦部署不可更改</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>总供应量建议根据实际需求设置</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>部署后请妥善保管合约地址</span>
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

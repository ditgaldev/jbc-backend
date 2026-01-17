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
import { useLanguage } from '@/hooks/useLanguage';

const PRICING = { TOKEN_DEPLOY: '1' } as const;
const TOKEN_DECIMALS = 6;
const PRICE = BigInt(PRICING.TOKEN_DEPLOY) * BigInt(10 ** TOKEN_DECIMALS);

export function DeployTokenPage() {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const { t } = useLanguage();
  const [selectedChainId, setSelectedChainId] = useState<number>(CHAIN_IDS.SEPOLIA);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoR2Key, setLogoR2Key] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState<string | null>(null);

  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({ hash });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert(t('common.selectImageFile'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(t('common.fileTooLarge'));
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);

      if (isConnected && address) {
        try {
          setIsUploading(true);
          const response = await apiClient.uploadFile(file);
          if (response.success && response.data) {
            setLogoR2Key(response.data.key);
          } else {
            alert(response.error || t('common.uploadFailed'));
            setLogoFile(null);
            setLogoPreview(null);
          }
        } catch {
          alert(t('common.uploadFailed'));
          setLogoFile(null);
          setLogoPreview(null);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  useEffect(() => {
    const autoUpload = async () => {
      if (logoFile && !logoR2Key && isConnected && address && !isUploading) {
        try {
          setIsUploading(true);
          const response = await apiClient.uploadFile(logoFile);
          if (response.success && response.data) {
            setLogoR2Key(response.data.key);
          }
        } catch {} finally {
          setIsUploading(false);
        }
      }
    };
    autoUpload();
  }, [logoFile, logoR2Key, isConnected, address, isUploading]);

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoR2Key(null);
  };

  const handleChainChange = async (newChainId: number) => {
    setSelectedChainId(newChainId);
    if (switchChain && chainId !== newChainId) {
      try {
        await switchChain({ chainId: newChainId });
      } catch {
        alert(t('errors.manualSwitchChain'));
      }
    }
  };

  const handleDeploy = async () => {
    if (!name || !symbol || !supply) {
      alert(t('deployToken.fillAllFields'));
      return;
    }
    if (!isConnected || !address) {
      alert(t('common.connectWallet'));
      return;
    }
    if (chainId !== selectedChainId) {
      alert(t('deployToken.switchNetwork', { network: selectedChainId === CHAIN_IDS.SEPOLIA ? 'Ethereum Sepolia' : 'target' }));
      return;
    }

    try {
      const nonce = generateNonce();
      const message = await createSIWEMessage(address, selectedChainId, window.location.host, nonce);
      const signature = await signMessageAsync({ message });
      const loginResponse = await apiClient.login(message, signature);
      
      if (!loginResponse.success || !loginResponse.data?.token) {
        throw new Error(loginResponse.error || t('errors.loginFailed'));
      }

      sessionStorage.setItem('pendingTokenDeployment', JSON.stringify({
        name, symbol, supply, logoR2Key: logoR2Key || undefined, chainId: selectedChainId,
      }));

      await writeContractAsync({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: [{
          name: 'deployToken', type: 'function', stateMutability: 'payable',
          inputs: [{ name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'totalSupply', type: 'uint256' }],
          outputs: [{ name: 'tokenAddress', type: 'address' }],
        }],
        functionName: 'deployToken',
        args: [name, symbol, parseUnits(supply, 18)],
        value: PRICE,
      });
    } catch (error: any) {
      sessionStorage.removeItem('pendingTokenDeployment');
      if (error?.message?.includes('rejected')) {
        alert(t('common.userCancelled'));
      } else {
        alert(`${t('common.paymentFailed')}: ${error?.message || ''}`);
      }
    }
  };

  useEffect(() => {
    const autoIndex = async () => {
      if (receipt && receipt.transactionHash && !deployedTokenAddress && address && publicClient) {
        const txHash = receipt.transactionHash;
        const pendingData = sessionStorage.getItem('pendingTokenDeployment');
        if (!pendingData) return;

        try {
          const { name: savedName, symbol: savedSymbol, logoR2Key: savedLogoR2Key, chainId: savedChainId } = JSON.parse(pendingData);
          let tokenAddress: string | null = null;

          if (receipt.logs && receipt.logs.length > 0) {
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: [
                    { name: 'TokenDeployed', type: 'event', inputs: [{ name: 'tokenAddress', type: 'address', indexed: true }, { name: 'name', type: 'string', indexed: false }, { name: 'symbol', type: 'string', indexed: false }, { name: 'deployer', type: 'address', indexed: true }] },
                    { name: 'TokenCreated', type: 'event', inputs: [{ name: 'tokenAddress', type: 'address', indexed: true }, { name: 'name', type: 'string', indexed: false }, { name: 'symbol', type: 'string', indexed: false }, { name: 'deployer', type: 'address', indexed: true }] },
                  ],
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded && 'tokenAddress' in decoded) {
                  tokenAddress = decoded.tokenAddress as string;
                  break;
                }
              } catch { continue; }
            }
          }

          if (!tokenAddress && receipt.contractAddress) {
            tokenAddress = receipt.contractAddress;
          }

          if (!tokenAddress) throw new Error('Cannot extract token address');

          setDeployedTokenAddress(tokenAddress);
          const response = await apiClient.indexDeployedToken({
            chainId: savedChainId || selectedChainId, tokenAddress, deployerAddress: address,
            name: savedName, symbol: savedSymbol, logoR2Key: savedLogoR2Key, deployedAt: Date.now(),
          });

          sessionStorage.removeItem('pendingTokenDeployment');
          if (response.success) {
            alert(`${t('deployToken.deploySuccess')}\n\n${t('deployToken.tokenAddress')}: ${tokenAddress}`);
          } else {
            alert(`${t('deployToken.deploySuccess')}\n\n${t('deployToken.tokenAddress')}: ${tokenAddress}\n\nIndex failed: ${response.error}`);
          }
        } catch (error: any) {
          sessionStorage.removeItem('pendingTokenDeployment');
          alert(`${t('deployToken.deploySuccess')}\n\nIndex failed: ${error?.message || ''}`);
        }
      }
    };
    autoIndex();
  }, [receipt, deployedTokenAddress, address, publicClient, navigate, selectedChainId, t]);

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Coins className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">{t('deployToken.title')}</h1>
            </div>
            <p className="text-gray-400">{t('deployToken.description')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">{t('deployToken.tokenInfo')}</CardTitle>
                  <CardDescription className="text-gray-400">{t('deployToken.tokenInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {!isConnected && (
                    <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm text-yellow-400">{t('common.connectWallet')}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="chain" className="text-gray-300">{t('deployToken.selectChain')} <span className="text-red-400">*</span></Label>
                    <select id="chain" value={selectedChainId} onChange={(e) => handleChainChange(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500">
                      <option value={CHAIN_IDS.SEPOLIA}>{t('deployToken.ethereumSepolia')}</option>
                    </select>
                    <p className="text-xs text-gray-500">{t('deployToken.chainHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo" className="text-gray-300">{t('deployToken.tokenLogo')}</Label>
                    {logoPreview ? (
                      <div className="relative">
                        <img src={logoPreview} alt="Logo preview" className="w-32 h-32 object-cover rounded-lg border border-gray-700" />
                        <button type="button" onClick={handleRemoveLogo} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
                          <X className="h-4 w-4 text-white" />
                        </button>
                        {isUploading && <div className="mt-2 flex items-center space-x-2 text-sm text-yellow-400"><Loader2 className="h-4 w-4 animate-spin" /><span>{t('common.uploading')}</span></div>}
                        {!isUploading && logoR2Key && <p className="text-xs text-green-400 mt-2">{t('common.uploaded')}</p>}
                        {!isUploading && !logoR2Key && isConnected && <p className="text-xs text-gray-400 mt-2">{t('common.waitingUpload')}</p>}
                        {!isUploading && !logoR2Key && !isConnected && <p className="text-xs text-yellow-400 mt-2">{t('common.connectWalletToUpload')}</p>}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                        <input type="file" id="logo" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <label htmlFor="logo" className="cursor-pointer flex flex-col items-center space-y-2">
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-400">{t('common.selectImage')}</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">{t('deployToken.tokenName')} <span className="text-red-400">*</span></Label>
                    <Input id="name" placeholder={t('deployToken.tokenNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-gray-300">{t('deployToken.tokenSymbol')} <span className="text-red-400">*</span></Label>
                    <Input id="symbol" placeholder={t('deployToken.tokenSymbolPlaceholder')} value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500" maxLength={10} />
                    <p className="text-xs text-gray-500">{t('deployToken.tokenSymbolHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supply" className="text-gray-300">{t('deployToken.totalSupply')} <span className="text-red-400">*</span></Label>
                    <Input id="supply" type="number" placeholder={t('deployToken.totalSupplyPlaceholder')} value={supply} onChange={(e) => setSupply(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500" />
                    <p className="text-xs text-gray-500">{t('deployToken.totalSupplyHint')}</p>
                  </div>

                  {writeError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <span className="text-sm text-red-400">{writeError.message.includes('rejected') ? t('common.userCancelled') : writeError.message}</span>
                    </div>
                  )}

                  {receipt && receipt.transactionHash && !deployedTokenAddress && (
                    <div className="flex items-center space-x-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-400 font-medium">{t('deployToken.deployConfirmed')}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">{receipt.transactionHash}</p>
                      </div>
                    </div>
                  )}

                  {deployedTokenAddress && (
                    <div className="flex items-center space-x-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm text-green-400 font-medium">{t('deployToken.deploySuccess')}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">{t('deployToken.tokenAddress')}: {deployedTokenAddress}</p>
                      </div>
                    </div>
                  )}

                  <Button onClick={handleDeploy} disabled={!isConnected || isWriting || isConfirming || !name || !symbol || !supply || !!deployedTokenAddress}
                    className="w-full bg-green-500 hover:bg-green-600 text-white glow-green" size="lg">
                    {isWriting || isConfirming ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{isWriting ? t('common.sendingTransaction') : t('common.waitingConfirmation')}</>
                    ) : deployedTokenAddress ? (
                      <><CheckCircle className="mr-2 h-5 w-5" />{t('common.deployed')}</>
                    ) : (
                      <><Wallet className="mr-2 h-5 w-5" />{t('deployToken.payAndDeploy', { amount: formatAmount(PRICE, TOKEN_DECIMALS) })}</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">{t('deployToken.deployHint')}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Info className="h-5 w-5 text-green-400" />
                    <span>{t('deployToken.feeInfo')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">{t('deployToken.deployFee')}</p>
                    <p className="text-3xl font-bold text-green-400">{formatAmount(PRICE, TOKEN_DECIMALS)} Token</p>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 leading-relaxed">{t('deployToken.feeDesc')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">{t('deployToken.notes')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-start space-x-2"><span className="text-green-400">•</span><span>{t('deployToken.note1')}</span></div>
                  <div className="flex items-start space-x-2"><span className="text-green-400">•</span><span>{t('deployToken.note2')}</span></div>
                  <div className="flex items-start space-x-2"><span className="text-green-400">•</span><span>{t('deployToken.note3')}</span></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

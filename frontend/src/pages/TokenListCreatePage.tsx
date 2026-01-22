import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { CONTRACTS } from '@/config/contracts';
import { formatAmount } from '@/lib/utils';
import { createSIWEMessage, generateNonce } from '@/lib/siwe';
import { useSignMessage } from 'wagmi';
import { Loader2, AlertCircle, Wallet, Info, Coins, CheckCircle, Upload, X } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { CHAIN_IDS } from '@/config/chains';
import { useLanguage } from '@/hooks/useLanguage';

const PRICING = { TOKEN_LISTING: '1' } as const;
const TOKEN_DECIMALS = 6;
const PRICE = BigInt(PRICING.TOKEN_LISTING) * BigInt(10 ** TOKEN_DECIMALS);

export function TokenListCreatePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [selectedChainId, setSelectedChainId] = useState<number>(CHAIN_IDS.SEPOLIA);
  const [tokenAddress, setTokenAddress] = useState('');
  const [paymentTxHash, setPaymentTxHash] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoR2Key, setLogoR2Key] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync: writeUSDTAsync, data: usdtHash, isPending: isUSDTWriting, error: writeError } = useWriteContract();
  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({ hash: usdtHash });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert(t('common.selectImageFile')); return; }
      if (file.size > 5 * 1024 * 1024) { alert(t('common.fileTooLarge')); return; }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);

      if (isConnected && address) {
        try {
          setIsUploading(true);
          const response = await apiClient.uploadFile(file);
          if (response.success && response.data) { setLogoR2Key(response.data.key); }
          else { alert(response.error || t('common.uploadFailed')); setLogoFile(null); setLogoPreview(null); }
        } catch { alert(t('common.uploadFailed')); setLogoFile(null); setLogoPreview(null); }
        finally { setIsUploading(false); }
      }
    }
  };

  useEffect(() => {
    const autoUpload = async () => {
      if (logoFile && !logoR2Key && isConnected && address && !isUploading) {
        try {
          setIsUploading(true);
          const response = await apiClient.uploadFile(logoFile);
          if (response.success && response.data) { setLogoR2Key(response.data.key); }
        } catch {} finally { setIsUploading(false); }
      }
    };
    autoUpload();
  }, [logoFile, logoR2Key, isConnected, address, isUploading]);

  const handleRemoveLogo = () => { setLogoFile(null); setLogoPreview(null); setLogoR2Key(null); };

  const handleChainChange = async (newChainId: number) => {
    setSelectedChainId(newChainId);
    if (switchChain && chainId !== newChainId) {
      try { await switchChain({ chainId: newChainId }); }
      catch { alert(t('errors.manualSwitchChain')); }
    }
  };

  useEffect(() => {
    if (receipt && receipt.transactionHash && !paymentTxHash) {
      setPaymentTxHash(receipt.transactionHash);
    }
  }, [receipt, paymentTxHash]);

  const handlePaymentAndSubmit = async () => {
    if (!tokenAddress) { alert(t('token.fillTokenAddress')); return; }
    if (!isConnected || !address) { alert(t('common.connectWallet')); return; }
    if (chainId !== selectedChainId) { alert(t('deployToken.switchNetwork', { network: selectedChainId === CHAIN_IDS.SEPOLIA ? t('deployToken.ethereumSepolia') : '' })); return; }

    try {
      const nonce = generateNonce();
      const message = await createSIWEMessage(address, selectedChainId, window.location.host, nonce);
      const signature = await signMessageAsync({ message });
      const loginResponse = await apiClient.login(message, signature);
      if (!loginResponse.success || !loginResponse.data?.token) { throw new Error(loginResponse.error || t('errors.loginFailed')); }

      sessionStorage.setItem('pendingTokenSubmission', JSON.stringify({ tokenAddress, logoR2Key: logoR2Key || undefined, chainId: selectedChainId }));

      const usdtAddress = CONTRACTS.USDT[selectedChainId as keyof typeof CONTRACTS.USDT];
      if (!usdtAddress || usdtAddress === '') { alert(t('errors.chainNotSupported')); return; }
      const paymentReceiver = CONTRACTS.PAYMENT_RECEIVER;
      if (!paymentReceiver || paymentReceiver === '') { alert(t('errors.paymentReceiverNotConfigured')); return; }
      if (chainId !== selectedChainId) { alert(t('errors.switchToChain', { chainId: selectedChainId })); return; }

      await writeUSDTAsync({
        address: usdtAddress as `0x${string}`,
        chainId: selectedChainId,
        abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'transfer',
        args: [paymentReceiver as `0x${string}`, PRICE],
      });
    } catch (error: any) {
      sessionStorage.removeItem('pendingTokenSubmission');
      if (error?.message?.includes('rejected')) { alert(t('common.userCancelled')); }
      else { alert(`${t('common.paymentFailed')}: ${error?.message || ''}`); }
    }
  };

  useEffect(() => {
    const autoSubmit = async () => {
      if (receipt && receipt.transactionHash && !paymentTxHash) {
        const txHash = receipt.transactionHash;
        setPaymentTxHash(txHash);
        const pendingData = sessionStorage.getItem('pendingTokenSubmission');
        if (!pendingData) return;

        try {
          const { tokenAddress: savedTokenAddress, logoR2Key: savedLogoR2Key, chainId: savedChainId } = JSON.parse(pendingData);
          const response = await apiClient.listToken({ chainId: savedChainId || selectedChainId, tokenAddress: savedTokenAddress, paymentTxHash: txHash, logoR2Key: savedLogoR2Key });
          sessionStorage.removeItem('pendingTokenSubmission');
          if (response.success) { alert('支付成功！代币已收录。'); navigate('/tokens'); }
          else { alert(response.error || '收录失败，但支付已成功。'); }
        } catch (error: any) {
          sessionStorage.removeItem('pendingTokenSubmission');
          alert(`支付成功！但收录失败: ${error?.message || ''}`);
        }
      }
    };
    autoSubmit();
  }, [receipt, paymentTxHash, navigate, selectedChainId]);

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Coins className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-sm text-gray-400 tracking-wide">代币收录</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="neon-text">{t('token.createTitle')}</span>
            </h1>
            <p className="text-gray-500 text-lg">{t('token.createDesc')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 左侧表单 */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white">{t('token.tokenInfo')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('token.tokenInfoDesc')}</p>
                </div>
                <div className="p-6 space-y-6">
                  {!isConnected && (
                    <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm text-yellow-400">{t('common.connectWallet')}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="chain" className="text-gray-300">{t('deployToken.selectChain')} <span className="text-blue-400">*</span></Label>
                    <select id="chain" value={selectedChainId} onChange={(e) => handleChainChange(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-colors">
                      <option value={CHAIN_IDS.SEPOLIA}>{t('deployToken.ethereumSepolia')}</option>
                    </select>
                    <p className="text-xs text-gray-500">{t('deployToken.chainHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo" className="text-gray-300">{t('token.tokenLogo')}</Label>
                    {logoPreview ? (
                      <div className="relative inline-block">
                        <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                        <button type="button" onClick={handleRemoveLogo} className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
                          <X className="h-3 w-3 text-white" />
                        </button>
                        {isUploading && <div className="mt-2 flex items-center space-x-2 text-sm text-yellow-400"><Loader2 className="h-4 w-4 animate-spin" /><span>{t('common.uploading')}</span></div>}
                        {!isUploading && logoR2Key && <p className="text-xs text-emerald-400 mt-2">{t('common.uploaded')}</p>}
                      </div>
                    ) : (
                      <div className="border border-dashed border-white/10 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors">
                        <input type="file" id="logo" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <label htmlFor="logo" className="cursor-pointer flex flex-col items-center space-y-2">
                          <Upload className="h-8 w-8 text-gray-500" />
                          <span className="text-sm text-gray-500">{t('common.selectImage')}</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tokenAddress" className="text-gray-300">{t('token.tokenAddress')} <span className="text-blue-400">*</span></Label>
                    <Input id="tokenAddress" placeholder={t('token.tokenAddressPlaceholder')} value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 rounded-xl h-12 font-mono" />
                    {tokenAddress && (
                      <a href={`https://sepolia.etherscan.io/address/${tokenAddress}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline">{t('common.viewContract')}</a>
                    )}
                  </div>
                </div>
              </div>

              {/* 支付按钮 */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">{t('token.payAndSubmit')}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {usdtHash && !receipt && (
                    <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-400 font-medium">{t('common.transactionSent')}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1 break-all">{usdtHash}</p>
                      </div>
                    </div>
                  )}

                  {paymentTxHash && (
                    <div className="flex items-center space-x-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <div className="flex-1">
                        <p className="text-sm text-emerald-400 font-medium">{t('common.paymentSuccess')}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1 break-all">{t('token.txHash')}: {paymentTxHash}</p>
                        <p className="text-xs text-gray-600 mt-1">{t('token.paymentReceiver')}: {CONTRACTS.PAYMENT_RECEIVER}</p>
                      </div>
                    </div>
                  )}

                  {writeError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <span className="text-sm text-red-400">{writeError.message?.includes('rejected') ? t('common.userCancelled') : writeError.message}</span>
                    </div>
                  )}

                  <Button onClick={handlePaymentAndSubmit} disabled={!isConnected || isUSDTWriting || isUSDTConfirming || !tokenAddress || !!paymentTxHash}
                    className="w-full btn-gradient text-white rounded-xl h-12 font-semibold" size="lg">
                    {isUSDTWriting || isUSDTConfirming ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{isUSDTWriting ? t('common.sendingTransaction') : t('common.waitingConfirmation')}</>
                    ) : paymentTxHash ? (
                      <><CheckCircle className="mr-2 h-5 w-5" />{t('common.submitted')}</>
                    ) : (
                      <><Wallet className="mr-2 h-5 w-5" />{t('token.payAndSubmitBtn', { amount: formatAmount(PRICE, TOKEN_DECIMALS) })}</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">{t('token.submitHint')}</p>
                </div>
              </div>
            </div>

            {/* 右侧信息 */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border-blue-500/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Info className="h-5 w-5 text-blue-400" />
                  <h3 className="text-white font-semibold">{t('token.feeInfo')}</h3>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">{t('token.listingFee')}</p>
                  <p className="text-3xl font-bold neon-text">{formatAmount(PRICE, TOKEN_DECIMALS)} Token</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 leading-relaxed">{t('token.feeDesc')}</p>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">{t('token.notes')}</h3>
                <div className="space-y-3 text-sm text-gray-500">
                  <div className="flex items-start space-x-2"><span className="text-blue-400">•</span><span>{t('token.note1')}</span></div>
                  <div className="flex items-start space-x-2"><span className="text-blue-400">•</span><span>{t('token.note2')}</span></div>
                  <div className="flex items-start space-x-2"><span className="text-blue-400">•</span><span>{t('token.note3')}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

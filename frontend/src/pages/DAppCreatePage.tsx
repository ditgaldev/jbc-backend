import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useNavigate } from 'react-router-dom';
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
import { useLanguage } from '@/hooks/useLanguage';

const PRICING = { DAPP_LISTING: '1' } as const;
const TOKEN_DECIMALS = 6;
const PRICE = BigInt(PRICING.DAPP_LISTING) * BigInt(10 ** TOKEN_DECIMALS);

export function DAppCreatePage() {
  const { t } = useLanguage();
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
  const { writeContractAsync: writeUSDTAsync, data: usdtHash, isPending: isUSDTWriting, error: writeError, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isUSDTConfirming, data: receipt } = useWaitForTransactionReceipt({ hash: usdtHash });

  useEffect(() => {
    if (receipt && receipt.transactionHash && !paymentTxHash) {
      setPaymentTxHash(receipt.transactionHash);
    }
  }, [receipt, paymentTxHash]);

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

  const handlePaymentAndSubmit = async () => {
    if (!name || !url || !category) { alert(t('dapp.fillRequired')); return; }
    if (!isConnected || !address || !chainId) { alert(t('common.connectWallet')); return; }
    if (writeError) { resetWriteContract(); }

    try {
      const nonce = generateNonce();
      const message = await createSIWEMessage(address, chainId, window.location.host, nonce);
      const signature = await signMessageAsync({ message });
      const loginResponse = await apiClient.login(message, signature);
      if (!loginResponse.success || !loginResponse.data?.token) { throw new Error(loginResponse.error || t('errors.loginFailed')); }

      sessionStorage.setItem('pendingDAppSubmission', JSON.stringify({ name, description, url, category, logoR2Key: logoR2Key || undefined }));

      const usdtAddress = CONTRACTS.USDT[chainId as keyof typeof CONTRACTS.USDT];
      if (!usdtAddress || usdtAddress === '') { alert(t('errors.chainNotSupported')); return; }
      const paymentReceiver = CONTRACTS.PAYMENT_RECEIVER;
      if (!paymentReceiver || paymentReceiver === '') { alert(t('errors.paymentReceiverNotConfigured')); return; }
      if (!writeUSDTAsync || typeof writeUSDTAsync !== 'function') { throw new Error(t('errors.walletNotConnected')); }

      await writeUSDTAsync({
        address: usdtAddress as `0x${string}`,
        abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'transfer',
        args: [paymentReceiver as `0x${string}`, PRICE],
      });
    } catch (error: any) {
      sessionStorage.removeItem('pendingDAppSubmission');
      if (error?.message?.includes('rejected') || error?.code === 4001) { alert(t('common.userCancelled')); }
      else { alert(`${t('common.paymentFailed')}: ${error?.message || ''}`); }
    }
  };

  useEffect(() => {
    const autoSubmit = async () => {
      if (receipt && receipt.transactionHash && !paymentTxHash) {
        const txHash = receipt.transactionHash;
        setPaymentTxHash(txHash);
        const pendingData = sessionStorage.getItem('pendingDAppSubmission');
        if (!pendingData) return;

        try {
          const { name: savedName, description: savedDescription, url: savedUrl, category: savedCategory, logoR2Key: savedLogoR2Key } = JSON.parse(pendingData);
          const response = await apiClient.createDApp({ name: savedName, description: savedDescription, url: savedUrl, category: savedCategory, paymentTxHash: txHash, logoR2Key: savedLogoR2Key });
          sessionStorage.removeItem('pendingDAppSubmission');
          if (response.success) { alert('支付成功！DApp 已提交，等待管理员审核。'); navigate('/dapps'); }
          else { alert(response.error || '提交失败，但支付已成功。'); }
        } catch (error: any) {
          sessionStorage.removeItem('pendingDAppSubmission');
          alert(`支付成功！但提交失败: ${error?.message || ''}`);
        }
      }
    };
    autoSubmit();
  }, [receipt, paymentTxHash, navigate]);

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Globe className="h-5 w-5 text-indigo-400 mr-2" />
              <span className="text-sm text-gray-400 tracking-wide">DApp 入驻</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="neon-text">{t('dapp.createTitle')}</span>
            </h1>
            <p className="text-gray-500 text-lg">{t('dapp.createDesc')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 左侧表单 */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-xl font-semibold text-white">{t('dapp.dappInfo')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('dapp.dappInfoDesc')}</p>
                </div>
                <div className="p-6 space-y-6">
                  {!isConnected && (
                    <div className="flex items-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm text-yellow-400">{t('common.connectWallet')}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">{t('dapp.dappName')} <span className="text-indigo-400">*</span></Label>
                    <Input id="name" placeholder={t('dapp.dappNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 rounded-xl h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">{t('dapp.dappDescription')}</Label>
                    <textarea id="description" placeholder={t('dapp.dappDescriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url" className="text-gray-300">{t('dapp.dappUrl')} <span className="text-indigo-400">*</span></Label>
                    <Input id="url" type="url" placeholder={t('dapp.dappUrlPlaceholder')} value={url} onChange={(e) => setUrl(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 rounded-xl h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-300">{t('dapp.dappCategory')} <span className="text-indigo-400">*</span></Label>
                    <Input id="category" placeholder={t('dapp.dappCategoryPlaceholder')} value={category} onChange={(e) => setCategory(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500/50 rounded-xl h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo" className="text-gray-300">{t('dapp.dappLogo')}</Label>
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
                      <div className="border border-dashed border-white/10 rounded-xl p-6 text-center hover:border-indigo-500/50 transition-colors">
                        <input type="file" id="logo" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <label htmlFor="logo" className="cursor-pointer flex flex-col items-center space-y-2">
                          <Upload className="h-8 w-8 text-gray-500" />
                          <span className="text-sm text-gray-500">{t('common.selectImage')}</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 支付按钮 */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-xl font-semibold text-white">{t('dapp.payAndSubmit')}</h2>
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
                        <p className="text-xs text-gray-500 font-mono mt-1 break-all">{paymentTxHash}</p>
                      </div>
                    </div>
                  )}

                  {writeError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <span className="text-sm text-red-400">{writeError.message?.includes('rejected') ? t('common.userCancelled') : writeError.message}</span>
                    </div>
                  )}

                  <Button onClick={handlePaymentAndSubmit} disabled={!isConnected || isUSDTWriting || isUSDTConfirming || !name || !url || !category || !!paymentTxHash}
                    className="w-full btn-gradient text-white rounded-xl h-12 font-semibold" size="lg">
                    {isUSDTWriting || isUSDTConfirming ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{isUSDTWriting ? t('common.sendingTransaction') : t('common.waitingConfirmation')}</>
                    ) : paymentTxHash ? (
                      <><CheckCircle className="mr-2 h-5 w-5" />{t('common.submitted')}</>
                    ) : (
                      <><Wallet className="mr-2 h-5 w-5" />{t('dapp.payAndSubmitBtn', { amount: formatAmount(PRICE, TOKEN_DECIMALS) })}</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">{t('dapp.submitHint')}</p>
                </div>
              </div>
            </div>

            {/* 右侧信息 */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border-indigo-500/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Info className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-white font-semibold">{t('dapp.feeInfo')}</h3>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">{t('dapp.listingFee')}</p>
                  <p className="text-3xl font-bold neon-text">{formatAmount(PRICE, TOKEN_DECIMALS)} Token</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 leading-relaxed">{t('dapp.feeDesc')}</p>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">{t('dapp.notes')}</h3>
                <div className="space-y-3 text-sm text-gray-500">
                  <div className="flex items-start space-x-2"><span className="text-indigo-400">•</span><span>{t('dapp.note1')}</span></div>
                  <div className="flex items-start space-x-2"><span className="text-indigo-400">•</span><span>{t('dapp.note2')}</span></div>
                  <div className="flex items-start space-x-2"><span className="text-indigo-400">•</span><span>{t('dapp.note3')}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

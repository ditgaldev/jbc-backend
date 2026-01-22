import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, ExternalLink, Star, Globe } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { useLanguage } from '@/hooks/useLanguage';

export function DAppListPage() {
  const { t } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dapps'],
    queryFn: async () => {
      const response = await apiClient.getDApps({ status: 'active' });
      return response.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <GeometricPattern />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <GeometricPattern />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-20 text-red-400">{t('common.paymentFailed')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <GeometricPattern />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 页面标题 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
                <Globe className="h-5 w-5 text-indigo-400 mr-2" />
                <span className="text-sm text-gray-400 tracking-wide">DApp 生态</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="neon-text">{t('dapp.listTitle')}</span>
              </h1>
              <p className="text-gray-500 mt-2">{t('dapp.listDesc')}</p>
            </div>
            <Link to="/dapps/create">
              <Button className="btn-gradient text-white rounded-xl px-6">
                <Plus className="mr-2 h-4 w-4" />
                {t('dapp.submitDapp')}
              </Button>
            </Link>
          </div>

          {data && Array.isArray(data) && data.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.map((dapp: any) => (
                <div key={dapp.id} className="glass-card rounded-2xl p-6 group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {dapp.name}
                      </h3>
                      <p className="text-sm text-gray-500">{dapp.category}</p>
                    </div>
                    {dapp.is_featured && (
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  
                  {dapp.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{dapp.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs text-gray-600">{formatDate(dapp.created_at)}</span>
                    <a
                      href={dapp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center transition-colors"
                    >
                      {t('common.visit')}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-16 text-center">
              <Globe className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-6">{t('dapp.noDapps')}</p>
              <Link to="/dapps/create">
                <Button className="btn-gradient text-white rounded-xl">
                  {t('common.beFirstSubmitter')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

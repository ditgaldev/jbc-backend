import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            <p className="mt-4 text-gray-400">{t('common.loading')}</p>
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
          <div className="text-center py-12 text-red-400">{t('common.paymentFailed')}</div>
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="h-8 w-8 text-green-400" />
                <h1 className="text-4xl font-bold text-white">{t('dapp.listTitle')}</h1>
              </div>
              <p className="text-gray-400">{t('dapp.listDesc')}</p>
            </div>
            <Link to="/dapps/create">
              <Button className="bg-green-500 hover:bg-green-600 text-white glow-green">
                <Plus className="mr-2 h-4 w-4" />
                {t('dapp.submitDapp')}
              </Button>
            </Link>
          </div>

          {data && Array.isArray(data) && data.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.map((dapp: any) => (
                <Card
                  key={dapp.id}
                  className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-all hover:glow-green cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white">{dapp.name}</CardTitle>
                      {dapp.is_featured && (
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <CardDescription className="text-gray-400">
                      {dapp.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dapp.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {dapp.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <span className="text-xs text-gray-500">
                        {formatDate(dapp.created_at)}
                      </span>
                      <a
                        href={dapp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-400 hover:text-green-300 flex items-center transition-colors"
                      >
                        {t('common.visit')}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-16 text-center">
                <Globe className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">{t('dapp.noDapps')}</p>
                <Link to="/dapps/create">
                  <Button className="bg-green-500 hover:bg-green-600 text-white">
                    {t('common.beFirstSubmitter')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

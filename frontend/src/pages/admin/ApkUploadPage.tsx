import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { Upload, X, Download, Trash2, Loader2, Package } from 'lucide-react';
import { GeometricPattern } from '@/components/GeometricPattern';
import { formatDate, formatFileSize } from '@/lib/utils';

interface ApkFile {
  id: number;
  name: string;
  fileName: string;
  fileSize: number;
  version?: string;
  description?: string;
  downloadUrl: string;
  uploadedAt: number;
  uploadedBy: string;
}

export function ApkUploadPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 获取 APK 文件列表
  const { data: apkFiles, isLoading } = useQuery({
    queryKey: ['admin-apk-files'],
    queryFn: async () => {
      const response = await apiClient.getApkFiles();
      if (!response.success || !response.data) {
        return [] as ApkFile[];
      }
      // 映射后端数据到前端格式
      return (response.data as any[]).map((file: any) => ({
        id: file.id,
        name: file.name,
        fileName: file.file_name,
        fileSize: file.file_size,
        version: file.version,
        description: file.description,
        downloadUrl: file.download_url,
        uploadedAt: file.uploaded_at,
        uploadedBy: file.uploaded_by,
      })) as ApkFile[];
    },
  });

  // 上传 APK 文件
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        // 上传文件（带进度回调）
        const uploadResponse = await apiClient.uploadApkFile(
          file,
          {
            name: fileName || file.name,
            version: version || undefined,
            description: description || undefined,
          },
          (progress) => {
            setUploadProgress(progress);
          }
        );

        if (!uploadResponse.success) {
          throw new Error(uploadResponse.error || '上传失败');
        }

        return uploadResponse.data;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apk-files'] });
      // 重置表单
      setSelectedFile(null);
      setFileName('');
      setVersion('');
      setDescription('');
      alert('APK 文件上传成功！');
    },
    onError: (error: any) => {
      alert(`上传失败: ${error.message || '未知错误'}`);
    },
  });

  // 删除 APK 文件
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.deleteApkFile(id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apk-files'] });
      alert('APK 文件删除成功！');
    },
    onError: (error: any) => {
      alert(`删除失败: ${error.message || '未知错误'}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.name.endsWith('.apk')) {
        alert('请选择 APK 文件');
        return;
      }

      setSelectedFile(file);
      if (!fileName) {
        setFileName(file.name.replace('.apk', ''));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('请选择要上传的 APK 文件');
      return;
    }

    if (!fileName.trim()) {
      alert('请输入文件名称');
      return;
    }

    if (!version.trim()) {
      alert('请输入版本号');
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const handleDelete = (id: number) => {
    if (!confirm('确定要删除这个 APK 文件吗？')) {
      return;
    }

    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <GeometricPattern />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="text-center py-12">加载中...</div>
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
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Package className="h-8 w-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white">APK 文件管理</h1>
            </div>
            <p className="text-gray-400">上传和管理 APK 文件</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 左侧：上传表单 */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-green-400" />
                  <span>上传 APK 文件</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  上传 APK 文件
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文件选择 */}
                <div>
                  <Label htmlFor="apk-file" className="text-sm font-medium mb-2 text-gray-300">
                    选择 APK 文件
                  </Label>
                  <Input
                    id="apk-file"
                    type="file"
                    accept=".apk"
                    onChange={handleFileSelect}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <div className="mt-2 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="text-sm text-white">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* 文件名称 */}
                <div>
                  <Label htmlFor="file-name" className="text-sm font-medium mb-2 text-gray-300">
                    文件名称 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="file-name"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="例如：MyApp"
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={isUploading}
                  />
                </div>

                {/* 版本号 */}
                <div>
                  <Label htmlFor="version" className="text-sm font-medium mb-2 text-gray-300">
                    版本号 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="version"
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="例如：1.0.0"
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={isUploading}
                  />
                </div>

                {/* 描述 */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium mb-2 text-gray-300">
                    描述（可选）
                  </Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="文件描述..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isUploading}
                  />
                </div>

                {/* 上传进度 */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>上传中...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 上传按钮 */}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !fileName.trim() || !version.trim() || isUploading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      上传 APK
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 右侧：文件列表 */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">已上传的 APK 文件</CardTitle>
                <CardDescription className="text-gray-400">
                  {apkFiles?.length || 0} 个文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                {apkFiles && apkFiles.length > 0 ? (
                  <div className="space-y-3">
                    {apkFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Package className="h-5 w-5 text-green-400" />
                              <h3 className="text-white font-medium">{file.name}</h3>
                              {file.version && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                  v{file.version}
                                </span>
                              )}
                            </div>
                            {file.description && (
                              <p className="text-sm text-gray-400 mb-2">{file.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.downloadUrl, '_blank')}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(file.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无 APK 文件</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


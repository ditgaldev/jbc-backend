import { API_BASE_URL } from '@/config/contracts';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API 客户端
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    console.log('[API] Initializing ApiClient with baseUrl:', baseUrl);
    this.baseUrl = baseUrl;
    if (!this.baseUrl || this.baseUrl === 'undefined') {
      console.error('[API] WARNING: baseUrl is invalid:', this.baseUrl);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // 确保 baseUrl 和 endpoint 正确拼接
      const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${baseUrl}${path}`;
      
      console.log('[API] Request URL:', url);
      console.log('[API] Base URL:', this.baseUrl);
      console.log('[API] Endpoint:', endpoint);
      console.log('[API] Options:', { method: options.method, headers: options.headers, body: options.body });
      
      if (!url || url === 'undefined' || !url.startsWith('http')) {
        const errorMsg = `Invalid API URL: ${url}. Please check API_BASE_URL configuration.`;
        console.error('[API] URL validation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      // 构建 headers，过滤掉 undefined 值
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // 合并传入的 headers，过滤掉 undefined 和空字符串
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            if (value !== undefined && value !== null && value !== '') {
              headers[key] = value;
            }
          });
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              headers[key] = value;
            }
          });
        } else {
          Object.entries(options.headers).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              headers[key] = value as string;
            }
          });
        }
      }

      // 构建 clean 的 options 对象
      const cleanOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
      };

      // 只有当 body 存在且不是 undefined/null 时才添加
      if (options.body !== undefined && options.body !== null) {
        cleanOptions.body = options.body;
      }

      console.log('[API] Final headers:', headers);
      console.log('[API] Final options:', cleanOptions);
      console.log('[API] Making fetch request to:', url);

      const response = await fetch(url, cleanOptions);

      console.log('[API] Response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('[API] Response data:', data);

      if (!response.ok) {
        console.error('[API] Request failed:', data);
        return {
          success: false,
          error: data.error || 'Request failed',
        };
      }

      return data;
    } catch (error) {
      console.error('[API] Request error:', error);
      console.error('[API] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint,
        baseUrl: this.baseUrl,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 获取 JWT token（从 localStorage）
  private getJWTToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  // 保存 JWT token
  private setJWTToken(token: string): void {
    localStorage.setItem('jwt_token', token);
  }

  // 清除 JWT token
  private clearJWTToken(): void {
    localStorage.removeItem('jwt_token');
  }

  // 带认证的请求（使用 JWT）
  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    jwtToken?: string
  ): Promise<ApiResponse<T>> {
    // 构建 headers，确保没有 undefined 值
    const headers: Record<string, string> = {};

    // 复制现有的 headers
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          if (value !== undefined && value !== null && value !== '') {
            headers[key] = value;
          }
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            headers[key] = value;
          }
        });
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            headers[key] = value as string;
          }
        });
      }
    }

    // 添加 Authorization header（使用 JWT）
    const token = jwtToken || this.getJWTToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[API] Using JWT token for authentication');
    } else {
      console.warn('[API] No JWT token available for authenticated request');
    }

    // 构建 clean 的 options 对象
    const cleanOptions: RequestInit = {
      method: options.method,
      headers,
    };

    // 只有当 body 存在且不是 undefined 时才添加
    if (options.body !== undefined && options.body !== null) {
      cleanOptions.body = options.body;
    }

    return this.request<T>(endpoint, cleanOptions);
  }

  // SIWE 登录（换取 JWT）
  async login(message: string, signature: string): Promise<ApiResponse<{ token: string; user: { address: string; role: string } }>> {
    const response = await this.request<{ token: string; user: { address: string; role: string } }>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });

    // 如果登录成功，保存 JWT token
    if (response.success && response.data?.token) {
      this.setJWTToken(response.data.token);
      console.log('[API] JWT token saved to localStorage');
    }

    return response;
  }

  // 登出（清除 JWT token）
  logout(): void {
    this.clearJWTToken();
    console.log('[API] JWT token cleared from localStorage');
  }

  // 获取当前用户信息（需要认证）
  async getCurrentUser() {
    return this.authenticatedRequest('/users/me', { method: 'GET' });
  }

  async getUser(address: string) {
    return this.request(`/users/${address}`, { method: 'GET' });
  }

  // DApp 相关 API
  async getDApps(filters?: {
    status?: string;
    category?: string;
    featured?: boolean;
    ownerAddress?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters?.ownerAddress) params.append('owner_address', filters.ownerAddress);

    const query = params.toString();
    return this.request(`/dapps${query ? `?${query}` : ''}`, { method: 'GET' });
  }

  async getDApp(id: number) {
    return this.request(`/dapps/${id}`, { method: 'GET' });
  }

  async createDApp(data: {
    name: string;
    description?: string;
    url: string;
    category: string;
    paymentTxHash: string;
    logoR2Key?: string;
  }) {
    return this.authenticatedRequest('/dapps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 上传文件
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    const token = this.getJWTToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 确保 URL 正确拼接
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const url = `${baseUrl}/upload`;

    if (!url || url === 'undefined' || !url.startsWith('http')) {
      throw new Error(`Invalid API URL: ${url}. Please check API_BASE_URL configuration.`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }

    return data;
  }

  async featureDApp(dappId: number, paymentTxHash: string, chainId: number) {
    return this.authenticatedRequest(`/dapps/${dappId}/feature`, {
      method: 'POST',
      body: JSON.stringify({ paymentTxHash, chainId }),
    });
  }

  // APK 文件相关 API
  async uploadApkFile(file: File, metadata?: { name?: string; version?: string; description?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.name) formData.append('name', metadata.name);
    if (metadata?.version) formData.append('version', metadata.version);
    if (metadata?.description) formData.append('description', metadata.description);

    const headers: HeadersInit = {};
    const token = this.getJWTToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const url = `${baseUrl}/admin/apk/upload`;

    if (!url || url === 'undefined' || !url.startsWith('http')) {
      throw new Error(`Invalid API URL: ${url}. Please check API_BASE_URL configuration.`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }

    return data;
  }

  async getApkFiles() {
    return this.authenticatedRequest('/admin/apk/files', { method: 'GET' });
  }

  async deleteApkFile(id: number) {
    return this.authenticatedRequest(`/admin/apk/files/${id}`, { method: 'DELETE' });
  }

  // 代币相关 API
  async getDeployedTokens(filters?: { chainId?: number; deployerAddress?: string }) {
    const params = new URLSearchParams();
    if (filters?.chainId) params.append('chain_id', String(filters.chainId));
    if (filters?.deployerAddress) params.append('deployer_address', filters.deployerAddress);

    const query = params.toString();
    return this.request(`/tokens/deployed${query ? `?${query}` : ''}`, { method: 'GET' });
  }

  async getListedTokens(filters?: {
    chainId?: number;
    submitterAddress?: string;
    pinned?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.chainId) params.append('chain_id', String(filters.chainId));
    if (filters?.submitterAddress) params.append('submitter_address', filters.submitterAddress);
    if (filters?.pinned !== undefined) params.append('pinned', String(filters.pinned));

    const query = params.toString();
    return this.request(`/tokens/listed${query ? `?${query}` : ''}`, { method: 'GET' });
  }

  async indexDeployedToken(data: {
    chainId: number;
    tokenAddress: string;
    deployerAddress: string;
    name: string;
    symbol: string;
    logoR2Key?: string;
    deployedAt: number;
  }) {
    return this.authenticatedRequest('/tokens/deployed', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listToken(data: {
    chainId: number;
    tokenAddress: string;
    paymentTxHash: string;
    logoR2Key?: string;
  }) {
    return this.authenticatedRequest('/tokens/list', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async pinToken(tokenId: number, paymentTxHash: string) {
    return this.authenticatedRequest(`/tokens/${tokenId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ paymentTxHash }),
    });
  }

  // 管理员相关 API
  async updateDAppStatus(dappId: number, status: 'pending' | 'active' | 'rejected') {
    return this.authenticatedRequest(`/admin/dapps/${dappId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateDAppSortOrder(dappId: number, sortOrder: number) {
    return this.authenticatedRequest(`/admin/dapps/${dappId}/sort-order`, {
      method: 'PUT',
      body: JSON.stringify({ sortOrder }),
    });
  }

  async updateDeployedTokenSortOrder(tokenAddress: string, sortOrder: number) {
    return this.authenticatedRequest(`/admin/tokens/deployed/${tokenAddress}/sort-order`, {
      method: 'PUT',
      body: JSON.stringify({ sortOrder }),
    });
  }

  async updateListedTokenSortOrder(tokenId: number, sortOrder: number) {
    return this.authenticatedRequest(`/admin/tokens/listed/${tokenId}/sort-order`, {
      method: 'PUT',
      body: JSON.stringify({ sortOrder }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);


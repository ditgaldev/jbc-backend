import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { DeployTokenPage } from './pages/DeployTokenPage';
import { DAppListPage } from './pages/DAppListPage';
import { DAppCreatePage } from './pages/DAppCreatePage';
import { TokenListPage } from './pages/TokenListPage';
import { TokenListCreatePage } from './pages/TokenListCreatePage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { DAppManagePage } from './pages/admin/DAppManagePage';
import { TokenManagePage } from './pages/admin/TokenManagePage';
import { ListedTokenManagePage } from './pages/admin/ListedTokenManagePage';
import { ApiDocPage } from './pages/admin/ApiDocPage';
import { ApkUploadPage } from './pages/admin/ApkUploadPage';

function App() {
  return (
    <Routes>
      {/* 前台路由（包含管理后台） */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="deploy-token" element={<DeployTokenPage />} />
        <Route path="dapps" element={<DAppListPage />} />
        <Route path="dapps/create" element={<DAppCreatePage />} />
        <Route path="tokens" element={<TokenListPage />} />
        <Route path="tokens/list" element={<TokenListCreatePage />} />
        
        {/* 管理后台路由（作为前台的一个功能模块） */}
        <Route path="admin" element={<DashboardPage />} />
        <Route path="admin/dapps" element={<DAppManagePage />} />
        <Route path="admin/tokens" element={<TokenManagePage />} />
        <Route path="admin/listed-tokens" element={<ListedTokenManagePage />} />
        <Route path="admin/apk-upload" element={<ApkUploadPage />} />
        <Route path="admin/api-doc" element={<ApiDocPage />} />
      </Route>
    </Routes>
  );
}

export default App;


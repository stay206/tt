﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams, useParams } from 'react-router-dom';
import { Download, X, RefreshCw } from 'lucide-react';
import { SetupPage } from '@/pages/SetupPage';
import { BooksPage } from '@/pages/BooksPage';
import { BookPage } from '@/pages/BookPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { GitHubConfig } from '@/types';
import { getAllGitHubConfigs, getGitHubConfig, getCurrentConfigId, setCurrentConfigId, getDeviceName, addGitHubConfig, getLatestRelease, compareVersions } from '@/utils/github';

const CURRENT_VERSION = '1.0.2';
const APP_REPO_OWNER = 'stay206';
const APP_REPO_NAME = 'tt';

function AppContent() {
  const [configs, setConfigs] = useState<GitHubConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<GitHubConfig | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState<{ version: string; downloadUrl: string; body: string } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // 启动时：优先从 URL 参数加载（分享链接场景），否则从 localStorage 加载
  useEffect(() => {
    const urlOwner = searchParams.get('owner');
    const urlRepo = searchParams.get('repo');
    const urlToken = searchParams.get('token');
    const urlBranch = searchParams.get('branch');

    const loadConfigs = () => {
      const allConfigs = getAllGitHubConfigs();
      setConfigs(allConfigs);
      const currentId = getCurrentConfigId();
      const current = allConfigs.find(c => c.id === currentId) || allConfigs[0] || null;
      setCurrentConfig(current);
    };

    if (urlOwner && urlRepo) {
      // 检查是否已有相同配置
      const existing = getAllGitHubConfigs().find(
        c => c.owner === urlOwner && c.repo === urlRepo
      );
      
      if (existing) {
        // 已有配置，切换到该配置
        setCurrentConfigId(existing.id);
        loadConfigs();
      } else {
        // 新配置，添加进去
        const newConfig = addGitHubConfig({
          name: `${urlOwner}/${urlRepo}`,
          owner: urlOwner,
          repo: urlRepo,
          token: urlToken || '',
          branch: urlBranch || 'main',
          isOwner: false,
        });
        setCurrentConfigId(newConfig.id);
        loadConfigs();
      }
      
      // 清理 URL 上的敏感信息
      const cleanParams = new URLSearchParams();
      setSearchParams(cleanParams, { replace: true });
    } else {
      loadConfigs();
    }

    setDeviceName(getDeviceName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 检查版本更新
  const checkUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const latest = await getLatestRelease(APP_REPO_OWNER, APP_REPO_NAME);
      if (latest && compareVersions(CURRENT_VERSION, latest.version)) {
        setLatestVersion(latest);
        setShowUpdateModal(true);
      }
    } catch {
      // 静默失败
    }
    setCheckingUpdate(false);
  };

  // 启动时检查更新（延迟 2 秒，不影响首屏加载）
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate();
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfigChange = () => {
    const allConfigs = getAllGitHubConfigs();
    if (allConfigs.length === 0) {
      setCurrentConfig(null);
    } else {
      setConfigs(allConfigs);
      const currentId = getCurrentConfigId();
      const current = allConfigs.find(c => c.id === currentId) || allConfigs[0];
      setCurrentConfig(current);
    }
  };

  const handleConfigAdded = () => {
    const allConfigs = getAllGitHubConfigs();
    setConfigs(allConfigs);
    const currentId = getCurrentConfigId();
    const current = allConfigs.find(c => c.id === currentId) || allConfigs[0] || null;
    setCurrentConfig(current);
  };

  const handleSwitchConfig = (configId: string) => {
    setCurrentConfigId(configId);
    const allConfigs = getAllGitHubConfigs();
    const current = allConfigs.find(c => c.id === configId) || null;
    setCurrentConfig(current);
  };

  if (!currentConfig) {
    return (
      <SetupPage
        onConfigured={handleConfigAdded}
      />
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <BooksPage
              configs={configs}
              currentConfig={currentConfig}
              deviceName={deviceName}
              onConfigChange={handleConfigChange}
              onSwitchConfig={handleSwitchConfig}
              onConfigAdded={handleConfigAdded}
            />
          }
        />
        <Route
          path="/book/:bookId"
          element={
            <BookPageWrapper
              deviceName={deviceName}
            />
          }
        />
        <Route
          path="/statistics/:bookId"
          element={<StatisticsPage config={currentConfig} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 更新提示弹窗 */}
      {showUpdateModal && latestVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">发现新版本</h2>
                    <p className="text-white/80 text-sm">v{CURRENT_VERSION} → v{latestVersion.version}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {latestVersion.body && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">更新内容</h3>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {latestVersion.body}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  稍后再说
                </button>
                <a
                  href={latestVersion.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  立即更新
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BookPageWrapper({ deviceName }: { deviceName: string }) {
  const { bookId } = useParams();
  const [config, setConfig] = useState<GitHubConfig | null>(null);

  useEffect(() => {
    const currentConfig = getGitHubConfig();
    setConfig(currentConfig);
  }, [bookId]);

  if (!config) {
    return <div>加载中...</div>;
  }

  return <BookPage config={config} deviceName={deviceName} />;
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;

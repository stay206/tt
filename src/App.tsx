﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams, useParams } from 'react-router-dom';
import { SetupPage } from '@/pages/SetupPage';
import { BooksPage } from '@/pages/BooksPage';
import { BookPage } from '@/pages/BookPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { GitHubConfig } from '@/types';
import { getAllGitHubConfigs, getGitHubConfig, getCurrentConfigId, setCurrentConfigId, getDeviceName, addGitHubConfig, cleanDuplicateConfigs } from '@/utils/github';

function AppContent() {
  const [configs, setConfigs] = useState<GitHubConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<GitHubConfig | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // 启动时：优先从 URL 参数加载（分享链接场景），否则从 localStorage 加载
  useEffect(() => {
    // 先清理掉 localStorage 中已存在的重复仓库配置
    cleanDuplicateConfigs();

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

  const handleConfigChange = () => {
    setCurrentConfig(null);
  };

  const handleRefreshConfigs = () => {
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
            onRefreshConfigs={handleRefreshConfigs}
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

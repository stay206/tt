﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { SetupPage } from '@/pages/SetupPage';
import { BooksPage } from '@/pages/BooksPage';
import { BookPage } from '@/pages/BookPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { GitHubConfig } from '@/types';
import { getGitHubConfig, setGitHubConfig, getDeviceName } from '@/utils/github';

function AppContent() {
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // 启动时：优先从 URL 参数加载（分享链接场景），否则从 localStorage 加载
  useEffect(() => {
    const urlOwner = searchParams.get('owner');
    const urlRepo = searchParams.get('repo');
    const urlToken = searchParams.get('token');
    const urlBranch = searchParams.get('branch');

    if (urlOwner && urlRepo) {
      const sharedConfig: GitHubConfig = {
        owner: urlOwner,
        repo: urlRepo,
        token: urlToken || '',
        branch: urlBranch || 'main',
      };
      setGitHubConfig(sharedConfig);
      setConfig(sharedConfig);
      // 清理 URL 上的敏感信息（仅保留 owner/repo/branch）
      const cleanParams = new URLSearchParams();
      cleanParams.set('owner', urlOwner);
      cleanParams.set('repo', urlRepo);
      if (urlBranch) cleanParams.set('branch', urlBranch);
      setSearchParams(cleanParams, { replace: true });
    } else {
      const saved = getGitHubConfig();
      if (saved) {
        setConfig(saved);
      }
    }

    setDeviceName(getDeviceName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) {
    return (
      <SetupPage
        onConfigured={() => {
          const c = getGitHubConfig();
          if (c) {
            setConfig(c);
          }
        }}
      />
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <BooksPage
            config={config}
            deviceName={deviceName}
            onConfigChange={() => {
              setConfig(null);
            }}
          />
        }
      />
      <Route
        path="/book/:bookId"
        element={
          <BookPage config={config} deviceName={deviceName} />
        }
      />
      <Route
        path="/statistics/:bookId"
        element={<StatisticsPage config={config} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;

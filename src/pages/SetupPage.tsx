﻿﻿import { useState, useEffect } from 'react';
import { Github, Eye, EyeOff, ArrowRight, Info, ExternalLink } from 'lucide-react';
import { GitHubConfig } from '@/types';
import { setGitHubConfig, getGitHubConfig, testConnection, getDeviceName, setDeviceName } from '@/utils/github';

interface SetupPageProps {
  onConfigured: () => void;
}

export const SetupPage = ({ onConfigured }: SetupPageProps) => {
  const [mode, setMode] = useState<'admin' | 'viewer'>('admin');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [branch, setBranch] = useState('main');
  const [showToken, setShowToken] = useState(false);
  const [deviceName, setDeviceNameState] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const config = getGitHubConfig();
    if (config) {
      setOwner(config.owner);
      setRepo(config.repo);
      setToken(config.token);
      setBranch(config.branch || 'main');
      setMode(config.token ? 'admin' : 'viewer');
    }
    setDeviceNameState(getDeviceName());
  }, []);

  const handleSave = async () => {
    if (!owner.trim() || !repo.trim()) {
      setError('请填写仓库所有者和仓库名');
      return;
    }

    setTesting(true);
    setError('');

    const config: GitHubConfig = {
      owner: owner.trim(),
      repo: repo.trim(),
      token: mode === 'admin' ? token.trim() : '',
      branch: branch.trim() || 'main',
    };

    const result = await testConnection(config);
    setTesting(false);

    if (!result.success) {
      setError(result.message || '连接失败');
      return;
    }

    setGitHubConfig(config);
    onConfigured();
  };

  const handleEnterViewer = async () => {
    if (!owner.trim() || !repo.trim()) {
      setError('请填写仓库所有者和仓库名');
      return;
    }

    setTesting(true);
    setError('');

    const config: GitHubConfig = {
      owner: owner.trim(),
      repo: repo.trim(),
      token: '',
      branch: branch.trim() || 'main',
    };

    const result = await testConnection(config);
    setTesting(false);

    if (!result.success) {
      setError(result.message || '无法访问该仓库，请确认是公开仓库或配置了 Token');
      return;
    }

    setGitHubConfig(config);
    onConfigured();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4">
            <Github className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            多人记账本
          </h1>
          <p className="text-gray-500 mt-2">通过 GitHub 仓库共享数据，无需注册登录</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${
              mode === 'admin' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            👤 管理员模式
          </button>
          <button
            type="button"
            onClick={() => setMode('viewer')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${
              mode === 'viewer' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            👥 访客模式
          </button>
        </div>

        {mode === 'admin' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            <p className="font-medium mb-1">管理员可执行所有操作</p>
            <p>需要 GitHub Personal Access Token（权限：<code>contents:write</code>）</p>
          </div>
        )}

        {mode === 'viewer' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
            <p className="font-medium mb-1">访客仅可查看数据</p>
            <p>无需任何凭证，仓库必须为公开仓库（GitHub Pages 默认公开）</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              GitHub 用户名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="例如：octocat"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              仓库名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="例如：expense-tracker-data"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">账本数据将存储在该仓库的 <code>data/</code> 目录下</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              分支
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {mode === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full pl-4 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <p>Token 仅存储在本地浏览器</p>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-500 hover:underline inline-flex items-center gap-1"
                >
                  获取 Token <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              我的显示名称
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => {
                setDeviceNameState(e.target.value);
                setDeviceName(e.target.value);
              }}
              placeholder="例如：小明、爸爸"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">添加记录时将显示该名称</p>
          </div>

          <button
            onClick={mode === 'admin' ? handleSave : handleEnterViewer}
            disabled={testing}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {testing ? (
              '连接中...'
            ) : (
              <>
                进入应用
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">工作原理</p>
              <p>• 管理员配置仓库后，所有账本数据保存到该仓库的 <code>data/</code> 目录</p>
              <p>• 其他用户通过「访客模式」打开同一仓库地址即可查看数据</p>
              <p>• 适合家庭/团队共用一个 GitHub 账号的场景</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
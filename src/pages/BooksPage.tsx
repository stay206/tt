﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Cloud, Trash2, Settings, Github, X, Edit, Check, Link, ChevronDown, PlusCircle, RefreshCw, Download } from 'lucide-react';
import { Book, BookIndex, GitHubConfig } from '@/types';
import { getBookIndex, getBook, saveBook, deleteBookFile, resetAllData, getAllGitHubConfigs, addGitHubConfig, setCurrentConfigId, testConnection, hashPassword, verifyPassword, removeGitHubConfig, getLatestRelease, compareVersions } from '@/utils/github';

const CURRENT_VERSION = '1.0.5';
const APP_REPO_OWNER = 'stay206';
const APP_REPO_NAME = 'tt';

interface BooksPageProps {
  configs: GitHubConfig[];
  currentConfig: GitHubConfig;
  deviceName: string;
  onConfigChange: () => void;
  onSwitchConfig: (configId: string) => void;
  onConfigAdded: () => void;
  onRefreshConfigs: () => void;
}

const BOOK_ICONS = ['📕', '📗', '📘', '📙', '📓', '📒', '📔', '📚', '💳', '💰', '💵', '💴', '💶', '💷', '🧾', '📋', '📝', '🏦', '💎', '⭐'];

interface BookWithConfig {
  book: BookIndex['books'][0];
  config: GitHubConfig;
}

export const BooksPage = ({ configs, currentConfig, deviceName, onConfigChange, onSwitchConfig, onConfigAdded, onRefreshConfigs }: BooksPageProps) => {
  const navigate = useNavigate();
  const [allBooks, setAllBooks] = useState<BookWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [message, setMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [newConfig, setNewConfig] = useState({ owner: '', repo: '', token: '', branch: 'main' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; downloadUrl: string } | null>(null);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const latest = await getLatestRelease(APP_REPO_OWNER, APP_REPO_NAME);
      if (latest && compareVersions(CURRENT_VERSION, latest.version)) {
        setUpdateInfo(latest);
      } else {
        alert('当前已是最新版本！');
      }
    } catch {
      alert('检查更新失败，请稍后再试');
    }
    setCheckingUpdate(false);
  };

  const loadAllBooks = async () => {
    setLoading(true);
    setError('');
    setAllBooks([]);
    try {
      const allConfigs = getAllGitHubConfigs();
      console.log('加载配置:', allConfigs);
      
      if (allConfigs.length === 0) {
        console.log('没有配置，跳过加载');
        setLoading(false);
        return;
      }
      
      const books: BookWithConfig[] = [];
      const failedConfigs: string[] = [];
      
      for (const config of allConfigs) {
        try {
          console.log(`正在加载仓库: ${config.owner}/${config.repo}, branch: ${config.branch || 'main'}`);
          const idx = await getBookIndex(config);
          console.log(`仓库 ${config.owner}/${config.repo} 的账本数量:`, idx.books.length);
          idx.books.forEach(book => {
            books.push({ book, config });
          });
        } catch (e: any) {
          console.error(`加载仓库 ${config.owner}/${config.repo} 失败:`, e);
          failedConfigs.push(`${config.owner}/${config.repo}`);
        }
      }
      
      // 按更新时间排序
      books.sort((a, b) => new Date(b.book.updatedAt).getTime() - new Date(a.book.updatedAt).getTime());
      setAllBooks(books);
      
      if (failedConfigs.length > 0) {
        setError(`以下仓库加载失败：${failedConfigs.join('、')}。请检查网络连接或仓库配置。`);
      }
    } catch (e: any) {
      setError(e.message || '加载账本列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.length]);

  const handleEnterBook = async (bookId: string, config: GitHubConfig) => {
    try {
      setCurrentConfigId(config.id);
      const book = await getBook(config, bookId);
      if (book) {
        localStorage.setItem(`current_book_cache_${bookId}`, JSON.stringify(book));
        navigate(`/book/${bookId}`);
      } else {
        setError('账本数据加载失败');
      }
    } catch (e: any) {
      setError(e.message || '加载账本失败');
    }
  };

  const handleDeleteBook = async (bookId: string, name: string, config: GitHubConfig) => {
    if (!window.confirm(`确定要删除账本「${name}」吗？此操作不可恢复！`)) return;

    const result = await deleteBookFile(config, bookId);
    if (result.success) {
      setMessage('账本已删除');
      await loadAllBooks();
    } else {
      setError(result.message || '删除失败');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleJoinInvite = async () => {
    if (!inviteLink.trim()) {
      setError('请输入邀请链接');
      return;
    }

    try {
      let owner = '';
      let repo = '';
      let token = '';
      let branch = 'main';

      // 尝试解析完整 URL
      try {
        const url = new URL(inviteLink);
        
        // 从 hash 中提取参数（hash 路由格式：#/?owner=xxx&repo=xxx）
        if (url.hash) {
          const hashStr = url.hash.substring(1);
          // 去掉开头的路径部分，只保留查询参数
          const queryIndex = hashStr.indexOf('?');
          if (queryIndex !== -1) {
            const hashQuery = hashStr.substring(queryIndex + 1);
            const hashParams = new URLSearchParams(hashQuery);
            owner = hashParams.get('owner') || '';
            repo = hashParams.get('repo') || '';
            token = hashParams.get('token') || '';
            branch = hashParams.get('branch') || 'main';
          }
        }
        
        // 如果 hash 中没有，尝试从 query 中获取
        if (!owner || !repo) {
          owner = owner || url.searchParams.get('owner') || '';
          repo = repo || url.searchParams.get('repo') || '';
          token = token || url.searchParams.get('token') || '';
          branch = branch || url.searchParams.get('branch') || 'main';
        }
      } catch {
        // 如果不是完整 URL，尝试直接解析为查询字符串
        const params = new URLSearchParams(inviteLink.trim());
        owner = params.get('owner') || '';
        repo = params.get('repo') || '';
        token = params.get('token') || '';
        branch = params.get('branch') || 'main';
      }

      if (!owner || !repo) {
        setError('邀请链接格式不正确');
        return;
      }

      // 检查是否已有相同配置
      const existing = configs.find(c => 
        c.owner === owner && c.repo === repo && (c.branch || 'main') === branch
      );
      if (existing) {
        onSwitchConfig(existing.id);
        setShowInviteModal(false);
        setMessage('已切换到该账本');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      const newConfigData = addGitHubConfig({
        name: `${owner}/${repo}`,
        owner,
        repo,
        token: token || '',
        branch,
        isOwner: false,
      });

      onConfigAdded();
      onSwitchConfig(newConfigData.id);
      setShowInviteModal(false);
      setMessage('加入成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('邀请链接格式不正确');
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.owner.trim() || !newConfig.repo.trim()) {
      setError('请填写仓库所有者和仓库名');
      return;
    }

    setTestingConnection(true);
    try {
      const testConfig = {
        id: '',
        name: '',
        owner: newConfig.owner.trim(),
        repo: newConfig.repo.trim(),
        token: newConfig.token.trim(),
        branch: newConfig.branch.trim() || 'main',
        isOwner: true,
      };
      
      const result = await testConnection(testConfig);
      if (!result.success) {
        setError(result.message || '连接失败');
        return;
      }

      const config = addGitHubConfig({
        name: `${newConfig.owner.trim()}/${newConfig.repo.trim()}`,
        owner: newConfig.owner.trim(),
        repo: newConfig.repo.trim(),
        token: newConfig.token.trim(),
        branch: newConfig.branch.trim() || 'main',
        isOwner: true,
      });

      onConfigAdded();
      onSwitchConfig(config.id);
      setShowAddConfig(false);
      setNewConfig({ owner: '', repo: '', token: '', branch: 'main' });
      setMessage('仓库添加成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setError(e.message || '添加失败');
    }
    setTestingConnection(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">多人记账本</h1>
              <p className="text-xs text-gray-500">
                {configs.length} 个仓库 · {allBooks.length} 个账本
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl text-sm">
              <Github className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{deviceName}</span>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl text-sm font-medium"
              title="填写邀请链接"
            >
              <Link className="w-4 h-4" />
              邀请链接
            </button>
            <div className="relative">
              <button
                onClick={() => setShowConfigMenu(!showConfigMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium"
              >
                <span className="max-w-32 truncate">{currentConfig.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {showConfigMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b border-gray-100">
                    切换仓库
                  </div>
                  {configs.map((config) => (
                    <div key={config.id} className="group">
                      <div className={`flex items-center justify-between ${
                        config.id === currentConfig.id ? 'bg-primary-50' : ''
                      }`}>
                        <button
                          onClick={() => {
                            onSwitchConfig(config.id);
                            setShowConfigMenu(false);
                          }}
                          className={`flex-1 px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                            config.id === currentConfig.id ? 'text-primary-600' : 'text-gray-700'
                          }`}
                        >
                          <Github className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-36">{config.name}</span>
                          {config.id === currentConfig.id && (
                            <Check className="w-4 h-4 flex-shrink-0" />
                          )}
                        </button>
                        {configs.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`确定要移除仓库「${config.name}」吗？本地缓存的数据会被清除。`)) {
                                removeGitHubConfig(config.id);
                                onRefreshConfigs();
                                setShowConfigMenu(false);
                              }
                            }}
                            className="px-2 py-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="移除此仓库"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setShowConfigMenu(false);
                        setShowAddConfig(true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      添加仓库
                    </button>
                    <button
                      onClick={() => {
                        setShowConfigMenu(false);
                        onConfigChange();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      配置管理
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                if (window.confirm('确定要重置当前仓库的所有数据吗？此操作不可恢复！')) {
                  const result = await resetAllData(currentConfig);
                  if (result.success) {
                    setMessage('数据已重置');
                    await loadAllBooks();
                  } else {
                    setError(result.message || '重置失败');
                  }
                  setTimeout(() => setMessage(''), 3000);
                }
              }}
              className="p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
              title="重置所有数据"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {message && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">账本列表</h2>
            <p className="text-gray-500 mt-1">
              所有仓库的账本
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建账本
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : allBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">还没有账本</h3>
            <p className="text-gray-500 mb-6">
              创建第一个账本开始记账
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium"
            >
              创建账本
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBooks.map(({ book, config }) => (
              <div
                key={`${config.id}-${book.id}`}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-2xl">
                    {book.icon}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const full = await getBook(config, book.id);
                        if (full) setEditingBook(full);
                      }}
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {config.isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBook(book.id, book.name, config);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-800">{book.name}</h3>
                </div>
                {!config.isOwner && (
                  <p className="text-xs text-amber-600 mb-2">
                    创建人：{config.owner}
                  </p>
                )}
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">
                  {book.description || '暂无描述'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <Cloud className="w-3 h-3" />
                  <span>更新于 {new Date(book.updatedAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <button
                  onClick={() => handleEnterBook(book.id, config)}
                  className="w-full py-2.5 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition-colors"
                >
                  进入账本
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部版本信息 */}
      <footer className="py-4 text-center border-t border-gray-100 bg-white/50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            多人记账本 v{CURRENT_VERSION}
          </div>
          <div className="flex items-center gap-2">
            {updateInfo && (
              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                下载 v{updateInfo.version}
              </a>
            )}
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              {checkingUpdate ? '检查中...' : '检查更新'}
            </button>
          </div>
        </div>
      </footer>

      {showCreate && (
        <CreateBookModal
          config={currentConfig}
          deviceName={deviceName}
          onClose={() => setShowCreate(false)}
          onSuccess={async () => {
            setShowCreate(false);
            setMessage('账本创建成功');
            await loadAllBooks();
            setTimeout(() => setMessage(''), 3000);
          }}
        />
      )}

      {editingBook && (
        <EditBookModal
          book={editingBook}
          config={currentConfig}
          onClose={() => setEditingBook(null)}
          onSuccess={async () => {
            setEditingBook(null);
            setMessage('账本已更新');
            await loadAllBooks();
            setTimeout(() => setMessage(''), 3000);
          }}
        />
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-800">填写邀请链接</h2>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <p className="font-medium mb-2">使用方法</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>获取邀请人分享的链接</li>
                  <li>粘贴到下方输入框</li>
                  <li>点击加入按钮即可进入对方的账本</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邀请链接</label>
                <textarea
                  value={inviteLink}
                  onChange={(e) => { setInviteLink(e.target.value); setError(''); }}
                  placeholder="粘贴邀请链接到这里..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleJoinInvite}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg"
                >
                  加入账本
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-800">添加仓库</h2>
              </div>
              <button onClick={() => setShowAddConfig(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">仓库所有者</label>
                <input
                  type="text"
                  value={newConfig.owner}
                  onChange={(e) => setNewConfig({ ...newConfig, owner: e.target.value })}
                  placeholder="GitHub用户名或组织名"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">仓库名</label>
                <input
                  type="text"
                  value={newConfig.repo}
                  onChange={(e) => setNewConfig({ ...newConfig, repo: e.target.value })}
                  placeholder="仓库名称"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token（可选，公开仓库可留空）</label>
                <input
                  type="password"
                  value={newConfig.token}
                  onChange={(e) => setNewConfig({ ...newConfig, token: e.target.value })}
                  placeholder="Personal Access Token"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分支</label>
                <input
                  type="text"
                  value={newConfig.branch}
                  onChange={(e) => setNewConfig({ ...newConfig, branch: e.target.value })}
                  placeholder="main"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddConfig(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleAddConfig}
                  disabled={testingConnection}
                  className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
                >
                  {testingConnection ? '验证中...' : '添加仓库'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateBookModal = ({ config, deviceName, onClose, onSuccess }: { config: GitHubConfig; deviceName: string; onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📕');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('请输入账本名称');
      return;
    }

    setSubmitting(true);
    setError('');

    const id = 'book-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
    const book: Book = {
      id,
      name: name.trim(),
      description: description.trim(),
      icon,
      records: [],
      members: [{ name: deviceName, addedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await saveBook(config, book);
    setSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || '创建失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">创建账本</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">账本名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：家庭账本、团队账本"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="账本用途说明"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择图标</label>
            <div className="grid grid-cols-10 gap-2">
              {BOOK_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`aspect-square text-2xl rounded-lg transition-all ${
                    icon === i ? 'bg-primary-100 ring-2 ring-primary-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? '创建中...' : '创建账本'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditBookModal = ({ book, config, onClose, onSuccess }: { book: Book; config: GitHubConfig; onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState(book.name);
  const [description, setDescription] = useState(book.description);
  const [icon, setIcon] = useState(book.icon);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasPassword = !!book.password;
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    setError('');

    try {
      let passwordHash = book.password;

      if (showPasswordSection) {
        if (hasPassword && !removePassword) {
          if (!currentPassword) {
            setError('请输入原密码');
            setSubmitting(false);
            return;
          }
          if (!verifyPassword(currentPassword, book.password!)) {
            setError('原密码不正确');
            setSubmitting(false);
            return;
          }
        }

        if (removePassword) {
          if (hasPassword) {
            if (!currentPassword) {
              setError('请输入原密码');
              setSubmitting(false);
              return;
            }
            if (!verifyPassword(currentPassword, book.password!)) {
              setError('原密码不正确');
              setSubmitting(false);
              return;
            }
          }
          passwordHash = undefined;
        } else if (newPassword) {
          if (newPassword.length < 4) {
            setError('密码至少4位');
            setSubmitting(false);
            return;
          }
          if (newPassword !== confirmPassword) {
            setError('两次输入的密码不一致');
            setSubmitting(false);
            return;
          }
          passwordHash = hashPassword(newPassword);
        }
      }

      const updated: Book = {
        ...book,
        name: name.trim() || book.name,
        description: description.trim(),
        icon,
        password: passwordHash,
        updatedAt: new Date().toISOString(),
      };

      const result = await saveBook(config, updated);
      setSubmitting(false);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.message || '保存失败');
      }
    } catch (e: any) {
      setSubmitting(false);
      setError(e.message || '保存失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">编辑账本</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">账本名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择图标</label>
            <div className="grid grid-cols-10 gap-2">
              {BOOK_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`aspect-square text-2xl rounded-lg transition-all ${
                    icon === i ? 'bg-primary-100 ring-2 ring-primary-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            {!showPasswordSection ? (
              <button
                type="button"
                onClick={() => setShowPasswordSection(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {hasPassword ? '修改密码' : '设置密码（可选）'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">密码设置</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setRemovePassword(false);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>

                {hasPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">原密码</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="请输入原密码"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                {!removePassword && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {hasPassword ? '新密码' : '密码'}
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少4位字符"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入密码"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}

                {hasPassword && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="removePassword"
                      checked={removePassword}
                      onChange={(e) => setRemovePassword(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <label htmlFor="removePassword" className="text-sm text-gray-600">
                      移除密码保护
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
};


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Cloud, Trash2, Settings, Github, X, Edit, Share2, Copy, Check } from 'lucide-react';
import { Book, BookIndex, GitHubConfig } from '@/types';
import { getBookIndex, getBook, saveBook, deleteBookFile } from '@/utils/github';

interface BooksPageProps {
  config: GitHubConfig;
  deviceName: string;
  onConfigChange: () => void;
}

const BOOK_ICONS = ['?', '?', '?', '??', '?', '??', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];

export const BooksPage = ({ config, deviceName, onConfigChange }: BooksPageProps) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState<BookIndex>({ books: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [message, setMessage] = useState('');
  const [showShare, setShowShare] = useState(false);

  const loadIndex = async () => {
    setLoading(true);
    setError('');
    try {
      const idx = await getBookIndex(config);
      setIndex(idx);
    } catch (e: any) {
      setError(e.message || '加载账本列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadIndex();
  }, [config.owner, config.repo, config.branch]);

  const handleEnterBook = async (bookId: string) => {
    try {
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

  const handleDeleteBook = async (bookId: string, name: string) => {
    if (!window.confirm(`确定要删除账本「${name}」吗？此操作不可恢复！`)) return;

    const result = await deleteBookFile(config, bookId);
    if (result.success) {
      setMessage('账本已删除');
      await loadIndex();
    } else {
      setError(result.message || '删除失败');
    }
    setTimeout(() => setMessage(''), 3000);
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
                {config.owner}/{config.repo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-sm font-medium"
              title="生成分享链接，无需登录即可让其他人访问"
            >
              <Share2 className="w-4 h-4" />
              分享
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="md:hidden p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
              title="分享"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl text-sm">
              <Github className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{deviceName}</span>
            </div>
            <button
              onClick={onConfigChange}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl"
              title="修改配置"
            >
              <Settings className="w-5 h-5" />
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
              创建新账本或管理现有账本
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
        ) : index.books.length === 0 ? (
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
            {index.books.map((book) => (
              <div
                key={book.id}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBook(book.id, book.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{book.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">
                  {book.description || '暂无描述'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <Cloud className="w-3 h-3" />
                  <span>更新于 {new Date(book.updatedAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <button
                  onClick={() => handleEnterBook(book.id)}
                  className="w-full py-2.5 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition-colors"
                >
                  进入账本
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateBookModal
          config={config}
          onClose={() => setShowCreate(false)}
          onSuccess={async () => {
            setShowCreate(false);
            setMessage('账本创建成功');
            await loadIndex();
            setTimeout(() => setMessage(''), 3000);
          }}
        />
      )}

      {editingBook && (
        <EditBookModal
          book={editingBook}
          config={config}
          onClose={() => setEditingBook(null)}
          onSuccess={async () => {
            setEditingBook(null);
            setMessage('账本已更新');
            await loadIndex();
            setTimeout(() => setMessage(''), 3000);
          }}
        />
      )}

      {showShare && (
        <ShareModal config={config} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
};

const CreateBookModal = ({ config, onClose, onSuccess }: { config: GitHubConfig; onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('?');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('请输入账本名称');
      return;
    }

    setSubmitting(true);
    setError('');

    const id = name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-') + '-' + Date.now().toString(36);
    const book: Book = {
      id,
      name: name.trim(),
      description: description.trim(),
      icon,
      records: [],
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

  const handleSave = async () => {
    setSubmitting(true);
    setError('');

    const updated: Book = {
      ...book,
      name: name.trim() || book.name,
      description: description.trim(),
      icon,
      updatedAt: new Date().toISOString(),
    };

    const result = await saveBook(config, updated);
    setSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || '保存失败');
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
            <label className="block text-sm font-medium text-gray-700 mb-2">图标</label>
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

const ShareModal = ({ config, onClose }: { config: GitHubConfig; onClose: () => void }) => {
  const [includeToken, setIncludeToken] = useState(!!config.token);
  const [copied, setCopied] = useState(false);

  const buildUrl = (withToken: boolean) => {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('owner', config.owner);
    params.set('repo', config.repo);
    if (config.branch && config.branch !== 'main') {
      params.set('branch', config.branch);
    }
    if (withToken && config.token) {
      params.set('token', config.token);
    }
    return `${base}?${params.toString()}`;
  };

  const shareUrl = buildUrl(includeToken);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 兜底方案
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-800">分享给家人 / 队友</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
            <p className="font-medium mb-2">免登录使用方法</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>复制下方链接，发送给家人或队友</li>
              <li>对方在浏览器打开链接即可直接使用</li>
              <li>无需注册账号，无需登录 GitHub</li>
              <li>支持电脑、手机、平板多设备访问</li>
            </ol>
          </div>

          {config.token && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="includeToken"
                  checked={includeToken}
                  onChange={(e) => setIncludeToken(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="includeToken" className="flex-1 cursor-pointer">
                  <p className="font-medium">附带 Token（可写入）</p>
                  <p className="text-xs mt-1 text-amber-600">
                    勾选后，对方打开链接也能添加/删除记录。
                    <br />
                    链接中会包含你的 Token，请只发给信任的人。
                  </p>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分享链接</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-600 focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 flex items-center gap-1 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {includeToken && config.token
                ? '链接含 Token，对方可读写'
                : '对方仅可查看数据（如仓库公开）'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">使用提示</p>
            <p>· 对方打开链接后会输入自己的「显示名称」用来标识</p>
            <p>· 所有人看到的是同一份数据，实时同步</p>
            <p>· 不附带 Token 时，对方只能看不能改</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
# 多人记账本

一款**无需注册登录**的个人/团队记账应用，通过 GitHub 仓库实现多设备多人协作。基于 GitHub 仓库的 `data/` 目录存储数据，GitHub Pages 部署前端。

## ? 核心特性

- ? **免登录使用**：无需注册账号，输入 GitHub 仓库即可使用
- ? **多设备多人**：通过一个 GitHub 账号（仓库主）即可让所有家庭成员/队友共用
- ?? **数据云端共享**：账本数据存储在 GitHub 仓库，所有人看到同一份数据
- ? **一键分享**：生成分享链接，对方打开即可使用
- ? **统计分析**：分类饼图、月度趋势、成员支出排行
- ? **响应式**：桌面端与移动端完美适配
- ? **离线缓存**：本地缓存支持断网浏览

## ? 快速开始

### 1. 准备 GitHub 仓库（数据存储）

1. 创建一个**公开**的 GitHub 仓库（如 `expense-tracker-data`），用于存储账本数据
2. 创建一个 Personal Access Token：
   - 访问 [GitHub Token 设置](https://github.com/settings/tokens)
   - 点击 `Generate new token` → `Generate new token (classic)`
   - Note 填写「记账本」
   - 勾选 `repo` 权限（必须，contents 读写）
   - 点击生成，**复制并保存 token**（仅显示一次）

### 2. 部署前端到 GitHub Pages

1. Fork 或克隆本项目
2. 推送到你自己的仓库
3. 进入仓库 Settings → Pages
4. Source 选择 `GitHub Actions`
5. 等待自动部署完成
6. 访问 `https://你的用户名.github.io/仓库名/`

### 3. 首次使用

1. 打开应用，进入配置页面
2. 填写：
   - **GitHub 用户名**：你的用户名
   - **仓库名**：第 1 步创建的仓库名（如 `expense-tracker-data`）
   - **Token**：第 1 步生成的 PAT
   - **显示名称**：你的昵称（如"小明"）
3. 选择"管理员模式"点击"进入应用"
4. 创建你的第一个账本

### 4. 邀请家人/队友

1. 在账本列表页点击右上角「分享」按钮
2. 勾选「附带 Token」（让对方也能添加记录）
3. 复制链接发给家人/队友
4. 对方打开链接后会输入自己的昵称即可使用
5. **无需注册账号，无需登录 GitHub！**

### 本地开发

```bash
npm install
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
```

## ? 使用说明

### 两种角色

| 角色 | 权限 | 适合 |
|------|------|------|
| **管理员** | 可创建/删除账本、添加/删除任何记录 | 账本创建者 |
| **访客** | 仅可查看数据 | 只想看不想改的人 |

### 数据结构

数据存储在 GitHub 仓库的 `data/` 目录：

```
your-repo/
└── data/
    ├── index.json         # 账本索引
    ├── 家庭账本-abc123.json   # 单个账本
    └── 旅行账本-def456.json
```

每个账本文件格式：

```json
{
  "id": "家庭账本-abc123",
  "name": "家庭账本",
  "description": "全家日常开支",
  "icon": "?",
  "records": [
    {
      "id": "...",
      "type": "expense",
      "amount": 50,
      "category": "餐饮",
      "note": "午饭",
      "date": "2026-06-23",
      "createdAt": "2026-06-23T12:00:00Z",
      "createdBy": "小明"
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

## ?? 技术架构

```
前端:     React 18 + TypeScript + Vite
UI:       Tailwind CSS + Lucide Icons
图表:     Chart.js + react-chartjs-2
数据存储: GitHub Repository API (data/ 目录)
本地缓存: localStorage (离线浏览)
路由:     React Router 6
```

## ? 项目结构

```
src/
├── components/        # 共享组件
│   ├── StatCard.tsx           # 统计卡片
│   ├── RecordItem.tsx         # 记录项
│   └── AddRecordModal.tsx     # 添加记录弹窗
├── pages/             # 页面
│   ├── SetupPage.tsx          # 初始配置（管理员/访客模式）
│   ├── BooksPage.tsx          # 账本列表
│   ├── BookPage.tsx           # 账本详情
│   └── StatisticsPage.tsx     # 统计分析
├── data/
│   └── categories.ts   # 默认分类
├── utils/
│   ├── github.ts       # GitHub Repository API
│   └── format.ts       # 格式化工具
└── types/
    └── index.ts        # 类型定义
```

## ? 安全说明

- **Token 存储**：Token 仅存储在浏览器 localStorage，不会上传到任何第三方
- **分享链接**：包含 Token 的链接等价于完全访问权限，请只发给信任的人
- **可选方案**：如果想严格只读，可分享不包含 Token 的链接（对方只读）
- **公开仓库**：建议使用公开仓库（GitHub Pages 部署时也是公开的）
- **数据备份**：数据保存在 GitHub 仓库，自带版本控制和备份能力

## ?? 注意事项

1. **GitHub API 限流**：未认证 60 次/小时，使用 Token 后 5000 次/小时
2. **并发写入**：极端情况下多人同时操作可能产生冲突（GET-PUT 间的 SHA 失效），应用会自动重试
3. **公开仓库可见**：账本数据存储在公开仓库，任何人可查看
4. **首次使用**：首次配置需手动填写仓库信息，配置后会保存在浏览器中

## ? 使用技巧

- **手机使用**：把分享链接在手机浏览器打开，添加书签即可像 App 一样使用
- **家庭账本**：让每个家庭成员都用一个不同的"显示名称"，所有记录自动归属
- **私密账本**：把仓库设为 Private，但需要给所有使用者配置 Token
- **多账本**：可以创建多个账本分类管理（家庭、团队、旅行等）

## ? License

MIT

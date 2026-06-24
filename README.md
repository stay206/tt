# 多人记账本

一个**无需登录注册**的多人/团队记账应用，通过 GitHub 仓库实现多设备多人协作。账本数据存储在 GitHub 仓库的 `data/` 目录，GitHub Pages 托管前端。

## ✨ 功能特性

- 🚀 **免登录使用**: 无需注册账号，通过 GitHub 仓库即可使用
- 👥 **多设备协作**: 通过一个 GitHub 账号，仓库可被多人访问，适合家庭/团队使用
- 💾 **数据安全存储**: 账本数据存储在 GitHub 仓库，支持多人同时查看同一账本
- 💰 **一键平分**: 支出可选择参与成员，自动计算每人应付金额
- 📊 **统计报表**: 月度收支图表、分类统计、成员消费排行
- 📱 **响应式**: 支持桌面和移动设备访问
- 🔄 **离线缓存**: 支持离线操作，自动同步

## 🚀 快速开始

### 1. 准备 GitHub 仓库（数据存储）

1. 创建一个**公开**的 GitHub 仓库（如 `expense-tracker-data`），用于存储账本数据
2. 创建一个 Personal Access Token：
   - 访问 [GitHub Token 设置](https://github.com/settings/tokens)
   - 点击 `Generate new token` 或 `Generate new token (classic)`
   - Note 填写：记账本
   - 勾选 `repo` 权限（至少需要 contents 读写权限）
   - 生成后，**务必保存这个 token**（只显示一次）

### 2. 部署前端到 GitHub Pages

1. Fork 本项目
2. 推送到你自己的仓库
3. 进入仓库 Settings -> Pages
4. Source 选择 `GitHub Actions`
5. 等待自动部署完成
6. 访问 `https://你的用户名.github.io/仓库名/`

### 3. 首次使用

1. 打开应用，进入设置页面
2. 填写：
   - **GitHub 用户名**: 你的用户名
   - **仓库名**: 第 1 步创建的数据仓库名（如 `expense-tracker-data`）
   - **Token**: 第 1 步生成的 PAT
   - **显示名称**: 你的昵称，如"小明"
3. 选择"管理员模式"或"访客模式"
4. 创建你的第一个账本

### 4. 邀请成员/分享

1. 在账本列表页面，点击账本右上角的"分享"按钮
2. 复制分享链接（不含 Token，分享给他人也可以添加记录）
3. 成员打开分享链接后
4. 在设置页输入自己的显示名称即可使用
5. **注意：无需登录账号，但需要拥有 GitHub 账号**

### 开发指南

```bash
npm install
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产版本
```

## 📖 使用说明

### 用户角色

| 角色 | 权限 | 适用场景 |
|------|------|----------|
| **管理员** | 可创建/删除账本、添加/删除任何记录 | 账本创建者 |
| **访客** | 可查看和添加记录 | 团队成员、家庭成员 |

### 数据结构

数据存储在 GitHub 仓库的 `data/` 目录。

```
your-repo/
├── data/
│   ├── index.json         # 账本索引
│   ├── book-abc123.json   # 单个账本
│   └── book-def456.json
```

每个账本文件格式：

```json
{
  "id": "book-abc123",
  "name": "家庭账本",
  "description": "全家日常开支",
  "icon": "📕",
  "records": [
    {
      "id": "...",
      "type": "expense",
      "amount": 50,
      "category": "餐饮",
      "note": "午餐",
      "date": "2026-06-23",
      "createdAt": "2026-06-23T12:00:00Z",
      "createdBy": "小明",
      "payer": "小明",
      "participants": ["小明", "小红"]
    }
  ],
  "createdAt": "...",
  "updatedAt": "...",
  "members": [
    { "name": "小明", "addedAt": "..." },
    { "name": "小红", "addedAt": "..." }
  ]
}
```

## 🛠️ 技术栈

```
前端:     React 18 + TypeScript + Vite
UI:       Tailwind CSS + Lucide Icons
图表:     Chart.js + react-chartjs-2
数据存储: GitHub Repository API (data/ 目录)
离线缓存: localStorage (操作队列)
路由:     React Router 6
```

## 📁 项目结构

```
src/
├── components/        # 组件目录
│   ├── StatCard.tsx           # 统计卡片
│   ├── RecordItem.tsx         # 记录项
│   └── AddRecordModal.tsx     # 添加记录弹窗
├── pages/             # 页面
│   ├── SetupPage.tsx          # 设置页面（管理员/访客模式）
│   ├── BooksPage.tsx          # 账本列表
│   ├── BookPage.tsx           # 账本详情
│   └── StatisticsPage.tsx     # 统计报表
├── data/
│   └── categories.ts   # 默认分类
├── utils/
│   ├── github.ts       # GitHub Repository API
│   ├── format.ts       # 格式化工具
│   └── offlineQueue.ts # 离线操作队列
└── types/
    └── index.ts        # 类型定义
```

## 🔒 安全说明

- **Token 存储**: Token 仅存储在浏览器 localStorage，不会上传到任何服务器
- **权限最小化**: 建议 Token 只授予最小必要权限，建议只选择 repo 的 contents 权限
- **公开仓库**: 如果仓库是公开的，任何人都可以查看账本数据，建议用于私人使用时设置为私有仓库
- **数据备份**: 数据存储在 GitHub 仓库，支持版本控制和历史回溯

## ⚠️ 注意事项

1. **GitHub API 限制**: 未授权 60 次/小时，使用 Token 后 5000 次/小时
2. **并发写入**: 如果多人同时修改，可能会出现 GET-PUT 请求 SHA 失效，应用会自动重试
3. **公开仓库可见性**: 账本数据存储在公开仓库，任何人都可以查看
4. **首次使用**: 首次使用需要填写仓库信息，建议妥善保管 Token

## 💡 使用场景

- **手机使用**: 推荐在手机浏览器上使用（无需安装，随时打开），建议添加到主屏幕
- **家庭账本**: 每个家庭成员使用一个不同的"显示名称"，账本记录自动共享
- **私密账本**: 将仓库设为 Private，需要授权才能访问（仍需要 Token）
- **团队账本**: 可为团队创建多个账本，用于团队活动、聚餐、出差等

## 📄 License

MIT

# SMB 视频管理系统

一个用于爬取 NAS (SMB) 视频文件并提供 Web 管理界面的 Node.js 应用。

## 功能特性

- 🕷️ **SMB 爬虫**: 递归遍历 SMB 共享目录，自动识别视频文件
- 💾 **数据库存储**: 使用 SQLite + TypeORM 存储视频元数据
- 🎬 **视频播放**: 支持 SMB 流式传输和 Web 播放
- 🔍 **搜索功能**: 按文件名搜索视频
- 🏷️ **标签管理**: 支持视频标签（待完善）

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite + TypeORM + better-sqlite3
- **SMB 客户端**: smb2
- **前端**: React + Ant Design（待实现）

## 项目结构

```
src/
├── config/
│   └── database.ts       # 数据库配置
├── entities/
│   ├── Video.ts          # 视频实体
│   ├── Tag.ts            # 标签实体
│   └── VideoTag.ts       # 视频标签关联
├── services/
│   └── SmbCrawler.ts     # SMB 爬虫服务
├── routes/
│   ├── videoRoutes.ts    # 视频 API 路由
│   ├── streamRoutes.ts   # 视频流传输
│   └── crawlerRoutes.ts  # 爬虫控制路由
└── app.ts                # 应用入口
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
SMB_HOST=192.168.1.17
SMB_SHARE=smb
SMB_USERNAME=your_username
SMB_PASSWORD=your_password
PORT=3000
```

### 启动服务

开发模式（热重载）：
```bash
pnpm run dev
```

生产模式：
```bash
pnpm run start
```

服务启动后访问：http://localhost:3000

## API 接口

### 视频列表
```
GET /api/videos?page=1&limit=20&search=keyword
```

### 视频详情
```
GET /api/videos/:id
```

### 视频流播放
```
GET /api/stream/video/:id
```

### 触发爬虫
```
POST /api/crawler/crawl
Content-Type: application/json

{
  "host": "192.168.1.17",
  "share": "smb",
  "username": "guest",
  "password": "",
  "path": "/"
}
```

### 健康检查
```
GET /health
```

## 支持的视频格式

- mp4, mkv, avi, mov, wmv, flv, webm, m4v, mpeg, mpg, 3gp

## 待实现功能

- [ ] React 前端界面
- [ ] 标签管理 UI
- [ ] 增量爬取
- [ ] 爬取进度显示
- [ ] 多 SMB 源配置
- [ ] 视频缩略图生成

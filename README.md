# Video Manager（autoPushOld）

本地视频目录扫描 → 写入 MySQL → 用 **NestJS API** 与 **React（Vite）** 前端做列表、按文件夹浏览和标签管理的一体化小工具。仓库为 npm workspaces 单体仓库。

## 功能概览

- **扫描脚本**（`scan-videos.js`）：递归扫描指定目录，识别常见视频扩展名，生成 `videos.json`（含路径、大小、创建/修改时间、`video_key` 等）。
- **导入脚本**（`import-videos.js`）：将 `videos.json` 批量写入 `videos` 表；`video_key` 唯一，重复键会跳过。
- **API**（`packages/api`）：视频分页/筛选/排序、按路径前缀列文件夹、单条详情、更新视频关联标签；标签 CRUD。
- **Web**（`packages/web`）：视频列表、文件夹视图、标签管理；开发时通过 Vite 将 `/api` 代理到本机 API。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `scan-videos.js` | 扫描目录 → `videos.json` |
| `import-videos.js` | `videos.json` → MySQL |
| `db-schema.sql` | MySQL 建库建表（与 Prisma 模型一致） |
| `packages/api` | NestJS + Prisma + MySQL |
| `packages/web` | React 18 + Vite 6 |

## 环境要求

- Node.js（建议当前 LTS）
- MySQL 5.7+ / 8.x

## 数据库

1. 执行 `db-schema.sql` 创建库 `video_manager` 及表 `videos`、`tags`、`video_tags`。
2. 复制 `packages/api/.env.example` 为 `packages/api/.env`，填写数据库凭证（**不要**把真实密码提交到 Git）：

   - 要么设置 `DATABASE_URL`；
   - 要么只设置 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`（未设置 `DATABASE_URL` 时会自动拼成连接串）。

   `import-videos.js` 会读取 `packages/api/.env` 中的上述变量；也可在运行前通过操作系统环境变量注入。

3. 安装依赖并生成 Prisma Client：

   ```bash
   npm install
   npm run prisma:generate
   ```

## API 环境变量（`packages/api`）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL 连接 URL；与下面分项二选一 |
| `DB_HOST` | 未设 `DATABASE_URL` 时使用 |
| `DB_PORT` | 默认 `3306` |
| `DB_USER` | 未设 `DATABASE_URL` 时必填（与 `DB_HOST` 一起） |
| `DB_PASSWORD` | 可为空 |
| `DB_NAME` | 默认 `video_manager` |
| `PORT` | 监听端口，默认 `4000` |
| `CORS_ORIGIN` | 可选，逗号分隔的允许来源；不设则开发模式下较宽松 |
| `NOVEL_TXT_DIR` | 可选，小说 TXT 目录 |

## 扫描与导入

1. 编辑 `scan-videos.js` 中的 `targetDir`，改为你本机要扫描的根目录。
2. 生成清单：

   ```bash
   npm run run
   ```

   输出：`videos.json`（项目根目录）。

3. 导入数据库：

   ```bash
   npm run import
   ```

## 本地开发

终端一 — API：

```bash
npm run dev:api
```

默认 `http://localhost:4000`。

终端二 — Web（`/api` 代理到 `127.0.0.1:4000`）：

```bash
npm run dev:web
```

浏览器访问 Vite 提示的地址（默认 `http://localhost:5173`）。

若前端直连其他地址的 API，可在 `packages/web` 设置 `VITE_API_BASE`（例如生产环境完整 API 根路径）。

## 构建

```bash
npm run build:api
npm run build:web
```

API 生产启动：`packages/api` 内 `npm run start:prod`（先 `build`）。

## HTTP 接口摘要

前缀无全局 `/api`（由前端代理去掉 `/api` 前缀）。

**Videos**

- `GET /videos` — 查询参数：`skip`、`take`、`tagIds`（逗号分隔）、`pathPrefix`、`search`、`sortBy`、`sortOrder`、`extensions`（逗号分隔，如 `.mp4,.mkv`）
- `GET /videos/folders?parent=` — 某路径下的子文件夹列表
- `GET /videos/:id` — 单条（含标签）
- `PATCH /videos/:id/tags` — body：`{ "tagIds": number[] }`

**Tags**

- `GET /tags`、`GET /tags/:id`
- `POST /tags`、`PATCH /tags/:id`、`DELETE /tags/:id`

## 许可

`ISC`（见根目录 `package.json`）。

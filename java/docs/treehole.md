# 树洞 / Aish 接口说明

本模块把 [treeholeSelf](../../../Go/treeholeSelf) 的页面和接口迁入 `nas_tiny_video`：

- 页面：React 前端（`web/src/pages/Treehole*.tsx`、`AishPage.tsx`），复用现有登录态与深色/浅色主题。
- 接口：`reading-service` 的 `com.videomanager.treehole` 包，经 gateway 统一暴露在 `/api` 下。
- 鉴权：沿用 nas 的 JWT（`Authorization: Bearer <accessToken>`），不再使用 treeholeSelf 自己的 cookie token。

## 数据来源

树洞数据不做搬迁，直接只读访问原 treeholeSelf 使用的 MySQL schema：

| 表 | 用途 | 行数（迁移时） |
|---|---|---:|
| `comments` | 煎蛋树洞评论 | 55,105 |
| `aish2` | aish123.vip 帖子索引 | 1,517 |

> treeholeSelf 的 Go 代码里查询的是 `aish` 表，但实际数据在 `aish2`，这里以 `aish2` 为准。

要求：

1. `comments` / `aish2` 所在的 schema（默认 `jandan`）与 `video_manager` 在**同一个 MySQL 实例**上，
   因为 `reading-service` 复用了同一个数据源，只通过 schema 前缀区分。
2. 建议为服务账号只授予只读权限：

   ```sql
   GRANT SELECT ON jandan.comments TO 'video_manager'@'%';
   GRANT SELECT ON jandan.aish2   TO 'video_manager'@'%';
   ```

3. 数据库连接沿用现有环境变量 `DB_HOST`、`DB_PORT`、`DB_USERNAME`、`DB_PASSWORD`；
   schema 名通过 `TREEHOLE_SCHEMA` 覆盖（默认 `jandan`，会校验为合法标识符）。

## 接口

所有接口经网关访问，例如 `http://127.0.0.1:4000/api/treehole`。

### GET `/api/treehole`

分页列表，对应原 `GET /api/treehole`。

| 参数 | 默认 | 说明 |
|---|---|---|
| `page` | `0` | 从 0 开始 |
| `size` | `20` | 1–100 |
| `field` | `date_gmt` | `date_gmt` / `vote_positive` / `vote_negative` / `sub_comment_count` |
| `sort` | `DESC` | `ASC` / `DESC` |
| `likeRange` | 空 | 点赞区间 `0-25`、`101-200`、`401-∞`；空表示不限 |

响应：

```json
{
  "items": [
    {
      "id": "6214757",
      "postId": "102312",
      "author": "kasusa",
      "dateGmt": "2026-09-21T16:51:07",
      "content": "……",
      "votePositive": 1,
      "voteNegative": 0,
      "subCommentCount": 2,
      "ipLocation": "中国"
    }
  ],
  "total": 55105,
  "page": 0,
  "size": 20,
  "field": "date_gmt",
  "sort": "DESC",
  "likeRange": ""
}
```

### GET `/api/treehole/author/{author}`

按作者查询，参数 `page`、`size`（默认 20），按 `date_gmt` 倒序。响应同上（无 `field`/`sort`/`likeRange`）。

### GET `/api/treehole/search?q=关键词`

按正文 `LIKE` 搜索，参数 `page`、`size`。`q` 为空时返回空列表，不做全表扫描。

### GET `/api/treehole/statistics`

按作者聚合，口径与 treeholeSelf 一致：喜欢 / 不喜欢 / 收到回复累计超过 1000 的作者，按喜欢降序。

```json
{
  "items": [
    {
      "author": "俱舍莲帝",
      "totalLikes": 30413,
      "totalDislikes": 27051,
      "commentsReceived": 2755,
      "articlesPosted": 2685
    }
  ],
  "total": 344
}
```

兼容旧路径：`GET /api/treehole/static`。

### GET `/api/aish/posts`

返回全部 Aish 帖子，按最后回复时间倒序：

```json
{
  "items": [
    {
      "title": "SQL的两块KB店暂时诀别，大家集体默哀。。。",
      "articleUrl": "/forum.php?mod=viewthread&tid=22136&extra=page%3D1",
      "articleId": "22136",
      "area": "普陀区",
      "isNewUserPost": false,
      "author": "KB爱好者",
      "publishTime": "2025-06-21T08:00:00",
      "replyCount": 9,
      "readCount": 1184,
      "lastReplier": "半夜广场舞",
      "lastReplyTime": "2025-06-21T08:00:00"
    }
  ],
  "total": 1517
}
```

## 字段约定

- `id`、`postId`、`userId` 在 MySQL 是 `BIGINT`，而 nas 的全局 Jackson 配置把所有 `Long`
  序列化成字符串（避免前端精度丢失）。前端按字符串处理即可。
- 计数类字段（点赞、回复数、统计值）在服务层统一转成 `int`，JSON 中是数字。
- 时间统一输出 `yyyy-MM-dd'T'HH:mm:ss` 的本地时间字符串（`Asia/Shanghai`）。
- 原接口的 snake_case 字段改为 camelCase，与 nas 其他接口一致。

## 前端

| 路由 | 页面 | 说明 |
|---|---|---|
| `/treehole` | `TreeholePage` | 列表 + 排序 / 点赞区间 / 每页数量 + 键盘 ← → 翻页 |
| `/treehole/search` | `TreeholeSearchPage` | 防抖 400ms，`q` 写入地址栏 |
| `/treehole/statistics` | `TreeholeStatisticsPage` | 可点击表头排序 |
| `/treehole/aish` | `AishPage` | 地区筹码筛选 + 关键词过滤 + 分页 |
| `/treehole/author/:author` | `TreeholeAuthorPage` | 作者动态分页 |

列表页的查询状态保存在 URL（`page`、`size`、`field`、`sort`、`likeRange`），默认值不写入 URL，
刷新和前进/后退都能还原。

## 注意事项

- 未增加 Redis 缓存：树洞数据是外部只读数据，列表查询约 200–400ms，统计约 0.9s，直接查询能保证新鲜度。
- `comments` 表没有主键和索引，按点赞排序与全文 `LIKE` 都是全表扫描；55k 行规模下可接受，
  数据量继续增长时建议补 `(vote_positive)`、`(date_gmt)` 索引或改用全文索引。
- `likeRange`、`field`、`sort` 都经过白名单校验，非法参数返回 400；`schema` 会做正则校验，避免拼接注入。

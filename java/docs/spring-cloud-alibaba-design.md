# Video Manager Spring Cloud Alibaba 微服务设计方案

## 1. 目标与原则

目标是将当前 Spring Boot 单体平滑迁移到 Spring Cloud Alibaba，同时保持前端 `/api/**` 契约不变。迁移采用先治理、后拆分：先统一身份认证、服务注册和配置规范，再按业务边界拆服务，避免一次性重写导致数据与接口回归。

技术基线：Java 21、Spring Boot 3.2.9、Spring Cloud 2023.0.3、Spring Cloud Alibaba 2023.0.3.2、Nacos、Spring Security、JWT、MyBatis、MySQL、Redis。版本组合按 Spring Cloud Alibaba 兼容矩阵锁定，升级时必须整组验证。

## 2. 目标架构

```text
Web / NAS Client
       |
       v
api-gateway :4000  -- JWT 校验、路由、CORS、限流、审计
       |
       +-- auth-service       用户、登录、令牌签发
       +-- media-service      视频、目录、标签、图片
       +-- reading-service    小说、电子书、aish123
       |
       +-- Nacos              注册发现、环境配置
       +-- Redis              缓存、令牌撤销列表、限流状态
       +-- MySQL              各服务独立 schema / 独立账号
```

当前工程已按目标边界拆成 Maven 多模块：网关占用外部端口 `4000`，三个业务服务使用内部端口，前端无需修改 API 地址。默认本地直连；启用 Nacos 后将网关 URI 设置为 `lb://服务名` 即可通过服务发现路由。

## 3. 服务边界

| 服务 | 职责 | 数据所有权 | 建议端口 |
|---|---|---|---|
| `api-gateway` | 路由、JWT 初检、CORS、Sentinel 限流、统一错误 | 无业务表 | 4000 |
| `auth-service` | 用户、密码校验、令牌签发/刷新、禁用用户 | `users`、`refresh_tokens` | 4010 |
| `media-service` | videos、folders、tags、gallery | 媒体相关表 | 4020 |
| `reading-service` | novels、ebooks、aish123 | 阅读相关表 | 4030 |

服务之间只通过 HTTP/OpenFeign 或事件通信，不跨库查询。文件仍由实际挂载 NAS 的服务读取；不要经 Nacos 或数据库传输大文件。

## 4. 登录与鉴权

1. 前端调用 `POST /api/auth/login`，提交用户名和密码。
2. `auth-service` 使用 BCrypt 校验 `users.password_hash`，签发短期 JWT。
3. 前端请求统一携带 `Authorization: Bearer <token>`。
4. 网关校验签名、过期时间和 issuer，并将用户 ID 透传；每个资源服务仍独立验签，不能只信任请求头。
5. 用户禁用、退出全部设备等场景将 JWT 的 `jti` 写入 Redis 撤销列表；后续增加 refresh token 轮换。

当前实现使用 HS256，适合第一阶段单部署。拆出 `auth-service` 时改为 RS256/ES256：认证服务持有私钥，网关和资源服务只持有公钥，并通过 Nacos 配置分发公钥而非私钥。

安全要求：生产必须设置随机 `JWT_SECRET`（至少 32 字节）；数据库、Redis、Nacos 密码均通过环境变量或 Nacos 加密配置注入，不提交仓库；登录接口增加 Sentinel 限流和失败次数锁定；全链路强制 HTTPS。

## 5. Nacos 配置

建议 namespace：`dev`、`test`、`prod`。每个服务使用独立 Data ID，例如 `media-service-prod.yml`，公共项放在 `video-manager-common-prod.yml`。Nacos 保存连接地址、超时、功能开关；敏感值优先使用部署平台 Secret 引用。

当前服务默认 `NACOS_DISCOVERY_ENABLED=false`，避免没有 Nacos 的本地环境启动失败。接入时设置：

```bash
NACOS_DISCOVERY_ENABLED=true \
NACOS_SERVER_ADDR=127.0.0.1:8848 \
NACOS_NAMESPACE=prod \
JWT_SECRET='replace-with-a-random-production-secret' \
java -jar target/api-0.0.1-SNAPSHOT.jar
```

## 6. 数据迁移

`V1__create_users.sql` 创建用户表并以 BCrypt 哈希初始化指定账号。启用迁移前先备份数据库，然后使用：

```bash
FLYWAY_ENABLED=true DB_HOST=127.0.0.1 DB_PASSWORD='...' mvn spring-boot:run
```

拆库顺序：先建立目标 schema 和只具备本 schema 权限的账号；双写或停机迁移；校验记录数与关键字段；切换读流量；观察后再停止旧表写入。图库和小说文件路径仅迁移元数据，文件挂载需保持一致。

## 7. 分阶段实施

### 阶段 A：单体治理（已完成）

- 引入 Spring Cloud Alibaba BOM 和可开关 Nacos Discovery。
- 新增用户表、登录 API、JWT 资源服务器保护。
- 前端新增登录、Bearer Token、401 处理和退出。
- 启用 Actuator 健康检查与 Flyway MySQL 支持。

### 阶段 B：引入网关与独立认证服务（已完成基础版）

- 已新建 `gateway-service`，保持所有外部 `/api/**` 路径不变。
- 已将 auth 包和 users 表迁入 `auth-service`。
- 使用非对称签名；网关和资源服务双重验签。
- 接入 Sentinel、统一 trace ID、结构化日志和 Prometheus 指标。

### 阶段 C：按领域拆分（代码拆分已完成，独立数据库待迁移）

- `reading-service` 已承载小说、电子书和 aish123。
- `media-service` 已承载视频、目录、标签和图库；标签与视频仍在同一事务边界。
- 用契约测试锁定现有 API，逐路由灰度切换并提供快速回滚。

## 8. 验收标准

- 未带令牌访问任何业务 API 返回 401；有效令牌可访问全部既有 API。
- 密码仅以 BCrypt 哈希保存，日志和响应不出现密码或令牌。
- 用户禁用后不能获取新令牌；生产密钥不使用默认值。
- 所有服务在 Nacos 正确注册，网关不依赖固定实例地址。
- 服务健康检查、超时、重试和限流有明确配置；写请求不做无条件自动重试。
- 前端无需感知具体服务地址，原有页面与 API 行为通过回归测试。

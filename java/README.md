# Video Manager Cloud

后端已经拆为 Spring Cloud Alibaba Maven 多模块微服务，外部 API 仍统一使用 `http://127.0.0.1:4000/api/**`。

## 模块

| 模块 | 端口 | 职责 |
|---|---:|---|
| `gateway-service` | 4000 | API 路由、JWT 校验、CORS |
| `auth-service` | 4010 | 用户表、登录、JWT 签发、Flyway |
| `media-service` | 4020 | 视频、目录、标签、图库 |
| `office-service` | 4040 | 任务管理 |
| `reading-service` | 4030 | 小说、电子书、aish123 |
| `service-common` | - | 资源服务鉴权、异常、缓存与公共配置 |

完整架构和迁移说明见 [docs/spring-cloud-alibaba-design.md](docs/spring-cloud-alibaba-design.md)。

## 本地启动

环境要求：JDK 21、Maven 3.9、MySQL、Redis。

```bash
cd /Users/mac/workspace/nodejs/nas_tiny_video/java

export DB_HOST=192.168.1.20
export DB_PASSWORD='你的数据库密码'
export REDIS_PASSWORD='你的Redis密码'
export JWT_SECRET='至少32字节的本地随机密钥'

./start-local.sh
```

脚本会先构建全部模块，然后启动四个进程。按 `Ctrl+C` 会关闭全部进程。认证服务默认执行 Flyway，创建 `users` 表并初始化账号 `bzw875`；密码以 BCrypt 哈希保存。

也可以分别在四个终端启动服务：

```bash
mvn -pl auth-service -am spring-boot:run
mvn -pl media-service -am spring-boot:run
mvn -pl reading-service -am spring-boot:run
mvn -pl gateway-service -am spring-boot:run
```

四个进程必须使用完全相同的 `JWT_SECRET`。

## 登录验证

```bash
curl -X POST http://127.0.0.1:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bzw875","password":"8872goob"}'
```

响应中的 `accessToken` 用于访问业务 API：

```bash
curl http://127.0.0.1:4000/api/videos \
  -H 'Authorization: Bearer 你的accessToken'
```

## 前端 API 地址

前端默认请求 `/api`，开发时由 Vite 代理到 `http://127.0.0.1:4000`。如果网关部署在其他地址，在 `web/.env` 设置：

```bash
VITE_API_BASE=https://api.example.com/api
VITE_GATEWAY_TARGET=https://api.example.com
```

`VITE_API_BASE` 是浏览器实际请求根路径，`VITE_GATEWAY_TARGET` 只影响本地 `npm run dev` 代理。

## Nacos 模式

各服务默认关闭 Nacos，网关使用本地固定地址，便于直接开发。Nacos 启动后设置：

```bash
export NACOS_DISCOVERY_ENABLED=true
export NACOS_SERVER_ADDR=127.0.0.1:8848
export AUTH_SERVICE_URI=lb://auth-service
export MEDIA_SERVICE_URI=lb://media-service
export READING_SERVICE_URI=lb://reading-service
./start-local.sh
```

生产环境必须替换默认 JWT 密钥，并用网络策略限制三个业务服务只能从网关或可信内网访问。资源服务仍会独立验签，绕过网关也无法绕过鉴权。

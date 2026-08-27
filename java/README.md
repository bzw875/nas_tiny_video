# Video Manager Java API

基于 Spring Boot 3 的后端 API 工程，入口类是 `src/main/java/com/videomanager/ApiApplication.java`。

## 1. 快速启动

### 1.1 环境要求

- JDK 21+（当前项目按 Java 21 编译）
- Maven 3.9+

### 1.2 安装依赖并启动

在 `packages/java` 目录执行：

```bash
mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

> 说明：`-Dmaven.repo.local=.m2repo` 会把 Maven 本地仓库放在当前项目目录，避免本机 `~/.m2` 配置或权限问题导致构建失败。

启动成功后默认监听：

- `http://127.0.0.1:4000`

根路径 `/` 返回 `404` 是正常现象（代表服务已启动，但未定义根路由）。

### 1.3 打包运行（本地可选）

```bash
mvn -Dmaven.repo.local=.m2repo clean package
java -jar target/api-0.0.1-SNAPSHOT.jar
```

## 2. 配置说明

配置文件：`src/main/resources/application.yml`

### 2.1 环境变量（与当前 yml 一致）

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 `4000` |
| `DB_HOST` | MySQL 主机，默认 `192.168.1.19` |
| `DB_PASSWORD` | MySQL 密码，默认空 |
| `FLYWAY_ENABLED` | 是否启用 Flyway，默认 `false` |
| `CORS_ORIGIN` | 允许跨域来源，多个用英文逗号分隔；为空时由应用逻辑处理 |
| `NOVEL_TXT_DIR` | 小说文本目录，默认 `./txt`（生产建议用绝对路径） |

当前 JDBC URL 中 **端口固定为 `3306`、库名为 `video_manager`、用户名为 `root`**，若需改端口/库名/用户，请直接改 `application.yml` 或扩展为占位符后再通过环境变量注入。

### 2.2 示例（开发启动）

```bash
PORT=4000 \
DB_HOST=127.0.0.1 \
DB_PASSWORD=your_password \
FLYWAY_ENABLED=false \
CORS_ORIGIN=http://localhost:5173 \
NOVEL_TXT_DIR=./txt \
mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

### 2.3 健康检查

`application.yml` 中配置了 `management.endpoints`（`health`、`info`）。当前 **`pom.xml` 未引入 `spring-boot-starter-actuator`** 时这些端点不会生效；若需要部署探活，请添加该依赖，启用后一般可通过 **`/actuator/health`** 访问（与主服务同端口，路径以 Spring Boot 默认 Actuator 前缀为准）。

## 3. 部署

### 3.1 构建产物

在 `packages/java` 目录：

```bash
mvn -Dmaven.repo.local=.m2repo clean package
```

可执行 JAR：`target/api-0.0.1-SNAPSHOT.jar`（与 `pom.xml` 中 `artifactId` `api`、`version` `0.0.1-SNAPSHOT` 对应）。

### 3.2 运行环境

- **运行机**：JDK 21+（或 JRE 21，视发行版而定）；仅需运行 JAR 时不必安装 Maven。
- **数据库**：MySQL，且需存在配置中的库（当前为 `video_manager`），按需开启 Flyway。

将 JAR 拷贝到目标机后，设置环境变量并启动，例如：

```bash
export PORT=4000
export DB_HOST=你的MySQL主机
export DB_PASSWORD=你的密码
# export FLYWAY_ENABLED=true   # 需要 Flyway 时打开
export CORS_ORIGIN=https://你的前端域名
export NOVEL_TXT_DIR=/绝对路径/txt

java -jar api-0.0.1-SNAPSHOT.jar
```

生产环境建议：

- **`NOVEL_TXT_DIR`** 使用绝对路径，避免工作目录变化导致读不到文件。
- 用 **systemd、supervisor** 或 **容器** 托管上述 `java -jar` 命令，配置自动重启与日志轮转。

## 4. 项目架构

当前采用典型分层：

- **Controller 层**：处理 HTTP 路由和参数校验
- **Service 层**：承载业务逻辑接口与实现
- **Config 层**：应用配置、CORS、Jackson 定制
- **Common 层**：统一异常与错误响应
- **DTO 层**：请求/响应数据对象和校验注解

### 4.1 目录结构

```text
src/main/java/com/videomanager
├── ApiApplication.java          # Spring Boot 启动入口
├── common                       # 统一错误模型与异常处理
├── config                       # AppProperties/CORS/Jackson 等配置
├── videos                       # 视频相关 controller/service/dto
├── tags                         # 标签相关 controller/service/dto
└── novels                       # 小说相关 controller/service/dto
```

### 4.2 请求处理链路

1. 请求进入 Controller（例如 `VideosController` / `TagsController` / `NovelsController`）
2. 参数通过 Jakarta Validation 做校验（`@Valid` + DTO 注解）
3. 调用对应 Service 接口执行业务
4. 异常统一由 `GlobalExceptionHandler` 转换为标准错误响应 `ApiError`

## 5. 现状说明（开发中）

目前路由和分层结构已经搭好，但大部分 Service 实现仍是占位（`UnsupportedOperationException`），例如：

- `VideosServiceImpl`
- `TagsServiceImpl`
- `NovelsServiceImpl`

这意味着：

- 项目可以正常编译和启动；
- 但调用尚未实现的业务接口时会返回 500（由全局异常处理捕获）。

## 6. 常见问题

### 6.1 Maven 无法下载依赖

- 尝试使用：

```bash
mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

- 若仍失败，检查网络、代理和 Maven settings 配置是否正确。

### 6.2 端口被占用

改端口启动：

```bash
PORT=4001 mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

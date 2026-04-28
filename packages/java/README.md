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

### 1.3 打包运行（可选）

```bash
mvn -Dmaven.repo.local=.m2repo clean package
java -jar target/api-0.0.1-SNAPSHOT.jar
```

## 2. 配置说明

配置文件：`src/main/resources/application.yml`

常用环境变量：

- `PORT`：服务端口（默认 `4000`）
- `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`：MySQL 连接信息
- `FLYWAY_ENABLED`：是否启用 Flyway（默认 `false`）
- `CORS_ORIGIN`：允许跨域来源，多个用英文逗号分隔；为空时允许 `*`
- `NOVEL_TXT_DIR`：小说文本目录（默认 `./txt`）

示例：

```bash
PORT=4000 \
DB_HOST=127.0.0.1 \
DB_PORT=3306 \
DB_NAME=video_manager \
DB_USER=root \
DB_PASSWORD=your_password \
FLYWAY_ENABLED=false \
CORS_ORIGIN=http://localhost:5173 \
NOVEL_TXT_DIR=./txt \
mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

## 3. 项目架构

当前采用典型分层：

- **Controller 层**：处理 HTTP 路由和参数校验
- **Service 层**：承载业务逻辑接口与实现
- **Config 层**：应用配置、CORS、Jackson 定制
- **Common 层**：统一异常与错误响应
- **DTO 层**：请求/响应数据对象和校验注解

### 3.1 目录结构

```text
src/main/java/com/videomanager
├── ApiApplication.java          # Spring Boot 启动入口
├── common                       # 统一错误模型与异常处理
├── config                       # AppProperties/CORS/Jackson 等配置
├── videos                       # 视频相关 controller/service/dto
├── tags                         # 标签相关 controller/service/dto
└── novels                       # 小说相关 controller/service/dto
```

### 3.2 请求处理链路

1. 请求进入 Controller（例如 `VideosController` / `TagsController` / `NovelsController`）
2. 参数通过 Jakarta Validation 做校验（`@Valid` + DTO 注解）
3. 调用对应 Service 接口执行业务
4. 异常统一由 `GlobalExceptionHandler` 转换为标准错误响应 `ApiError`

## 4. 现状说明（开发中）

目前路由和分层结构已经搭好，但大部分 Service 实现仍是占位（`UnsupportedOperationException`），例如：

- `VideosServiceImpl`
- `TagsServiceImpl`
- `NovelsServiceImpl`

这意味着：

- 项目可以正常编译和启动；
- 但调用尚未实现的业务接口时会返回 500（由全局异常处理捕获）。

## 5. 常见问题

### 5.1 Maven 无法下载依赖

- 尝试使用：

```bash
mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

- 若仍失败，检查网络、代理和 Maven settings 配置是否正确。

### 5.2 端口被占用

改端口启动：

```bash
PORT=4001 mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

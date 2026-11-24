# Java 微服务容器化与 Ubuntu 部署设计

> 状态：设计稿（仅为方案，不含已执行的构建 / 部署动作）
> 适用代码：`java/`（Spring Boot 3.2.9 / Spring Cloud 2023.0.3 / JDK 21）
> 目标主机：单台 Ubuntu 22.04 / 24.04（amd64）

---

## 0. 结论（TL;DR）

- **镜像**：在 `java/` 放**一个**多阶段 `Dockerfile`，用 `--build-arg MODULE=<模块名>` 构建 5 个服务，避免 5 份重复 Dockerfile。运行镜像用 `eclipse-temurin:21-jre-jammy`，非 root、分层 jar、内置健康检查所需的 `curl`。
- **交付**：一期用 `docker save | gzip | ssh | docker load`（无需额外基础设施）；二期切到**私有 Registry**（GHCR 或服务器自建 `registry:2`），CI 推、服务器拉。
- **运行**：Ubuntu 上用 `docker compose`（v2）跑 5 个容器，只暴露网关 `4000`（前面可加 Nginx/Caddy 做 443）。MySQL、Redis 一期继续用宿主机现有实例，容器经 `host.docker.internal` / `172.17.0.1` 访问；业务服务不发布端口。
- **最关键的两个坑**：
  1. **架构**：开发机是 Apple Silicon（arm64），Ubuntu 大概率是 amd64。必须 `--platform linux/amd64` 构建，否则服务器上 `exec format error`。
  2. **网关路由**：容器内 `127.0.0.1` 不再是宿主机。必须把 `AUTH_SERVICE_URI` 等改成 `http://auth-service:4010` 这类 Compose 服务名。
- **版本**：镜像 tag 用 `版本号-git短SHA`，生产禁止 `latest`；回滚 = 改 `IMAGE_TAG` 再 `up -d`，数据库迁移只前进不回退。

---

## 1. 现状盘点（来自仓库）

| 项目 | 事实 | 对设计的影响 |
|---|---|---|
| 模块 | `gateway-service`(4000)、`auth-service`(4010)、`media-service`(4020)、`reading-service`(4030)、`office-service`(4040)、`service-common` | 5 个运行镜像；`service-common` 只作为依赖，不单独打包 |
| 构建 | Maven 多模块，`spring-boot-maven-plugin` 已配置 | 每个模块产出可执行 fat jar |
| 运行时 | Java 21（`<java.version>21</java.version>`），README 写 JDK 25 | 用 JDK 21 构建/运行即可；若要 25，替换两处镜像 tag |
| 配置 | 全部走环境变量占位符（`DB_HOST`、`REDIS_HOST`、`JWT_SECRET`、`NACOS_*`…） | 无需改代码即可容器化，用 `.env` 注入 |
| 注册中心 | Nacos 默认关闭，网关默认走固定 URI | 一期不开 Nacos，用 Compose 服务名；Nacos 作为可选 profile |
| 数据库 | MySQL，`auth-service` 负责 Flyway（`V1__create_users.sql`） | 只有 auth 需要迁移；启动顺序上 auth 必须先就绪 |
| 缓存 | Redis（4 个业务服务共享） | 需要 `REDIS_HOST/PASSWORD`，建议独立 DB index 或前缀 |
| 本地文件 | `media-service` 读取 `GALLERY_DIR`（只读图库）；`reading-service` 扫描并可能改写 `NOVEL_TXT_DIR` 下的 txt | 需要两个宿主机目录挂载：图库 `:ro`、小说目录 `:rw` |
| 认证 | 5 个服务共享同一个 `JWT_SECRET`（HS256） | 必须作为同一个 secret 注入所有容器 |
| 健康检查 | Actuator 已暴露 `health,info` | 可直接做 Docker healthcheck / 上线门禁 |

现状注意点：

- 各服务 `application.yml` 目前没有显式 `server.shutdown=graceful`，容器 `docker stop` 时可能硬中断请求；设计中通过环境变量 `SERVER_SHUTDOWN=graceful` 覆盖，无需改代码（也建议后续写进 yml）。
- 未开启 liveness/readiness 探针端点，设计中用 `MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED=true` 打开，给未来上 K8s 留路。
- 仓库里存在 `.m2repo/`、`logs/`、`run/`、`.env`，必须进 `.dockerignore`，否则镜像层会把本地 Maven 仓库和密钥一起打进去。

---

## 2. 目标与非目标

### 目标

1. 一条命令构建任意服务的 `linux/amd64` 镜像，可重复、可追溯（git SHA）。
2. 镜像可安全传到 Ubuntu 并离线加载，或从 Registry 拉取。
3. Ubuntu 上一条 `docker compose up -d` 拉起 5 个服务，带健康检查、日志轮转、资源限制、优雅停机。
4. 明确的首次部署、升级、回滚、数据库备份流程。
5. 单机可运维：出问题能看日志、能回滚、能定位是镜像问题还是配置问题。

### 非目标（本期不做）

- Kubernetes / Swarm / 多机编排、蓝绿发布、灰度。
- 把 MySQL / Redis 数据迁进容器（一期复用宿主机实例）。
- 改造前端 `web/` 的部署方式（只在网关 CORS 与反向代理层面预留）。
- 引入完整可观测性栈（Prometheus + Grafana + Loki 放到二期）。

---

## 3. 总体架构

```
┌──────────────────────────┐
│ 开发机 (macOS arm64)      │        ┌──────────────────────────┐
│ 或 GitHub Actions (amd64) │        │ 私有 Registry / GHCR      │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │ docker buildx --platform linux/amd64             │
             ▼                                                   │ push/pull（二期）
      image: video-manager/<module>:<ver>-<sha>  ────────────────┘
             │
             │ 一期：docker save | gzip | ssh | docker load
             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Ubuntu 24.04  /opt/video-manager                                          │
│                                                                          │
│  Nginx/Caddy :443 ──► gateway-service :4000（唯一对外）                   │
│                              │  backend 网络（服务名解析）                 │
│        ┌─────────────┬───────┴──────┬──────────────┐                     │
│        ▼             ▼              ▼              ▼                     │
│   auth-service   media-service  reading-service  office-service          │
│      :4010          :4020           :4030           :4040                │
│        │              │  /data/gallery(:ro)   /data/novels(:rw)          │
│        └──────────────┴──────────────┴──────────────┘                    │
│                              │                                           │
│                    宿主机 MySQL 3306 / Redis 6379                         │
│                    （或 docker-compose.deps.yml 自建）                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 镜像设计

### 4.1 一个 Dockerfile + `MODULE` 构建参数

放在 `java/Dockerfile`，构建上下文固定为 `java/`（这样能同时拿到父 pom 和 `service-common`）。

```dockerfile
# syntax=docker/dockerfile:1.7
ARG MODULE
ARG APP_PORT=4000

# ---------- 构建阶段 ----------
FROM maven:3.9-eclipse-temurin-21 AS build
ARG MODULE
WORKDIR /build

# 1) 只拷源码（父 pom 与子模块 pom 在源码目录结构里，必须一起进上下文）
COPY pom.xml ./
COPY service-common/pom.xml service-common/
COPY auth-service/pom.xml auth-service/
COPY media-service/pom.xml media-service/
COPY reading-service/pom.xml reading-service/
COPY gateway-service/pom.xml gateway-service/
COPY office-service/pom.xml office-service/
COPY service-common/src service-common/src
COPY ${MODULE}/src ${MODULE}/src

# 2) 构建；测试在 CI 里跑，镜像构建跳过
#    /root/.m2 用 BuildKit cache mount：跨构建复用，不在镜像层里留缓存
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl "${MODULE}" -am -Dmaven.test.skip=true package

# 3) 取出可执行 jar 并解成分层目录（Spring Boot 3.2 用 layertools）
RUN set -eux; \
    JAR="$(find "${MODULE}/target" -maxdepth 1 -name '*.jar' ! -name '*.original' | head -n1)"; \
    cp "$JAR" /build/app.jar; \
    java -Djarmode=layertools -jar /build/app.jar extract --destination /build/layers

# ---------- 运行阶段 ----------
FROM eclipse-temurin:21-jre-jammy AS runtime

ARG MODULE
ARG APP_PORT
LABEL org.opencontainers.image.title="video-manager/${MODULE}" \
      org.opencontainers.image.source="https://github.com/<org>/<repo>"

ENV TZ=Asia/Shanghai \
    LANG=C.UTF-8 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError -XX:-UsePerfData -Duser.timezone=Asia/Shanghai -Dfile.encoding=UTF-8"

# curl 用于 compose healthcheck；tzdata 保证日志时间正确
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tzdata \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 10001 app \
 && useradd -u 10001 -g app -m -s /usr/sbin/nologin app

WORKDIR /app
COPY --from=build --chown=10001:10001 /build/layers/dependencies/          ./
COPY --from=build --chown=10001:10001 /build/layers/spring-boot-loader/   ./
COPY --from=build --chown=10001:10001 /build/layers/snapshot-dependencies/ ./
COPY --from=build --chown=10001:10001 /build/layers/application/          ./

USER 10001:10001
EXPOSE ${APP_PORT}
ENTRYPOINT ["java", "org.springframework.boot.loader.JarLauncher"]
```

构建命令（每个模块一条，可脚本化）：

```bash
docker buildx build --platform linux/amd64 \
  --build-arg MODULE=auth-service --build-arg APP_PORT=4010 \
  -t video-manager/auth-service:1.0.0-$(git rev-parse --short HEAD) \
  --load java/
```

设计取舍：

| 选择 | 理由 | 备选 |
|---|---|---|
| 多阶段构建 | 构建机无需装 JDK/Maven，产物只含 JRE | 本机 `mvn package` 后拷 jar（依赖宿主机环境，不推荐） |
| `eclipse-temurin:21-jre-jammy` | glibc、字体/时区生态完整，Spring Boot 官方推荐系 | `alpine` 镜像小但 musl 在网络/DNS 场景有坑；`distroless` 更安全但排障难 |
| 分层 jar | 依赖层稳定，改业务代码只重建 application 层，推拉更快 | 直接 COPY fat jar，简单但每次全量 |
| 非 root（10001） | 容器逃逸/误写降低影响 | root，省事但不合规 |
| 内置 `curl` | healthcheck 简单可靠 | `wget`/`bash /dev/tcp`（镜像里不一定有，且不易读） |
| `JAVA_TOOL_OPTIONS` | 可在 compose 里按服务覆盖堆参数 | 写死 ENTRYPOINT 参数，不灵活 |

### 4.2 镜像分层顺序

`dependencies` → `spring-boot-loader` → `snapshot-dependencies` → `application`，与 `layertools` 生成的 `layers.idx` 一致。业务改动只影响最后一层，Registry 拉取时通常只下载几 MB。

> 注意：Spring Boot 3.3+ 改成了 `-Djarmode=tools`，本项目是 3.2.9，`layertools` 正确。升级 Boot 版本时需同步改这一行。

### 4.3 运行时基线

- **工作目录** `/app`，只放解压后的分层内容，无源码、无 `.env`。
- **时区**：镜像 `TZ` + JVM `-Duser.timezone` 双保险，JDBC URL 已有 `serverTimezone=Asia/Shanghai`。
- **JVM**：`MaxRAMPercentage=70` 配合 compose 的 `mem_limit`；`ExitOnOutOfMemoryError` 让 OOM 快速失败并由 `restart: unless-stopped` 拉起；`-XX:-UsePerfData` 减少对 `/tmp` 的写入（为将来 `read_only: true` 做准备）。
- **文件描述符 / 线程**：默认即可；若媒体服务并发高，再调 `-XX:ActiveProcessorCount` 与 `ulimits.nofile`。

### 4.4 健康探针与优雅停机

不改代码，用环境变量打开：

```yaml
environment:
  MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED: "true"   # /actuator/health/liveness|readiness
  SERVER_SHUTDOWN: "graceful"
  SPRING_LIFECYCLE_TIMEOUT_PER_SHUTDOWN_PHASE: "25s"
```

- Compose healthcheck 打 `/actuator/health`（含 DB/Redis 指标），用于**上线门禁**；容器内进程存活用 `/actuator/health/liveness`。
- `stop_grace_period: 40s` > `25s`，保证 `docker stop` 时在途请求处理完。
- 建议后续把这两项写进各服务 `application.yml`，避免依赖环境变量记忆。

### 4.5 `.dockerignore`（`java/.dockerignore`）

```
**/target/
.m2repo/
.git/
.idea/
.vscode/
.claude/
.github/
logs/
run/
docs/
.env
.env.*
*.log
.DS_Store
README.md
todo.md
start-local.sh
```

---

## 5. 构建与版本

### 5.1 构建位置

| 场景 | 做法 | 说明 |
|---|---|---|
| 开发机（arm64） | `docker buildx build --platform linux/amd64` | 必须显式指定，否则产物在 amd64 Ubuntu 上无法运行 |
| GitHub Actions（amd64） | 矩阵并行构建 5 个模块 | 推荐长期方案，构建缓存与产物归档都集中 |
| 服务器本地构建 | `git pull && docker build` | 仅应急/无外网时；服务器需装 JDK/Maven 或忍受慢构建 |

QEMU 模拟构建可以跑，但 Maven 编译会慢 3–8 倍；有条件时用 CI 的 amd64 runner。

### 5.2 标签规范

```
video-manager/<module>:<semver>-<git-short-sha>     例：1.0.0-a1b2c3d
video-manager/<module>:<git-short-sha>              例：a1b2c3d（每次提交）
```

- 生产只用不可变 tag；`latest` 只允许出现在开发机。
- 5 个模块**同一次提交构建出的镜像必须同 tag**，避免版本漂移（尤其 `service-common` 变更时）。
- 建议同时打 `org.opencontainers.image.revision` 与 `created` 标签，便于反查。

### 5.3 构建脚本（`java/deploy/Makefile` 设计）

```makefile
TAG      ?= 1.0.0-$(shell git rev-parse --short HEAD)
PLATFORM ?= linux/amd64
MODULES  := gateway-service auth-service media-service reading-service office-service

build:
	@set -e; for m in $(MODULES); do \
	  case $$m in \
	    gateway-service) p=4000 ;; \
	    auth-service)    p=4010 ;; \
	    media-service)   p=4020 ;; \
	    reading-service) p=4030 ;; \
	    office-service)  p=4040 ;; \
	  esac; \
	  echo ">> building $$m:$(TAG)"; \
	  docker buildx build --platform $(PLATFORM) \
	    --build-arg MODULE=$$m --build-arg APP_PORT=$$p \
	    -t video-manager/$$m:$(TAG) --load . ; \
	done

save:
	mkdir -p dist
	docker save $(foreach m,$(MODULES),video-manager/$(m):$(TAG)) | gzip -1 > dist/video-manager-$(TAG).tar.gz
```

> 首次构建会下载 Maven 依赖（约 1–3 分钟），之后靠 BuildKit 缓存目录复用。若本机没有 buildx，把 `docker buildx build --platform ... --load` 换成 `docker build --platform ...`。

---

## 6. 制品传输：三条通道

### 6.1 对比

| 方案 | 适用阶段 | 优点 | 缺点 |
|---|---|---|---|
| **A. save / ssh / load** | 一期（单机、无 Registry） | 零基础设施、离线可用、gzip 后 5 个镜像约 400–600MB | 手工、不可审计、需要 SSH/scp 权限；镜像不会自动清理 |
| **B. 私有 Registry** | 二期（推荐目标态） | `pull` 即部署、按 digest 精确回滚、天然审计 | 需要 TLS/鉴权/存储；公网暴露要谨慎 |
| **C. 服务器上构建** | 应急 | 不传镜像 | 服务器要装工具链、构建慢、构建不可复现 |

### 6.2 方案 A：离线传输（一期落地）

```bash
# 构建机
docker save video-manager/gateway-service:1.0.0-a1b2c3d \
            video-manager/auth-service:1.0.0-a1b2c3d \
            video-manager/media-service:1.0.0-a1b2c3d \
            video-manager/reading-service:1.0.0-a1b2c3d \
            video-manager/office-service:1.0.0-a1b2c3d \
  | gzip -1 > video-manager-1.0.0-a1b2c3d.tar.gz

scp video-manager-1.0.0-a1b2c3d.tar.gz ubuntu@<host>:/opt/video-manager/images/

# 服务器
gunzip -c video-manager-1.0.0-a1b2c3d.tar.gz | docker load
docker images | grep video-manager
```

要点：

- `docker save` 保留镜像的 tag 与层数据，但不含运行配置；`load` 后先确认 tag 在，再比对 `docker image inspect -f '{{.Id}}'` 的镜像 ID 是否与构建机一致。
- 传完后保留最近 2 个版本，旧包按时间清理，避免磁盘被镜像包 + 镜像本身双份占满。
- `gzip -1` 比默认压缩快很多，镜像本身已是压缩数据，压缩率提升有限。

### 6.3 方案 B：Registry（二期）

- **GHCR**：CI 直接 `push ghcr.io/<org>/video-manager-<module>:<tag>`，服务器 `docker login` 后 `compose pull`。需要服务器能出网。
- **自建 `registry:2`**：只监听 `127.0.0.1:5000` 或内网地址，前面用 Nginx + Basic Auth + TLS；`/var/lib/registry` 挂载独立磁盘。
- 部署时用 `docker compose pull` + `up -d`；回滚直接指定旧 tag 或 `@sha256:` digest。

### 6.4 完整性校验

无论哪种通道，部署脚本都应校验：

1. 镜像存在且 `Architecture=amd64`；
2. 镜像 tag 与 `.env` 中的 `IMAGE_TAG` 一致；
3. 启动后 `curl http://127.0.0.1:4000/actuator/health` 返回 `UP`；
4. 冒烟：`POST /api/auth/login` 成功、`GET /api/videos` 带 token 返回 200。

---

## 7. Ubuntu 运行时设计

### 7.1 目录布局与用户

```
/opt/video-manager/
├── docker-compose.yml          # 5 个服务
├── .env                        # 600 root:root，含 DB/Redis/JWT 密码
├── images/                     # 一期离线镜像包
├── backups/                    # 升级前 mysqldump
└── data/
    ├── gallery/                # 挂给 media-service，只读
    └── novels/                 # 挂给 reading-service，可写
```

- 部署用户：`deploy` 加入 `docker` 组（等价 root，需接受）；或只用 root 通过 `sudo` 操作，避免把 docker 组随便给普通账号。
- `.env` 的属主要与执行 `docker compose` 的用户一致（如 `deploy:deploy` + `600`）；若坚持 `root:root 600`，则 compose 也必须用 `sudo` 执行，否则读不到变量。
- 目录权限：`chown -R 10001:10001 /opt/video-manager/data/novels`；`gallery` 至少对 10001 可读（`:ro` 只限制挂载点写，不解决文件权限）。
- 若沿用现有 `/home/<user>/Pictures`：注意 home 目录默认 `750`，容器内非 root 可能读不到，建议软链或 bind 到 `/opt/video-manager/data/gallery` 并放开读权限。

### 7.2 Compose 拓扑（`docker-compose.yml`）

```yaml
name: video-manager

x-app: &app
  restart: unless-stopped
  env_file: [.env]
  networks: [backend]
  security_opt: ["no-new-privileges:true"]
  cap_drop: ["ALL"]
  logging:
    driver: json-file
    options:
      max-size: "50m"
      max-file: "5"
  stop_grace_period: 40s

services:
  auth-service:
    <<: *app
    image: video-manager/auth-service:${IMAGE_TAG:?IMAGE_TAG is required}
    environment:
      AUTH_PORT: "4010"
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT:-3306}
      DB_NAME: ${DB_NAME:-video_manager}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PORT: ${REDIS_PORT:-6379}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      FLYWAY_ENABLED: "true"
      NACOS_DISCOVERY_ENABLED: "false"
      MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED: "true"
      SERVER_SHUTDOWN: graceful
      SPRING_LIFECYCLE_TIMEOUT_PER_SHUTDOWN_PHASE: 25s
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:4010/actuator/health | grep -q '\"status\":\"UP\"'"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 90s
    mem_limit: 768m
    cpus: 1.0

  media-service:
    <<: *app
    image: video-manager/media-service:${IMAGE_TAG}
    environment:
      MEDIA_PORT: "4020"
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT:-3306}
      DB_NAME: ${DB_NAME:-video_manager}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      GALLERY_DIR: /data/gallery
      SERVER_SHUTDOWN: graceful
    volumes:
      - /opt/video-manager/data/gallery:/data/gallery:ro
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:4020/actuator/health | grep -q '\"status\":\"UP\"'"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 60s
    mem_limit: 768m
    cpus: 1.0

  reading-service:
    <<: *app
    image: video-manager/reading-service:${IMAGE_TAG}
    environment:
      READING_PORT: "4030"
      DB_HOST: ${DB_HOST}
      DB_NAME: ${DB_NAME:-video_manager}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      NOVEL_TXT_DIR: /data/novels
      GALLERY_DIR: /data/gallery   # reading 的 application.yml 无默认值，必须给值否则占位符解析失败
      TREEHOLE_SCHEMA: ${TREEHOLE_SCHEMA:-jandan}
      SERVER_SHUTDOWN: graceful
    volumes:
      - /opt/video-manager/data/novels:/data/novels:rw
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:4030/actuator/health | grep -q '\"status\":\"UP\"'"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 60s
    mem_limit: 768m
    cpus: 1.0

  office-service:
    <<: *app
    image: video-manager/office-service:${IMAGE_TAG}
    environment:
      OFFICE_PORT: "4040"
      DB_HOST: ${DB_HOST}
      DB_NAME: ${DB_NAME:-video_manager}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SERVER_SHUTDOWN: graceful
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:4040/actuator/health | grep -q '\"status\":\"UP\"'"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 60s
    mem_limit: 512m
    cpus: 0.8

  gateway-service:
    <<: *app
    image: video-manager/gateway-service:${IMAGE_TAG}
    ports:
      - "127.0.0.1:4000:4000"   # 交给宿主机 Nginx/Caddy 反代；无 443 时改 "4000:4000" + ufw 限网段
    environment:
      GATEWAY_PORT: "4000"
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN:-https://your.domain}
      AUTH_SERVICE_URI: http://auth-service:4010
      MEDIA_SERVICE_URI: http://media-service:4020
      READING_SERVICE_URI: http://reading-service:4030
      OFFICE_SERVICE_URI: http://office-service:4040
      NACOS_DISCOVERY_ENABLED: "false"
      SERVER_SHUTDOWN: graceful
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:4000/actuator/health | grep -q '\"status\":\"UP\"'"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 60s
    depends_on:
      # 只等认证就绪（登录/鉴权是全局入口）；其余服务由 compose 并行启动，
      # 某个业务服务挂掉只影响对应路由，不应拖住整个网关。
      auth-service: { condition: service_healthy }
    mem_limit: 512m
    cpus: 0.8

networks:
  backend:
    driver: bridge
    # 若 MySQL 在宿主机：取消下面注释，用 172.17.0.1 访问（需 MySQL 监听 docker0 并加 ufw 白名单）
    # ipam: { config: [{ subnet: 172.28.0.0/16 }] }
```

> `depends_on` 只保证启动顺序，不解决「运行中 DB 挂掉」。DB 长时间不可用时容器会变 unhealthy 但不自动重启；如需自动拉起，再加 `willfarrell/autoheal` 或交给 systemd 定时检查（二期）。

### 7.3 网络与端口

| 端口 | 谁访问 | 暴露方式 |
|---|---|---|
| 4000 | 浏览器 / 前端 / 反代 | 仅绑 `127.0.0.1`，由 Nginx/Caddy 转 443 |
| 4010/4020/4030/4040 | 仅网关 | Compose 内网，不发布 `ports`；Dockerfile 的 `EXPOSE` 只是文档 |
| 3306 MySQL | 容器 | 宿主机监听 `127.0.0.1` + `172.17.0.1`，`ufw allow from 172.17.0.0/16 to any port 3306` |
| 6379 Redis | 容器 | 同上，且必须设 `requirepass` |

ufw 基线：

```bash
ufw default deny incoming
ufw allow 22/tcp
ufw allow 80,443/tcp
ufw allow from 172.17.0.0/16 to any port 3306 proto tcp
ufw allow from 172.17.0.0/16 to any port 6379 proto tcp
ufw enable
```

### 7.4 依赖组件

**一期（推荐）**：复用宿主机已有 MySQL 8 / Redis 7。

- 容器访问宿主机：`DB_HOST=172.17.0.1`（docker0 网关，最稳，不依赖 DNS）或 `host.docker.internal` + `extra_hosts: ["host.docker.internal:host-gateway"]`。
- 前提：MySQL `bind-address` 不能只是 `127.0.0.1`，需加 `172.17.0.1` 或 `0.0.0.0`（后者必须配合 ufw/云安全组）。
- 数据库账号最小权限：业务账号只给 `video_manager.*` 的 DML；`reading-service` 另需 `jandan.*`（或 `TREEHOLE_SCHEMA` 指定库）的 `SELECT`。Flyway 用的账号需要 DDL。
- Redis 必须设密码，并区分用途：建议给本项目独立 `requirepass` 或 ACL 用户，避免和其他应用互相 `FLUSHDB`。

**二期（可选，`docker-compose.deps.yml`）**：自建 `mysql:8.0` + `redis:7`，命名卷持久化，`--character-set-server=utf8mb4`、`--default-time-zone=+08:00`，Redis 开 AOF。用于没有现成 DB 或想完全自包含的场景；注意数据迁移与备份策略不同。

**Nacos**：一期关闭（`NACOS_DISCOVERY_ENABLED=false`），网关走固定 URI；二期如启用，Nacos 容器需与业务同网络，`NACOS_SERVER_ADDR=nacos:8848`，且 `AUTH_SERVICE_URI=lb://auth-service`。

### 7.5 启动顺序

```
MySQL / Redis 就绪（宿主机，部署前检查）
        │
        ▼
auth-service（执行 Flyway）──healthy──► media / reading / office ──healthy──► gateway
```

- 首次部署必须等 auth healthy 再起其余服务，否则 Flyway 与业务读库可能撞车（本期迁移只有一张 `users` 表，风险低，但流程要固定）。
- 部署脚本用 `docker compose up -d --wait --wait-timeout 240`，失败即中止并打印 `docker compose ps` 与最近日志。

### 7.6 卷与权限

| 宿主机 | 容器 | 模式 | 说明 |
|---|---|---|---|
| `/opt/video-manager/data/gallery` | `/data/gallery` | `ro` | 图库只读；`media-service` 只做列表与文件流 |
| `/opt/video-manager/data/novels` | `/data/novels` | `rw` | `reading-service` 扫描时会**改写非 UTF-8 的 txt**，必须可写 |
| 日志 | — | — | 不落卷，走 json-file 轮转 + `docker logs`；需要长期留存再上 Loki |

注意：

- 图库若很大，`ro` 挂载不会复制数据，但会占用 inode 遍历时间；首次图库扫描可能较慢。
- 小说目录属主必须是 `10001`，否则 `Files.writeString` 抛 `AccessDeniedException`，表现为扫描部分成功。
- 备份只备份 `novels`（可选）与 MySQL；`gallery` 是原始素材，不在部署链里动。

### 7.7 资源规划

单机 4C8G 示例：

| 服务 | `mem_limit` | `cpus` | 实际堆（70%） |
|---|---:|---:|---:|
| gateway | 512m | 0.8 | ~358m |
| auth | 768m | 1.0 | ~538m |
| media | 768m | 1.0 | ~538m |
| reading | 768m | 1.0 | ~538m |
| office | 512m | 0.8 | ~358m |
| 合计上限 | ~3.5G | 4.6 | — |

- JVM 元空间 + 直接内存 + 线程栈约占 25–30%，`MaxRAMPercentage=70` 是保守值；若出现容器 OOMKilled 而堆没满，降到 60 或提高 limit。
- `mem_limit`/`cpus` 是 Compose v2 单机可用字段（`deploy.resources` 在非 Swarm 下部分版本不生效），统一用前者。
- 磁盘：5 个镜像约 1.5GB，加离线包与构建缓存预留 15GB；`/var/lib/docker` 建议单独分区或定期 `docker system prune`（谨慎，先确认无悬空镜像依赖）。

### 7.8 日志

- 统一 `json-file`，`max-size=50m`、`max-file=5`，单容器上限 250MB；5 个服务约 1.25GB，避免日志打满根分区。
- 应用侧保持默认 logback 输出到 stdout/stderr，不写文件；需要按天切割/检索时二期接 Promtail + Loki。
- 时间统一 `Asia/Shanghai`，否则日志与数据库时间对不上，排查会非常痛苦。

### 7.9 安全基线

- 非 root（10001）、`no-new-privileges`、`cap_drop: [ALL]`（如无特殊需求）。
- 二期可加 `read_only: true` + `tmpfs: /tmp`；当前先观察 JVM 是否写 `/tmp`（`-XX:-UsePerfData` 已减少写入）。
- `.env` 权限 `600`，属主 root；不要把密码写进 compose 文件或镜像。
- 业务端口不发布；网关只绑回环；SSH 用密钥 + 禁用密码登录（若尚未做）。
- 定期 `docker scout`/`trivy` 扫描镜像（CI 里加一步，失败不阻断但告警）。
- 生产必须替换默认 `JWT_SECRET`（≥32 字节随机），5 个容器保持同一值。

---

## 8. 配置与密钥

### 8.1 配置矩阵（`.env`）

| 变量 | 作用域 | 示例 | 备注 |
|---|---|---|---|
| `IMAGE_TAG` | compose | `1.0.0-a1b2c3d` | 必填，禁止 `latest` |
| `DB_HOST` | 4 个业务服务 | `172.17.0.1` | 容器内不能用 `127.0.0.1` |
| `DB_PORT` / `DB_NAME` | 同上 | `3306` / `video_manager` | |
| `DB_USERNAME` / `DB_PASSWORD` | 同上 | `app` / `***` | 不进 git |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | 同上 | `172.17.0.1` / `6379` / `***` | |
| `JWT_SECRET` | 5 个服务 | 32+ 字节随机 | 必须一致 |
| `TREEHOLE_SCHEMA` | reading | `jandan` | 与主库同实例 |
| `CORS_ORIGIN` | gateway | `https://your.domain` | 不要长期用 `*` |
| `GALLERY_DIR` | media | `/data/gallery` | 容器内路径写死在 compose 更清晰 |
| `NOVEL_TXT_DIR` | reading | `/data/novels` | 同上 |

### 8.2 密钥管理

- 一期：`/opt/video-manager/.env`（`chmod 600`），由部署者手工维护；`.env.example` 只放占位符。
- 二期：Docker secrets 需要 Swarm，单机不划算；可改用 `sops`/`age` 加密的 env 文件，或 Vault/云 KMS。CI 侧用 GitHub Environments secrets，不在日志回显。
- 轮换 `JWT_SECRET` 会导致所有已签发 token 失效，需在低峰期并提前通知。

---

## 9. 首次部署 Runbook（清单）

> 以下为实施步骤清单，本次未执行。

**A. 服务器准备**

1. 确认 `uname -m` 为 `x86_64`；`lsb_release -a` 确认版本。
2. 安装 Docker Engine + Compose 插件（官方 apt 源），`docker compose version` ≥ 2.20：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

3. `systemctl enable --now docker`；配置 `/etc/docker/daemon.json` 统一日志轮转与重启行为，然后 `systemctl restart docker`：

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" },
  "live-restore": true
}
```

4. 创建 `/opt/video-manager/{images,backups,data/gallery,data/novels}`。
5. 校验宿主机 MySQL / Redis：版本、字符集 `utf8mb4`、时区 `+08:00`、远程连接权限、`jandan` 库存在。
6. 准备数据库账号与最小权限；确认 `video_manager` 现有数据已备份。
7. ufw 规则；确认 4000 不直接对公网（或明确接受）。

**B. 镜像交付**

8. 构建机 `make build`（强制 `linux/amd64`），记录 tag 与 `git rev-parse HEAD`。
9. `make save` → scp 到 `images/`；服务器 `docker load` 并核对镜像 ID。
10. 校验 `docker image inspect -f '{{.Architecture}}'` 为 `amd64`。

**C. 配置与启动**

11. 写 `.env`（600），逐项核对 DB/Redis/JWT；`docker compose config` 检查变量是否解析。
12. `docker compose pull`（二期）或确认本地镜像存在（一期）。
13. `docker compose up -d --wait --wait-timeout 240`。
14. `docker compose ps` 全部 `healthy`；`docker compose logs --tail=100 auth-service` 确认 Flyway 成功。

**D. 验证**

15. `curl -fsS http://127.0.0.1:4000/actuator/health` → `{"status":"UP"}`。
16. `POST /api/auth/login`（真实账号）→ 拿到 `accessToken`。
17. `GET /api/videos`、`/api/tasks`、`/api/novels`、`/api/gallery`、`/api/treehole` 各打一次（带 token），确认 200 且非空数据正确。
18. 图库文件流：`GET /api/gallery/file?name=...` 返回正确 `Content-Type` 与内容长度。
19. 小说扫描：触发一次 `GET /api/scanning`，确认容器内 `/data/novels` 可写、无权限错误。
20. 重启策略：`docker restart auth-service`，确认网关恢复；`docker stop gateway-service` 观察是否在 40s 内优雅退出。

---

## 10. 升级、回滚与数据库迁移

### 升级

```bash
# 1) 备份
mysqldump --single-transaction --routines --triggers video_manager \
  | gzip > /opt/video-manager/backups/video_manager-$(date +%F-%H%M).sql.gz

# 2) 加载/拉取新镜像（tag 与旧版不同）
docker load < images/video-manager-1.1.0-<sha>.tar.gz
# 3) 只滚动业务服务，最后动网关
docker compose up -d --no-deps auth-service          # 先让 Flyway 跑完
docker compose up -d --no-deps media-service reading-service office-service
docker compose up -d --no-deps gateway-service
# 4) 门禁
docker compose up -d --wait && ./smoke-test.sh
```

顺序原则：**先迁移（auth）→ 再业务 → 最后网关**；5 个服务同 tag，避免 `service-common` 变更导致协议不一致。

### 回滚

```bash
# .env 中 IMAGE_TAG 改回上一个版本，然后：
docker compose up -d --no-deps auth-service media-service reading-service office-service gateway-service
```

限制：

- Flyway 迁移**只前进**。若新版本包含破坏性 DDL（删列/改类型），回滚代码会读不到数据。约定：每个版本的迁移至少对上一版本兼容（expand/contract：先加列、双写、再删旧列）。
- 回滚前同样做一次 dump，尤其是 auth 升级后。
- 保留最近 2 个版本的镜像包与 7 天数据库备份。

### 迁移作业（可选演进）

目前 Flyway 随 auth 启动执行，属于「应用启动即迁移」。单实例下这是最简单可靠的方案；多副本或需要「迁移失败可重试、不阻塞启动」时，二期再拆独立 job：

- 方案一：用 `flyway/flyway` 官方镜像 + 挂载 `auth-service/src/main/resources/db/migration`，执行 `migrate`；应用侧设 `FLYWAY_ENABLED=false`。
- 方案二：保留 auth 镜像，在部署脚本里先 `docker compose run --rm --no-deps auth-service`，等进程退出码为 0（Flyway 成功、应用启动）再杀掉/继续；实现简单但语义不干净，不作为默认。

无论哪种，都要保证**同一时刻只有一个迁移进程**（Compose 单机天然满足）。

---

## 11. 可观测性

一期（零额外组件）：

- `docker compose ps` + healthcheck 状态；
- `docker compose logs -f --tail=200 <svc>`；
- `docker stats` 看内存/CPU；
- 网关访问日志（Spring Cloud Gateway 默认 debug 才详细，必要时开 `logging.level.org.springframework.cloud.gateway=INFO`）；
- 磁盘/内存/容器重启次数可用 node_exporter 或简单 cron 脚本（二期）。

二期：

- 各服务加 `micrometer-registry-prometheus`，暴露 `/actuator/prometheus`；Prometheus + Grafana 面板：QPS、P99、JVM heap、Hikari 连接池、Redis 延迟。
- Loki + Promtail 收容器日志，替代 `docker logs`。
- 告警：容器 unhealthy、5xx 比例、磁盘 >80%、MySQL 连接数。

---

## 12. CI/CD 流水线（GitHub Actions 设计）

```yaml
name: docker-build
on:
  push:
    branches: [main]
    tags: ["v*"]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [gateway-service, auth-service, media-service, reading-service, office-service]
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: java
          platforms: linux/amd64
          build-args: |
            MODULE=${{ matrix.module }}
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/video-manager-${{ matrix.module }}:${{ github.sha }}
            ghcr.io/${{ github.repository_owner }}/video-manager-${{ matrix.module }}:latest
          cache-from: type=gha,scope=${{ matrix.module }}
          cache-to: type=gha,mode=max,scope=${{ matrix.module }}
          labels: |
            org.opencontainers.image.revision=${{ github.sha }}
            org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
```

部署 job（手动触发/审批）：

- SSH 到服务器执行 `docker compose pull && docker compose up -d --wait`；
- 失败自动回滚到上一个 `IMAGE_TAG`；
- 冒烟脚本失败即告警，不继续。

注意：

- `latest` 仅供开发；生产部署用 `${{ github.sha }}` 或 semver tag。
- 5 个矩阵任务会并行拉 Maven 依赖，`cache-from/to` 按 module 分 scope，避免互相覆盖。
- 仓库无 CI runner 时，退化为本地 `make build && make save && scp`。

---

## 13. 风险与预案

| # | 风险 | 现象 | 预案 |
|---|---|---|---|
| 1 | 架构不匹配 | `exec format error` | 构建恒加 `--platform linux/amd64`；部署前查 `.Architecture` |
| 2 | 容器内 `127.0.0.1` 指向自己 | 网关 502、auth 连不上 DB | 服务间用 Compose 服务名；DB 用 `172.17.0.1` / `host-gateway` |
| 3 | Nacos 未部署却开启 | 启动报 `NacosException` | 一期显式 `NACOS_DISCOVERY_ENABLED=false` |
| 4 | 图库/小说目录权限 | 图库 500、扫描 `AccessDenied` | 属主 10001；`gallery` 可读；`novels` 可写 |
| 5 | 时区不对 | 日志与库时间差 8 小时 | `TZ` + JVM `-Duser.timezone` + MySQL `+08:00` |
| 6 | Flyway 失败 | auth 起不来，网关 502 | 升级前 dump；先单独起 auth 看日志；迁移只前进 |
| 7 | `.env` 泄漏 | 密钥进镜像/仓库 | `.dockerignore`、`.gitignore`、600 权限、CI secret |
| 8 | 镜像/日志撑满磁盘 | Docker 报 `no space left` | 日志轮转；保留 2 个版本；`docker image prune` 白名单化 |
| 9 | 内存超卖 | 容器 OOMKilled、频繁重启 | 按表设置 `mem_limit`；`MaxRAMPercentage` 下调 |
| 10 | 健康检查缺失 `curl` | 容器永远 unhealthy | 镜像内置 curl（已设计）或改 `bash /dev/tcp` |
| 11 | 反代未配置 | 4000 暴露公网 / CORS 报错 | 只绑回环；`CORS_ORIGIN` 收敛为实际域名 |
| 12 | 优雅停机未生效 | 发布时 502 抖动 | `stop_grace_period` > `spring.lifecycle.timeout`；实测 `docker stop` |

---

## 14. 实施里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| M0 | 服务器与环境预检（架构、Docker、MySQL/Redis、目录、ufw） | 检查清单全绿 |
| M1 | 本地构建 5 个 amd64 镜像，`docker run` 单服务连通 DB/Redis | 单容器 `/actuator/health` UP |
| M2 | 离线传输 + 服务器 `docker load` + compose 首启 | 5 容器 healthy，登录/列表接口通过 |
| M3 | 升级/回滚演练（改 tag、造一次失败、回滚） | 回滚 10 分钟内完成，数据无损 |
| M4 | CI 构建 + Registry（GHCR 或自建） | push/pull 全自动，tag 可追溯 |
| M5 | 可观测性与告警（Prometheus/Loki）+ 备份定时任务 | 面板可用，备份可恢复演练 |

---

## 15. 待确认问题（不阻塞设计）

1. Ubuntu 机器架构与规格（amd64？CPU/内存/磁盘？），是否已有 Docker？
2. MySQL / Redis 是否就在这台 Ubuntu 上（还是远程/云托管）？版本、字符集、账号权限？
3. 是否有域名与证书（决定 Nginx/Caddy 反代与 `CORS_ORIGIN`），还是先内网 IP 访问？
4. 服务器能否访问 GitHub/公网 Registry（决定一期离线包是否长期保留）？
5. 前端 `web/` 是否也容器化，还是继续静态托管（影响反代与 CORS 设计）？
6. 现有 `/home/.../Pictures` 图库是否直接挂载，还是先同步到 `/opt/video-manager/data/gallery`？

---

## 附录 A：新增文件清单（实施时创建）

```
java/Dockerfile
java/.dockerignore
java/deploy/docker-compose.yml
java/deploy/docker-compose.deps.yml     # 可选：自建 MySQL/Redis
java/deploy/.env.example
java/deploy/Makefile
java/deploy/smoke-test.sh
java/deploy/nginx.conf                  # 可选：宿主机反代
.github/workflows/docker-build.yml      # 可选：CI
```

## 附录 B：与现有代码的兼容性说明

- **无需改业务代码**：所有配置已是环境变量占位符；`GALLERY_DIR`、`NOVEL_TXT_DIR` 可直接指向挂载点。
- **建议的两处小改动**（可后续做）：`application.yml` 增加 `server.shutdown: graceful` 与 `management.endpoint.health.probes.enabled: true`；当前用环境变量等价覆盖。
- **镜像内不包含**：`web/` 静态资源、`tools/`、`.m2repo/`、`logs/`、`.env`。
- **`service-common` 不单独出镜像**，通过 `-am` 一起编译进各服务 jar。
- 本设计假设 JDK 21 运行；README 的「JDK 25」如果是硬要求，将两处镜像 tag 改为 `temurin-25` 并回归测试。

## 附录 C：反向代理样例（可选，宿主机 Nginx）

网关已处理 CORS，反代不要再加 `Access-Control-*`，否则会重复头。

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name your.domain;

    ssl_certificate     /etc/letsencrypt/live/your.domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_buffering off;   # 图库文件流、可能的 SSE 场景
    }
}

server {
    listen 80;
    server_name your.domain;
    return 301 https://$host$request_uri;
}
```

前置条件：`CORS_ORIGIN=https://your.domain`；证书可用 certbot 申请；80/443 已在 ufw 放行，4000 仍只绑 `127.0.0.1`。


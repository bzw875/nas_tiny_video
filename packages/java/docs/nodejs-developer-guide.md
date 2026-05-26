# Java 工程导览：给 NodeJS 开发者看的说明

这份文档从 NodeJS 后端开发者的视角解释当前 `packages/java` 工程。你可以把它理解成一个 Spring Boot 写的 REST API 服务，功能上类似一个 Express/Koa/NestJS 后端，负责给前端提供视频、标签、小说、图库图片和 `aish123` 数据查询接口。

## 1. 先建立心智模型

如果你熟悉 NodeJS，可以先用下面的类比理解：

| Java / Spring Boot | NodeJS 里大概对应什么 | 本工程里的例子 |
| --- | --- | --- |
| `pom.xml` | `package.json` | 定义依赖、Java 版本、构建插件 |
| Maven | `npm` / `pnpm` | 下载依赖、启动、打包 |
| `ApiApplication.java` | `server.js` / `main.ts` | 应用启动入口 |
| `@RestController` | Express Router / Nest Controller | 接收 HTTP 请求 |
| `@Service` | service 层对象 | 写业务逻辑 |
| `@Mapper` + XML | ORM/SQL repository | MyBatis 执行 SQL |
| DTO `record` | TypeScript interface / DTO class | 定义请求参数和响应对象 |
| `application.yml` | `.env` + config 文件 | 端口、数据库、目录等配置 |
| `@Valid` + 注解 | Zod/Joi/class-validator | 请求参数校验 |
| `@RestControllerAdvice` | 全局 error middleware | 统一错误响应 |

请求链路可以简单理解为：

```text
HTTP 请求
  -> Controller 解析路由和参数
  -> Service 执行业务逻辑
  -> Mapper 调用 SQL / 或 Service 读本地文件
  -> 返回 JSON / 文件响应
```

## 2. 这个工程是什么

这是一个基于 Spring Boot 3.3.5 的 Java 21 后端 API 工程，包名是 `com.videomanager`，默认监听 `4000` 端口。

主要功能模块：

- `videos`：视频列表、视频详情、视频标签、按目录浏览视频。
- `tags`：标签的增删改查。
- `novels`：小说列表、小说内容分页、评分、扫描本地 txt 文件导入数据库。
- `gallery`：读取本地图片目录，返回图片列表和图片文件。
- `aish123`：查询 `aish123` 表里的帖子/条目数据和分类统计。
- `common`：统一异常和错误响应。
- `config`：跨域、配置读取、JSON 序列化等。

## 3. 如何启动

环境要求：

- JDK 21+
- Maven 3.9+
- MySQL，且存在 `video_manager` 数据库和相关表

在 `packages/java` 目录运行：

```bash
mvn -Dmaven.repo.local=.m2repo spring-boot:run
```

打包：

```bash
mvn -Dmaven.repo.local=.m2repo clean package
java -jar target/api-0.0.1-SNAPSHOT.jar
```

常用环境变量来自 `src/main/resources/application.yml`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4000` | HTTP 服务端口 |
| `DB_HOST` | `192.168.1.22` | MySQL 主机 |
| `DB_PASSWORD` | 空字符串 | MySQL 密码 |
| `FLYWAY_ENABLED` | `false` | 是否启用 Flyway |
| `CORS_ORIGIN` | 空字符串 | 允许跨域的来源，多个用逗号分隔；为空时允许 `*` |
| `NOVEL_TXT_DIR` | `./txt` | 小说 txt 扫描目录 |
| `GALLERY_DIR` | `/home/banzhaowu/Pictures` | 图库图片目录 |

数据库连接当前固定为：

```text
jdbc:mysql://${DB_HOST}:3306/video_manager
username: root
password: ${DB_PASSWORD}
```

也就是说，库名、端口、用户名目前不是环境变量，而是写在 `application.yml` 里。

## 4. 目录结构

```text
src/main/java/com/videomanager
├── ApiApplication.java          # Spring Boot 启动入口
├── aish123                      # aish123 查询接口
├── common                       # 异常、错误响应
├── config                       # 配置、CORS、Jackson
├── gallery                      # 本地图片目录接口
├── novels                       # 小说接口
├── tags                         # 标签接口
└── videos                       # 视频接口

src/main/resources
├── application.yml              # 应用配置
└── mapper                       # MyBatis XML SQL
    ├── Aish123Mapper.xml
    ├── NovelMapper.xml
    ├── TagsMapper.xml
    └── VideoMapper.xml
```

## 5. 入口和依赖注入

入口文件是：

```text
src/main/java/com/videomanager/ApiApplication.java
```

它只做一件事：

```java
SpringApplication.run(ApiApplication.class, args);
```

这类似 Node 里调用 `app.listen(...)` 前初始化整个应用。Spring Boot 会扫描 `com.videomanager` 包下面的类，自动发现：

- 标了 `@RestController` 的 HTTP Controller。
- 标了 `@Service` 的业务类。
- 标了 `@Mapper` 的 MyBatis Mapper。
- 标了 `@Configuration` 的配置类。

依赖注入通过构造函数完成。例如：

```java
public VideosController(VideosService videosService) {
    this.videosService = videosService;
}
```

可以类比为 NestJS 的 constructor injection，或者你在 Express 项目里手动把 service 传给 router。

## 6. Controller 层：路由定义

Controller 负责声明 HTTP 路由，类似 Express Router。

### 视频接口

文件：`src/main/java/com/videomanager/videos/VideosController.java`

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/videos` | 视频分页查询 |
| `GET` | `/api/videos/folders?parent=` | 按目录列出子文件夹和文件 |
| `GET` | `/api/videos/{id}` | 视频详情 |
| `PATCH` | `/api/videos/{id}/tags` | 更新视频标签 |

`GET /api/videos` 支持这些 query：

- `skip`：跳过多少条，默认 `0`。
- `take`：取多少条，默认 `50`，最大会被限制到 `200`。
- `tagIds`：逗号分隔的标签 ID，例如 `1,2,3`。
- `pathPrefix`：路径前缀过滤。
- `search`：按文件名或路径搜索。
- `sortBy`：排序字段，例如 `modifiedTime`、`filename`、`size`、`tags`。
- `sortOrder`：`asc` 或 `desc`。
- `extensions`：逗号分隔的视频扩展名，例如 `mp4,mkv`。

### 标签接口

文件：`src/main/java/com/videomanager/tags/TagsController.java`

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/tags` | 标签列表 |
| `GET` | `/api/tags/{id}` | 标签详情 |
| `POST` | `/api/tags` | 创建标签 |
| `PATCH` | `/api/tags/{id}` | 更新标签 |
| `DELETE` | `/api/tags/{id}` | 删除标签 |

创建标签 body：

```json
{
  "name": "电影",
  "description": "可选说明"
}
```

### 小说接口

文件：`src/main/java/com/videomanager/novels/NovelsController.java`

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/novels?page=1&limit=1000` | 小说列表 |
| `GET` | `/api/novelByName/{name}` | 按名称查小说 |
| `GET` | `/api/novel/{id}?page=1` | 获取小说内容页 |
| `POST` | `/api/novel/{id}` | 更新星级评分 |
| `GET` | `/api/scanning` | 扫描 txt 目录并导入小说 |
| `DELETE` | `/api/novel/{id}` | 删除小说 |

小说内容分页每页固定 `5000` 个字符，在 `NovelsServiceImpl` 里由 `NOVEL_PAGE_SIZE` 控制。

### 图库接口

文件：`src/main/java/com/videomanager/gallery/GalleryController.java`

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/gallery` | 图片列表 |
| `GET` | `/api/gallery/file?name=xxx.jpg` | 返回图片文件 |

`GET /api/gallery` 支持：

- `skip`：默认 `0`。
- `take`：默认 `50`，最大 `200`。
- `sortBy`：`filename`、`name`、`size`、`modifiedTime`。
- `sortOrder`：`asc` 或 `desc`。

`/api/gallery/file` 有路径安全检查，只允许读取 `GALLERY_DIR` 下一级文件名，不接受带目录层级的路径。

### aish123 接口

文件：`src/main/java/com/videomanager/aish123/Aish123Controller.java`

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/aish123` | 分页查询 |
| `GET` | `/api/aish123/stats/by-type` | 按 `type_name` 统计 |
| `GET` | `/api/aish123/{tid}` | 查询单条 |

`GET /api/aish123` 支持：

- `skip`、`take`：分页。
- `fid`：论坛/分类 ID。
- `typeName`：类型名；特殊值 `__NONE__` 表示查询空类型。
- `search`：搜索标题、作者、最后回复人。
- `sortBy`、`sortOrder`：排序。

## 7. Service 层：业务逻辑

Service 层类似你在 Node 项目里写的 `services/*.ts`。

### `VideosServiceImpl`

职责：

- 处理分页参数，限制 `take` 最大为 `200`。
- 解析 `tagIds`、`extensions`。
- 组装安全的排序 SQL 片段。
- 调用 `VideoMapper` 查询视频和总数。
- 给每个视频补上 `tags` 数组。
- 更新视频标签时使用 `@Transactional` 保证删除旧标签和插入新标签在同一个事务里。
- 根据 `path` 字段计算文件夹视图。

注意：`VideoMapper.xml` 里使用了 `${orderBySql}`，这相当于字符串拼接 SQL。代码里没有直接信任用户输入，而是通过白名单字段映射生成排序语句，这点很重要。

### `TagsServiceImpl`

职责：

- 标签列表、详情、创建、更新、删除。
- 创建和更新时会 `trim()` 标签名和说明。
- 重名时 MySQL 抛出 `DuplicateKeyException`，全局异常处理会返回 `409 CONFLICT`。

### `NovelsServiceImpl`

职责：

- 小说列表分页。
- 按名称查询小说，路径参数会 URL decode。
- 按 ID 读取小说内容切片，并增加阅读次数。
- 更新星级评分，范围由 DTO 限制为 `0-5`。
- 扫描 `NOVEL_TXT_DIR` 下的 `.txt` 文件，导入到 `novel` 表。
- txt 解码优先 UTF-8，不是 UTF-8 时按 GB18030 读取，并会把文件重写为 UTF-8。

这里有一个值得注意的小细节：扫描导入时文件名过滤是 `.txt`，但生成小说名时用了 `filename.replace(".text", "")`。如果文件名是 `abc.txt`，这个 replace 不会去掉 `.txt`。这可能是历史兼容，也可能是一个小 bug。

### `GalleryServiceImpl`

职责：

- 读取 `GALLERY_DIR` 本地目录。
- 只返回允许的图片扩展名。
- 根据文件名、大小、修改时间排序。
- 做分页。
- 校验图片文件名，避免通过 `../` 读取目录外文件。

### `Aish123ServiceImpl`

职责：

- 查询 `aish123` 表。
- 支持 `fid`、`typeName`、`search` 过滤。
- 支持排序白名单。
- 把数据库 `Timestamp` 转成 Java `Instant`，方便 Jackson 输出 JSON 时间。
- 按 `type_name` 做聚合统计。

## 8. MyBatis：这个项目怎么访问数据库

这个项目没有用 JPA/Hibernate，而是用 MyBatis。它的工作方式更接近：

```text
Java interface 方法
  -> XML 里同名 SQL
  -> MyBatis 执行 SQL
  -> 返回 Map / DTO
```

例如：

```java
List<Map<String, Object>> selectVideoPage(VideoPageQuery query);
```

对应：

```xml
<select id="selectVideoPage" resultType="java.util.HashMap">
    SELECT ...
</select>
```

Mapper interface 文件：

- `src/main/java/com/videomanager/videos/VideoMapper.java`
- `src/main/java/com/videomanager/tags/TagsMapper.java`
- `src/main/java/com/videomanager/novels/NovelMapper.java`
- `src/main/java/com/videomanager/aish123/Aish123Mapper.java`

SQL 文件：

- `src/main/resources/mapper/VideoMapper.xml`
- `src/main/resources/mapper/TagsMapper.xml`
- `src/main/resources/mapper/NovelMapper.xml`
- `src/main/resources/mapper/Aish123Mapper.xml`

`application.yml` 中这段配置告诉 MyBatis 去哪里找 XML：

```yaml
mybatis:
  mapper-locations: classpath:mapper/**/*.xml
  configuration:
    map-underscore-to-camel-case: true
```

`map-underscore-to-camel-case: true` 表示数据库字段 `created_at` 可以映射成 Java 属性 `createdAt`，类似你在 Node 里做 snake_case 到 camelCase 的转换。

## 9. DTO 和参数校验

Java 里的 `record` 很像 TypeScript 里的不可变数据对象：

```java
public record QueryVideosDto(
    @Min(0) Integer skip,
    @Min(1) Integer take,
    String tagIds,
    String pathPrefix,
    String search,
    String sortBy,
    String sortOrder,
    String extensions
) {
}
```

Controller 里写：

```java
public Object list(@Valid QueryVideosDto dto)
```

Spring 会把 query string 自动绑定到 `QueryVideosDto`。`@Valid` 会触发校验，类似：

```ts
const dto = schema.parse(req.query)
```

常见校验注解：

- `@Min(0)`：数字最小值。
- `@Max(200)`：数字最大值。
- `@NotBlank`：不能为空字符串。
- `@Size(max = 100)`：字符串长度限制。

## 10. 统一错误响应

全局错误处理在：

```text
src/main/java/com/videomanager/common/GlobalExceptionHandler.java
```

它类似 Express 的：

```js
app.use((err, req, res, next) => { ... })
```

当前映射关系：

| 异常 | HTTP 状态 | 错误 code |
| --- | --- | --- |
| `NotFoundException` | `404` | `NOT_FOUND` |
| `BadRequestException` | `400` | `BAD_REQUEST` |
| `DuplicateKeyException` | `409` | `CONFLICT` |
| 参数校验失败 | `400` | `VALIDATION_ERROR` |
| 其他异常 | `500` | `INTERNAL_ERROR` |

错误响应类型是 `ApiError`，包含 `code`、`message` 和 `timestamp`。

## 11. 配置模块

配置相关文件：

- `AppProperties.java`：把 `app.*` 配置绑定成 Java 对象。
- `AppConfig.java`：启用 `AppProperties`。
- `CorsConfig.java`：设置跨域。
- `JacksonConfig.java`：定制 JSON 序列化。

`JacksonConfig` 里把 Java `Long` 序列化成字符串。这通常是为了避免 JS 端超过 `Number.MAX_SAFE_INTEGER` 时丢精度，类似 Node 后端返回大整数时也常转成 string。

## 12. 如果你要改功能，从哪里下手

### 新增一个 API

通常按这个顺序：

1. 在对应模块下新增或修改 `Controller` 方法。
2. 如果有复杂逻辑，放进 `Service`。
3. 如果要查数据库，在 `Mapper.java` 加方法。
4. 在 `resources/mapper/*.xml` 里写 SQL。
5. 如果有请求 body 或 query 参数，新增 DTO `record`。

### 修改视频查询字段

主要看：

- `VideosController.java`
- `QueryVideosDto.java`
- `VideosServiceImpl.java`
- `VideoMapper.java`
- `VideoMapper.xml`

### 修改标签逻辑

主要看：

- `TagsController.java`
- `TagsServiceImpl.java`
- `TagsMapper.xml`

### 修改小说扫描逻辑

主要看：

- `NovelsController.java`
- `NovelsServiceImpl.java`
- `NovelMapper.xml`
- `application.yml` 里的 `NOVEL_TXT_DIR`

### 修改图库目录或图片类型

主要看：

- `GalleryController.java`
- `GalleryServiceImpl.java`
- `application.yml` 里的 `GALLERY_DIR`

## 13. 和 NodeJS 开发习惯不同的地方

- Java 类型更显式，很多数据对象会单独建 DTO 或 record。
- Spring Boot 通过注解和包扫描自动装配对象，不需要手动 `require()` 后组织依赖。
- Controller 方法参数可以直接从 path、query、body 自动绑定。
- MyBatis 的 SQL 写在 XML 里，不在 JS 模板字符串里。
- 事务用 `@Transactional` 标注方法，不是手动 `beginTransaction()`。
- 构建和依赖由 Maven 管，依赖缓存可以放在 `.m2repo`。
- 本工程有些接口返回 `Object` / `Map<String, Object>`，这比强类型 DTO 更灵活，但类型约束也更弱。

## 14. 维护注意事项

- README 中部分描述可能落后于当前代码，例如 Service 不是全部占位；建议以后以代码和这份导览交叉确认。
- `GET /api/scanning` 会触发写数据库和可能重写 txt 文件，从 REST 语义看更像 `POST`，调用时要小心。
- `NovelsServiceImpl` 里 `.txt` 文件导入时去后缀逻辑疑似写成了 `.text`。
- Mapper XML 中 `${orderBySql}` 只能用于白名单拼出来的 SQL，不能直接接用户输入。
- 图库接口读取本地磁盘目录，部署时要确保进程有目录读取权限。
- 当前 `application.yml` 暴露了数据库默认主机和图库默认目录，跨环境部署时建议通过环境变量或独立 profile 管理。

## 15. 快速定位表

| 你想找什么 | 看这里 |
| --- | --- |
| 应用从哪里启动 | `src/main/java/com/videomanager/ApiApplication.java` |
| HTTP 路由 | 各模块的 `*Controller.java` |
| 业务逻辑 | 各模块的 `*ServiceImpl.java` |
| SQL | `src/main/resources/mapper/*.xml` |
| 请求参数定义 | 各模块的 `dto/*.java` |
| 数据库和端口配置 | `src/main/resources/application.yml` |
| 跨域配置 | `src/main/java/com/videomanager/config/CorsConfig.java` |
| JSON 序列化配置 | `src/main/java/com/videomanager/config/JacksonConfig.java` |
| 错误处理 | `src/main/java/com/videomanager/common/GlobalExceptionHandler.java` |

# Spring 后端迁移实现（`packages/java`）

本目录是把现有 `packages/api`（NestJS + Prisma）迁移到 Spring Boot 的实现起点，目标是**接口契约不变**，前端和脚本最小改动。

## 技术栈选型

- Java 21
- Spring Boot 3.3
- Spring Web MVC
- MyBatis-Plus（主 ORM）
- Flyway（数据库版本管理）
- MySQL 8 驱动
- Spring Validation
- Springdoc OpenAPI
- Actuator

## 已实现内容

- Spring Boot 工程初始化（Gradle）
- 环境变量接入（`DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/PORT/CORS_ORIGIN/NOVEL_TXT_DIR`）
- 全局 CORS 配置
- 全局异常处理骨架（404/409/400/500）
- Jackson 配置（Long 序列化为字符串，贴近现有前端 `size` 字段行为）
- 与 Nest 对齐的路由骨架：
  - `/videos`, `/videos/folders`, `/videos/{id}`, `/videos/{id}/tags`
  - `/tags`, `/tags/{id}`
  - `/novels`, `/novelByName/{name}`, `/novel/{id}`, `/scanning`

## 下一步开发顺序（建议）

1. **Tags 模块先落地**
   - `TagMapper` + SQL + `TagsServiceImpl`
   - 保持名称唯一冲突返回 409
2. **Videos 模块**
   - 列表筛选（`skip/take/tagIds/pathPrefix/search/sortBy/sortOrder/extensions`）
   - `folders` 顶层聚合 SQL 与子目录内存聚合逻辑
   - `PATCH /videos/{id}/tags` 事务更新
3. **Novels 模块**
   - `SUBSTRING(content, start, len)` 分页正文
   - `readCount` 自增
   - 星级更新与扫描逻辑（编码转换）
4. **Flyway**
   - 将根目录 `db-schema.sql` 拆分为 `V1__init.sql`
5. **测试**
   - 至少补充 controller + service 集成测试
   - 推荐 Testcontainers(MySQL) 验证方言 SQL

## 本地启动

```bash
cd packages/java
./gradlew bootRun
```

默认端口：`4000`。

> 当前提交为“可启动骨架 + 路由契约对齐”，业务 SQL 与 Mapper 待下一步逐模块补齐。

package com.videomanager.treehole;

import java.util.regex.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 树洞数据存放在独立的 MySQL schema 中（默认 {@code jandan}），
 * 与 reading-service 自身的 {@code video_manager} schema 共用一个数据源。
 * schema 名会以 `${schema}` 拼进 SQL，因此必须限制为合法标识符。
 */
@ConfigurationProperties(prefix = "app.treehole")
public record TreeholeProperties(String schema) {

    private static final Pattern VALID_SCHEMA = Pattern.compile("[A-Za-z0-9_]{1,64}");

    public TreeholeProperties {
        if (schema == null || !VALID_SCHEMA.matcher(schema).matches()) {
            throw new IllegalArgumentException(
                "app.treehole.schema must be a plain MySQL schema name, got: " + schema
            );
        }
    }
}

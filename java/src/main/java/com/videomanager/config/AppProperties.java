package com.videomanager.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    String corsOrigin,
    String novelTxtDir,
    String galleryDir,
    Integer cacheTtlSeconds
) {
    public Duration cacheTtl() {
        int seconds = cacheTtlSeconds == null || cacheTtlSeconds < 1 ? 300 : cacheTtlSeconds;
        return Duration.ofSeconds(seconds);
    }
}

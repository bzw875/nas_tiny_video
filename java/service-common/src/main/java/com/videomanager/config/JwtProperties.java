package com.videomanager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record JwtProperties(String jwtSecret) {
}

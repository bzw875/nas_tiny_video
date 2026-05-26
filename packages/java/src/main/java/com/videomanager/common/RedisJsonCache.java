package com.videomanager.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisJsonCache {

    private static final Logger log = LoggerFactory.getLogger(RedisJsonCache.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public RedisJsonCache(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public <T> Optional<T> get(String namespace, String keyPart, TypeReference<T> type) {
        try {
            String json = redis.opsForValue().get(fullKey(namespace, keyPart));
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, type));
        } catch (Exception ex) {
            log.warn("Cache read failed for {}:{}: {}", namespace, keyPart, ex.getMessage());
            return Optional.empty();
        }
    }

    public <T> T getOrLoad(
        String namespace,
        String keyPart,
        TypeReference<T> type,
        Duration ttl,
        Supplier<T> loader
    ) {
        return get(namespace, keyPart, type).orElseGet(() -> {
            T value = loader.get();
            put(namespace, keyPart, value, ttl);
            return value;
        });
    }

    public void put(String namespace, String keyPart, Object value, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redis.opsForValue().set(fullKey(namespace, keyPart), json, ttl);
        } catch (Exception ex) {
            log.warn("Cache write failed for {}:{}: {}", namespace, keyPart, ex.getMessage());
        }
    }

    public void invalidateNamespace(String namespace) {
        try {
            var keys = redis.keys(namespace + ":*");
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("Cache invalidation failed for {}: {}", namespace, ex.getMessage());
        }
    }

    private static String fullKey(String namespace, String keyPart) {
        return namespace + ":" + keyPart;
    }
}

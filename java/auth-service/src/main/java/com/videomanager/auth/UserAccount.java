package com.videomanager.auth;

public record UserAccount(
    Long id,
    String username,
    String passwordHash,
    String displayName,
    boolean enabled
) {
}

package com.videomanager.auth;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, CurrentUser user) {
}

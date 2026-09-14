package com.videomanager.auth;

import com.videomanager.common.BadRequestException;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final AuthProperties properties;

    public AuthService(UserMapper userMapper, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
                       AuthProperties properties) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
    }

    public LoginResponse login(LoginRequest request) {
        UserAccount account = userMapper.findByUsername(request.username());
        if (account == null || !account.enabled() || !passwordEncoder.matches(request.password(), account.passwordHash())) {
            throw new BadRequestException("用户名或密码错误");
        }

        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(properties.tokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("video-manager-auth")
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .subject(account.id().toString())
            .claim("username", account.username())
            .claim("displayName", account.displayName())
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new LoginResponse(token, "Bearer", properties.tokenTtl().toSeconds(), toCurrentUser(account));
    }

    private CurrentUser toCurrentUser(UserAccount account) {
        return new CurrentUser(account.id(), account.username(), account.displayName());
    }
}

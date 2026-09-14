CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_username UNIQUE (username)
);

INSERT INTO users (username, password_hash, display_name, enabled)
VALUES ('bzw875', '$2y$12$PRBK3J5ohMDaImEGceuG3efFmGZDa4qqJvTp8Qbr/adwB5vHWkuee', 'bzw875', TRUE)
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    enabled = TRUE;

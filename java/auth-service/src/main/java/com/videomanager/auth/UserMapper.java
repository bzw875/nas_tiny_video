package com.videomanager.auth;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper {

    @Select("""
        SELECT id, username, password_hash, display_name, enabled
        FROM users
        WHERE username = #{username}
        LIMIT 1
        """)
    UserAccount findByUsername(String username);
}

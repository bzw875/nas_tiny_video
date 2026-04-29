package com.videomanager.novels;

import com.videomanager.common.NotFoundException;
import com.videomanager.config.AppProperties;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NovelsServiceImpl implements NovelsService {
    private static final int NOVEL_PAGE_SIZE = 5000;
    private final JdbcTemplate jdbcTemplate;
    private final AppProperties appProperties;

    public NovelsServiceImpl(JdbcTemplate jdbcTemplate, AppProperties appProperties) {
        this.jdbcTemplate = jdbcTemplate;
        this.appProperties = appProperties;
    }

    @Override
    public Object getNovelsLimit(int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(limit, 1);
        return jdbcTemplate.query(
            "SELECT id, name, author, wordCount, starRating, readCount FROM novel LIMIT ? OFFSET ?",
            (rs, rowNum) -> Map.of(
                "id", rs.getInt("id"),
                "name", rs.getString("name"),
                "author", rs.getString("author"),
                "wordCount", rs.getInt("wordCount"),
                "starRating", rs.getInt("starRating"),
                "readCount", rs.getInt("readCount")
            ),
            safeLimit,
            (safePage - 1) * safeLimit
        );
    }

    @Override
    public Object getNovelByName(String name) {
        String decoded = URLDecoder.decode(name, StandardCharsets.UTF_8);
        return jdbcTemplate.query(
            "SELECT id, name, author, wordCount, content, starRating, readCount FROM novel WHERE name = ?",
            (rs, rowNum) -> Map.of(
                "id", rs.getInt("id"),
                "name", rs.getString("name"),
                "author", rs.getString("author"),
                "wordCount", rs.getInt("wordCount"),
                "content", rs.getString("content"),
                "starRating", rs.getInt("starRating"),
                "readCount", rs.getInt("readCount")
            ),
            decoded
        ).stream().findFirst().orElseThrow(() -> new NotFoundException("Novel not found"));
    }

    @Override
    @Transactional
    public Object getNovelPage(int id, Integer page) {
        int pageNum = Math.max((page == null ? 1 : page) - 1, 0);
        int start = pageNum * NOVEL_PAGE_SIZE + 1;
        Map<String, Object> novel = jdbcTemplate.query(
            "SELECT id, name, author, wordCount, starRating, readCount FROM novel WHERE id = ?",
            (rs, rowNum) -> {
                Map<String, Object> row = new java.util.HashMap<>();
                row.put("id", rs.getInt("id"));
                row.put("name", rs.getString("name"));
                row.put("author", rs.getString("author"));
                row.put("wordCount", rs.getInt("wordCount"));
                row.put("starRating", rs.getInt("starRating"));
                row.put("readCount", rs.getInt("readCount"));
                return row;
            },
            id
        ).stream().findFirst().orElseThrow(() -> new NotFoundException("Novel not found"));

        String content = jdbcTemplate.query(
            "SELECT SUBSTRING(content, ?, ?) AS content FROM novel WHERE id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("content"),
            start,
            NOVEL_PAGE_SIZE,
            id
        ).stream().findFirst().orElse("");

        jdbcTemplate.update("UPDATE novel SET readCount = readCount + 1 WHERE id = ?", id);
        return Map.of(
            "id", novel.get("id"),
            "name", novel.get("name"),
            "author", novel.get("author"),
            "wordCount", novel.get("wordCount"),
            "starRating", novel.get("starRating"),
            "readCount", novel.get("readCount"),
            "content", content == null ? "" : content,
            "pageSize", NOVEL_PAGE_SIZE
        );
    }

    @Override
    public Object updateStarRating(int id, Integer starRating) {
        Integer current = jdbcTemplate.queryForObject("SELECT starRating FROM novel WHERE id = ?", Integer.class, id);
        if (current == null) {
            throw new NotFoundException("Novel not found");
        }
        int next = starRating == null ? current : starRating;
        int affected = jdbcTemplate.update("UPDATE novel SET starRating = ? WHERE id = ?", next, id);
        return Map.of("affected", affected, "raw", java.util.List.of());
    }

    @Override
    public Object doScanning() {
        Path txtDir = Path.of(appProperties.novelTxtDir() == null ? "./txt" : appProperties.novelTxtDir()).toAbsolutePath();
        if (!Files.exists(txtDir)) {
            return java.util.List.of();
        }
        try (Stream<Path> stream = Files.list(txtDir)) {
            java.util.List<String> imported = new java.util.ArrayList<>();
            stream.filter(Files::isRegularFile)
                .filter(path -> path.getFileName().toString().endsWith(".txt"))
                .forEach(path -> {
                    String filename = path.getFileName().toString();
                    Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM novel WHERE name = ?", Integer.class, filename);
                    if (exists != null && exists > 0) {
                        return;
                    }
                    try {
                        byte[] bytes = Files.readAllBytes(path);
                        String content = decodeText(bytes);
                        if (!isUtf8(bytes)) {
                            Files.writeString(path, content, StandardCharsets.UTF_8);
                        }
                        String[] lines = content.substring(0, Math.min(content.length(), 100)).split("\n");
                        String author = "";
                        int seen = 0;
                        for (String line : lines) {
                            if (!line.isBlank()) {
                                if (seen == 1) {
                                    author = line;
                                    break;
                                }
                                seen++;
                            }
                        }
                        String name = filename.replace(".text", "");
                        jdbcTemplate.update(
                            "INSERT INTO novel (name, content, author, starRating, wordCount, readCount) VALUES (?, ?, ?, ?, ?, ?)",
                            name, content, author, 0, content.length(), 0
                        );
                        imported.add(filename);
                    } catch (IOException ignored) {
                        // ignore bad files during scan
                    }
                });
            return imported;
        } catch (IOException ex) {
            return java.util.List.of();
        }
    }

    @Override
    public Map<String, Object> deleteNovel(int id) {
        try {
            int affected = jdbcTemplate.update("DELETE FROM novel WHERE id = ?", id);
            return Map.of("affected", affected, "raw", java.util.List.of());
        } catch (Exception ex) {
            return Map.of("affected", 0, "raw", java.util.List.of());
        }
    }

    private String decodeText(byte[] bytes) {
        if (isUtf8(bytes)) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        Charset gb18030 = Charset.forName("GB18030");
        return gb18030.decode(ByteBuffer.wrap(bytes)).toString();
    }

    private boolean isUtf8(byte[] bytes) {
        try {
            StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes));
            return true;
        } catch (CharacterCodingException ex) {
            return false;
        }
    }
}

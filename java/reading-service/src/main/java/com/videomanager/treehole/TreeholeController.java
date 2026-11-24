package com.videomanager.treehole;

import com.videomanager.treehole.dto.PageQuery;
import com.videomanager.treehole.dto.QueryTreeholeDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 树洞接口，路径与 treeholeSelf 保持一致（统一挂在网关 /api 下）：
 * <ul>
 *   <li>GET /api/treehole?page=0&amp;size=20&amp;field=date_gmt&amp;sort=DESC&amp;likeRange=101-200</li>
 *   <li>GET /api/treehole/author/{author}</li>
 *   <li>GET /api/treehole/search?q=关键词</li>
 *   <li>GET /api/treehole/statistics（兼容旧路径 /api/treehole/static）</li>
 *   <li>GET /api/aish/posts</li>
 * </ul>
 */
@RestController
@RequestMapping("/api")
public class TreeholeController {

    private final TreeholeService treeholeService;

    public TreeholeController(TreeholeService treeholeService) {
        this.treeholeService = treeholeService;
    }

    @GetMapping("/treehole")
    public Object list(@Valid QueryTreeholeDto query) {
        return treeholeService.list(query);
    }

    @GetMapping("/treehole/author/{author}")
    public Object byAuthor(@PathVariable String author, @Valid PageQuery page) {
        return treeholeService.byAuthor(author, page);
    }

    @GetMapping("/treehole/search")
    public Object search(
        @RequestParam(name = "q", required = false) String q,
        @Valid PageQuery page
    ) {
        return treeholeService.search(q, page);
    }

    @GetMapping({"/treehole/statistics", "/treehole/static"})
    public Object statistics() {
        return treeholeService.statistics();
    }

    @GetMapping("/aish/posts")
    public Object aishPosts() {
        return treeholeService.aishPosts();
    }
}

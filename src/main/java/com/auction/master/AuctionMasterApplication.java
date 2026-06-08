package com.auction.master;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import javax.crypto.SecretKey;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@SpringBootApplication
@MapperScan("com.auction.master")
public class AuctionMasterApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuctionMasterApplication.class, args);
        System.out.println("========================================");
        System.out.println("Auction Master Backend Started! Port 8082");
        System.out.println("========================================");
    }

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
        return interceptor;
    }

    @Bean
    public ScheduledExecutorService scheduledExecutorService() {
        return Executors.newScheduledThreadPool(4);
    }
}

@Configuration
class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate(org.springframework.data.redis.connection.RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}

@Configuration
class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}

class UserContext {
    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();
    public static void setUserId(Long userId) { currentUserId.set(userId); }
    public static Long getUserId() { return currentUserId.get(); }
    public static void clear() { currentUserId.remove(); }
}

class JwtUtil {
    private static final String SECRET = "auction-master-secret-key-2026-very-long-enough-for-jwt-hs256";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    private static final long EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000L;

    public static String generateToken(Long userId, String username, Integer role) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim("username", username)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(KEY)
                .compact();
    }

    public static Claims parseToken(String token) {
        return Jwts.parser().verifyWith(KEY).build().parseSignedClaims(token).getPayload();
    }

    public static long getExpirationMs() { return EXPIRATION_MS; }
}

@Component
class AuthInterceptor implements HandlerInterceptor {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equals(request.getMethod())) return true;

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String blacklisted = stringRedisTemplate.opsForValue().get("token:blacklist:" + token);
                if (blacklisted != null) {
                    sendError(response, 401, "Token已失效，请重新登录");
                    return false;
                }
                Claims claims = JwtUtil.parseToken(token);
                Long userId = Long.parseLong(claims.getSubject());
                UserContext.setUserId(userId);
                return true;
            } catch (Exception e) {
                sendError(response, 401, "Token无效或已过期");
                return false;
            }
        }
        sendError(response, 401, "未提供认证Token");
        return false;
    }

    private void sendError(HttpServletResponse response, int code, String msg) throws Exception {
        response.setStatus(code);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(String.format("{\"code\":%d,\"message\":\"%s\",\"data\":null}", code, msg));
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}

@Configuration
class WebMvcConfig implements WebMvcConfigurer {
    @Autowired
    private AuthInterceptor authInterceptor;

    @Override
    public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        String projectRoot = System.getProperty("user.dir");
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + projectRoot + "/src/main/resources/static/uploads/");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                    "/api/auth/**",
                    "/api/hello",
                    "/api/upload/**",
                    "/api/goods/**",
                    "/api/auction/**",
                    "/api/bid/history/**",
                    "/api/bid/rank/**",
                    "/api/live/room/list"
                );
    }
}

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(RuntimeException.class)
    public Result<Void> handleRuntimeException(RuntimeException e) {
        Result<Void> r = new Result<>();
        r.setCode(500);
        r.setMessage(e.getMessage());
        return r;
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        Result<Void> r = new Result<>();
        r.setCode(500);
        r.setMessage("服务器内部错误");
        return r;
    }
}

@Configuration
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {
    private final AuctionWsHandler wsHandler;
    WebSocketConfig(AuctionWsHandler wsHandler) { this.wsHandler = wsHandler; }
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(wsHandler, "/ws/auction/{roomId}").setAllowedOrigins("*");
    }
}

@Component
class AuctionWsHandler extends TextWebSocketHandler {
    private final ConcurrentHashMap<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<WebSocketSession, String> sessionToRoom = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<WebSocketSession, Long> sessionToUserId = new ConcurrentHashMap<>();

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String uriPath = Objects.requireNonNull(session.getUri()).getPath();
        String roomId = uriPath.split("/")[3];
        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionToRoom.put(session, roomId);

        Map<String, String> params = parseQuery(session.getUri().getQuery());
        if (params.containsKey("userId")) {
            Long userId = Long.parseLong(params.get("userId"));
            sessionToUserId.put(session, userId);
            redisTemplate.opsForSet().add("room:" + roomId + ":online", userId.toString());
            redisTemplate.opsForHyperLogLog().add("room:" + roomId + ":viewers", userId.toString());
        }

        broadcastUserCount(roomId);
        System.out.println("New connection joined room: " + roomId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        if (payload.contains("PING")) {
            session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        String roomId = sessionToRoom.remove(session);
        Long userId = sessionToUserId.remove(session);
        if (roomId != null) {
            Set<WebSocketSession> set = rooms.get(roomId);
            if (set != null) set.remove(session);
            if (userId != null) {
                redisTemplate.opsForSet().remove("room:" + roomId + ":online", userId.toString());
            }
            broadcastUserCount(roomId);
        }
    }

    private void broadcastUserCount(String roomId) {
        Long count = redisTemplate.opsForSet().size("room:" + roomId + ":online");
        String msg = String.format("{\"type\":\"ROOM_USER_COUNT\",\"roomId\":%s,\"count\":%d}", roomId, count == null ? 0 : count);
        broadcastToRoom(roomId, msg);
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null) return map;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=");
            if (kv.length == 2) map.put(kv[0], kv[1]);
        }
        return map;
    }

    public void broadcastToRoom(String roomId, String message) {
        Set<WebSocketSession> sessions = rooms.get(roomId);
        if (sessions != null) {
            sessions.forEach(s -> {
                try { if (s.isOpen()) s.sendMessage(new TextMessage(message)); }
                catch (Exception e) { e.printStackTrace(); }
            });
        }
    }
}

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
class AuthController {
    @Autowired
    private UserService userService;
    @Autowired
    private StringRedisTemplate redisTemplate;

    @PostMapping("/login")
    public Result<LoginResponse> login(@RequestBody LoginRequest req) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, req.getUsername());
        SysUser user = userService.getOne(wrapper);
        if (user == null || !user.getPassword().equals(req.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        String token = JwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        LoginResponse resp = new LoginResponse();
        resp.setToken(token);
        resp.setUser(user);
        return Result.success(resp);
    }

    @PostMapping("/register")
    public Result<LoginResponse> register(@RequestBody RegisterRequest req) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, req.getUsername());
        if (userService.count(wrapper) > 0) {
            throw new RuntimeException("用户名已存在");
        }
        SysUser user = new SysUser();
        user.setUsername(req.getUsername());
        user.setPassword(req.getPassword());
        user.setNickname(req.getNickname());
        user.setRole(1);
        user.setCreateTime(LocalDateTime.now());
        userService.save(user);
        String token = JwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        LoginResponse resp = new LoginResponse();
        resp.setToken(token);
        resp.setUser(user);
        return Result.success(resp);
    }

    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            long remain = JwtUtil.parseToken(token).getExpiration().getTime() - System.currentTimeMillis();
            redisTemplate.opsForValue().set("token:blacklist:" + token, "1", Duration.ofMillis(Math.max(remain, 1000)));
        }
        return Result.success();
    }
}

@RestController
@RequestMapping("/api/user")
@CrossOrigin("*")
class UserController {
    @Autowired
    private UserService userService;

    @GetMapping("/info")
    public Result<SysUser> info() {
        Long userId = UserContext.getUserId();
        return Result.success(userService.getById(userId));
    }
}

@RestController
@RequestMapping("/api/live")
@CrossOrigin("*")
class LiveRoomController {
    @Autowired
    private LiveRoomService liveRoomService;
    @Autowired
    private LiveRoomGoodsService liveRoomGoodsService;
    @Autowired
    private SessionService sessionService;
    @Autowired
    private GoodsService goodsService;
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    @Autowired
    private AuctionWsHandler wsHandler;

    @PostMapping("/room")
    public Result<LiveRoom> createRoom(@RequestBody CreateRoomRequest req) {
        Long userId = UserContext.getUserId();
        LiveRoom room = new LiveRoom();
        room.setAnchorId(userId);
        room.setRoomName(req.getRoomName());
        room.setCoverUrl(req.getCoverUrl());
        room.setPlayUrl("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
        room.setStatus(1);
        room.setStartTime(LocalDateTime.now());
        room.setCreateTime(LocalDateTime.now());
        liveRoomService.save(room);
        return Result.success(room);
    }

    @PutMapping("/room/start/{roomId}")
    public Result<LiveRoom> startRoom(@PathVariable Long roomId) {
        LiveRoom room = liveRoomService.getById(roomId);
        room.setStatus(1);
        room.setStartTime(LocalDateTime.now());
        if (room.getPlayUrl() == null || room.getPlayUrl().isEmpty()) {
            room.setPlayUrl("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
        }
        liveRoomService.updateById(room);
        wsHandler.broadcastToRoom(roomId.toString(), "{\"type\":\"LIVE_START\"}");
        return Result.success(room);
    }

    @PutMapping("/room/stop/{roomId}")
    public Result<Void> stopRoom(@PathVariable Long roomId) {
        Long userId = UserContext.getUserId();
        LiveRoom room = liveRoomService.getById(roomId);
        room.setStatus(2);
        room.setEndTime(LocalDateTime.now());
        Long viewers = redisTemplate.opsForHyperLogLog().size("room:" + roomId + ":viewers");
        room.setViewerCount(viewers == null ? 0 : viewers.intValue());
        liveRoomService.updateById(room);
        redisTemplate.delete("room:" + roomId + ":online_count");
        redisTemplate.delete("room:" + roomId + ":viewers");
        redisTemplate.delete("room:" + roomId + ":online");
        wsHandler.broadcastToRoom(roomId.toString(), "{\"type\":\"LIVE_STOP\"}");
        return Result.success();
    }

    @GetMapping("/room/list")
    public Result<Page<LiveRoomVO>> listRooms(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size, @RequestParam(required = false) Integer status) {
        LambdaQueryWrapper<LiveRoom> wrapper = new LambdaQueryWrapper<>();
        if (status != null) wrapper.eq(LiveRoom::getStatus, status);
        wrapper.orderByDesc(LiveRoom::getCreateTime);
        Page<LiveRoom> pageObj = liveRoomService.page(new Page<>(page, size), wrapper);
        Page<LiveRoomVO> voPage = new Page<>(page, size, pageObj.getTotal());
        voPage.setRecords(pageObj.getRecords().stream().map(r -> {
            LiveRoomVO vo = new LiveRoomVO();
            vo.setId(r.getId());
            vo.setRoomName(r.getRoomName());
            vo.setCoverUrl(r.getCoverUrl());
            vo.setStatus(r.getStatus());
            vo.setPlayUrl(r.getPlayUrl());
            Long online = redisTemplate.opsForValue().get("room:" + r.getId() + ":online_count") != null ?
                    Long.parseLong(redisTemplate.opsForValue().get("room:" + r.getId() + ":online_count").toString()) : r.getViewerCount().longValue();
            vo.setViewerCount(online.intValue());
            return vo;
        }).toList());
        return Result.success(voPage);
    }

    @PostMapping("/room/goods")
    public Result<LiveRoomGoods> addGoods(@RequestBody AddRoomGoodsRequest req) {
        // 幂等性：检查是否已上架
        List<LiveRoomGoods> existing = liveRoomGoodsService.list(
            new LambdaQueryWrapper<LiveRoomGoods>()
                .eq(LiveRoomGoods::getRoomId, req.getRoomId())
                .eq(LiveRoomGoods::getSessionId, req.getSessionId()));
        if (!existing.isEmpty()) throw new RuntimeException("该场次已在本直播间上架，请勿重复添加");

        LiveRoomGoods rg = new LiveRoomGoods();
        rg.setRoomId(req.getRoomId());
        rg.setSessionId(req.getSessionId());
        rg.setStatus(0);
        rg.setCreateTime(LocalDateTime.now());
        liveRoomGoodsService.save(rg);

        // 通知直播间商品上架，触发前端刷新商品列表
        Session session = sessionService.getById(req.getSessionId());
        String gName = "";
        if (session != null) {
            Goods g = goodsService.getById(session.getGoodsId());
            gName = g != null ? g.getName() : "";
        }
        wsHandler.broadcastToRoom(req.getRoomId().toString(),
            String.format("{\"type\":\"GOODS_UPDATE\",\"roomId\":%d,\"sessionId\":%d,\"goodsName\":\"%s\"}",
                req.getRoomId(), req.getSessionId(), gName));
        return Result.success(rg);
    }

    @GetMapping("/room/{id}")
    public Result<LiveRoomVO> getRoom(@PathVariable Long id) {
        LiveRoom room = liveRoomService.getById(id);
        LiveRoomVO vo = new LiveRoomVO();
        vo.setId(room.getId());
        vo.setRoomName(room.getRoomName());
        vo.setCoverUrl(room.getCoverUrl());
        vo.setStatus(room.getStatus());
        vo.setPlayUrl(room.getPlayUrl());
        Long online = redisTemplate.opsForValue().get("room:" + id + ":online_count") != null ?
                Long.parseLong(redisTemplate.opsForValue().get("room:" + id + ":online_count").toString()) : room.getViewerCount().longValue();
        vo.setViewerCount(online.intValue());
        vo.setGoodsList(liveRoomGoodsService.list(new LambdaQueryWrapper<LiveRoomGoods>().eq(LiveRoomGoods::getRoomId, id)).stream().map(g -> {
            Session s = sessionService.getById(g.getSessionId());
            Goods goods = s != null ? goodsService.getById(s.getGoodsId()) : null;
            Map<String, Object> m = new HashMap<>();
            m.put("_id", g.getId());
            m.put("sessionId", g.getSessionId());
            m.put("goodsName", goods != null ? goods.getName() : (s != null ? "商品" + s.getGoodsId() : "商品"));
            m.put("goodsImage", goods != null && goods.getImages() != null && !goods.getImages().isEmpty() ? goods.getImages().get(0) : "");
            m.put("startPrice", s != null ? s.getStartPrice() : 0);
            m.put("incrementPrice", s != null ? s.getIncrementPrice() : 100);
            m.put("status", g.getStatus());
            return m;
        }).toList());
        return Result.success(vo);
    }

    @PostMapping("/room/heartbeat/{roomId}")
    public Result<Void> heartbeat(@PathVariable Long roomId) {
        Long userId = UserContext.getUserId();
        redisTemplate.opsForValue().increment("room:" + roomId + ":online_count");
        redisTemplate.opsForHyperLogLog().add("room:" + roomId + ":viewers", userId.toString());
        return Result.success();
    }

    @GetMapping("/room/delete/{id}")
    public Result<Void> deleteRoom(@PathVariable Long id) {
        try {
            liveRoomGoodsService.deleteByRoomId(id);
            liveRoomService.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("删除失败: " + e.getMessage());
        }
    }

    @DeleteMapping("/room/goods/{id}")
    public Result<Void> deleteGoods(@PathVariable Long id) {
        liveRoomGoodsService.deleteById(id);
        return Result.success();
    }

    @PutMapping("/room/goods/sort")
    public Result<Void> sortGoods(@RequestBody Map<String, List<Long>> req) {
        List<Long> goodsIds = req.get("goodsIds");
        if (goodsIds != null) {
            for (int i = 0; i < goodsIds.size(); i++) {
                LiveRoomGoods rg = liveRoomGoodsService.getById(goodsIds.get(i));
                if (rg != null) {
                    rg.setSortOrder(i);
                    liveRoomGoodsService.updateById(rg);
                }
            }
        }
        return Result.success();
    }
}

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
class ApiController {
    @Autowired private GoodsService goodsService;
    @Autowired private SessionService sessionService;
    @Autowired private BidService bidService;
    @Autowired private OrderService orderService;
    @Autowired private AuctionWsHandler wsHandler;
    @Autowired private RedisTemplate<String, Object> redisTemplate;
    @Autowired private StringRedisTemplate stringRedisTemplate;
    @Autowired private ScheduledExecutorService scheduledExecutor;
    @Autowired private com.baomidou.mybatisplus.core.mapper.BaseMapper<Goods> goodsMapper;
    @Autowired private com.baomidou.mybatisplus.core.mapper.BaseMapper<Session> sessionMapper;
    @Autowired private com.baomidou.mybatisplus.core.mapper.BaseMapper<LiveRoom> liveRoomMapper;
    @Autowired private LiveRoomGoodsService liveRoomGoodsService;
    @Autowired private UserService userService;

    /** 服务启动后恢复所有进行中的拍卖定时任务 */
    @jakarta.annotation.PostConstruct
    public void recoverActiveSessions() {
        List<Session> activeSessions = sessionService.list(
            new LambdaQueryWrapper<Session>().eq(Session::getStatus, 1));
        for (Session s : activeSessions) {
            long remainingMs = java.time.Duration.between(LocalDateTime.now(), s.getEndTime()).toMillis();
            if (remainingMs <= 0) {
                // 已经过期，直接结束
                endSession(s.getId());
            } else {
                scheduledExecutor.schedule(() -> {
                    Session current = sessionService.getById(s.getId());
                    if (current.getStatus() == 1) endSession(s.getId());
                }, remainingMs, TimeUnit.MILLISECONDS);
                System.out.println("Recovered session " + s.getId() + ", ends in " + (remainingMs / 1000) + "s");
            }
        }
    }

    private Long findRoomIdBySessionId(Long sessionId) {
        List<LiveRoomGoods> list = liveRoomGoodsService.list(
            new LambdaQueryWrapper<LiveRoomGoods>().eq(LiveRoomGoods::getSessionId, sessionId)
        );
        return list.isEmpty() ? null : list.get(0).getRoomId();
    }

    /** Lua 脚本安全释放锁：只有 value 匹配才删除 */
    private void releaseLock(String lockKey, String lockValue) {
        String script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
        stringRedisTemplate.execute(
            new org.springframework.data.redis.core.script.DefaultRedisScript<>(script, Long.class),
            Collections.singletonList(lockKey),
            lockValue
        );
    }

    @PostMapping("/upload/image")
    public Result<String> uploadImage(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            // 使用 user.dir 获取项目根目录的绝对路径
            String projectRoot = System.getProperty("user.dir");
            java.io.File uploadDir = new java.io.File(projectRoot, "src/main/resources/static/uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            java.io.File destFile = new java.io.File(uploadDir, fileName);
            file.transferTo(destFile);
            String imageUrl = "http://localhost:8082/uploads/" + fileName;
            return Result.success(imageUrl);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("上传失败: " + e.getMessage());
        }
    }

    @GetMapping("/hello")
    public Result<String> hello() { return Result.success("Auction System Running!"); }

    @GetMapping("/goods/list")
    public Result<Page<Goods>> getGoodsList(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) {
        return Result.success(goodsService.page(page, size));
    }

    @GetMapping("/goods/{id}")
    public Result<Goods> getGoods(@PathVariable Long id) { return Result.success(goodsService.getById(id)); }

    @PostMapping("/goods")
    public Result<Goods> createGoods(@RequestBody Goods goods) {
        goods.setCreateTime(LocalDateTime.now());
        goodsService.save(goods);
        return Result.success(goods);
    }

    @GetMapping("/goods/delete/{id}")
    public Result<Void> deleteGoods(@PathVariable Long id) {
        try {
            goodsMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("删除失败: " + e.getMessage());
        }
    }

    @GetMapping("/auction/list")
    public Result<Page<Session>> getSessions(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) {
        return Result.success(sessionService.page(page, size));
    }

    @GetMapping("/auction/{id}")
    public Result<Session> getSession(@PathVariable Long id) { return Result.success(sessionService.getById(id)); }

    @PostMapping("/auction")
    public Result<Session> createSession(@RequestBody Session session) {
        if (session.getStartPrice() == null || session.getStartPrice().compareTo(BigDecimal.ZERO) < 0)
            throw new RuntimeException("起拍价必须大于等于0");
        if (session.getIncrementPrice() == null || session.getIncrementPrice().compareTo(BigDecimal.ZERO) <= 0)
            throw new RuntimeException("加价幅度必须大于0");
        if (session.getDurationSeconds() != null && session.getDurationSeconds() <= 0)
            throw new RuntimeException("持续时间必须大于0");
        session.setCurrentPrice(session.getStartPrice());
        session.setStatus(0);
        session.setTotalBids(0);
        sessionService.save(session);
        return Result.success(session);
    }

    @GetMapping("/auction/delete/{id}")
    public Result<Void> deleteSession(@PathVariable Long id) {
        try {
            sessionMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("删除失败: " + e.getMessage());
        }
    }

    @PutMapping("/auction/start/{id}")
    public Result<Void> startSession(@PathVariable Long id) {
        Session session = sessionService.getById(id);
        if (session == null) throw new RuntimeException("竞拍场次不存在");
        if (session.getStatus() != null && session.getStatus() != 0) {
            throw new RuntimeException("拍卖已开始或已结束，不能重复启动");
        }
        session.setStatus(1);
        session.setStartTime(LocalDateTime.now());
        int duration = session.getDurationSeconds() != null ? session.getDurationSeconds() : 300;
        session.setEndTime(LocalDateTime.now().plusSeconds(duration));
        sessionService.updateById(session);

        // 更新直播间商品状态为拍卖中
        List<LiveRoomGoods> roomGoodsList = liveRoomGoodsService.list(
            new LambdaQueryWrapper<LiveRoomGoods>().eq(LiveRoomGoods::getSessionId, id));
        for (LiveRoomGoods rg : roomGoodsList) {
            rg.setStatus(1);
            liveRoomGoodsService.updateById(rg);
        }

        stringRedisTemplate.opsForValue().set("session:" + id + ":price",
            session.getCurrentPrice() != null ? session.getCurrentPrice().toString() : session.getStartPrice().toString(),
            Duration.ofHours(1));
        stringRedisTemplate.opsForValue().set("session:" + id + ":timer", "1", Duration.ofSeconds(duration));

        final Long sid = id;
        scheduledExecutor.schedule(() -> {
            Session s = sessionService.getById(sid);
            if (s.getStatus() == 1) endSession(sid);
        }, duration, TimeUnit.SECONDS);

        Long roomId = findRoomIdBySessionId(id);
        wsHandler.broadcastToRoom(roomId != null ? roomId.toString() : id.toString(), "{\"type\":\"AUCTION_START\",\"sessionId\":" + id + "}");
        return Result.success();
    }

    private void endSession(Long sessionId) {
        // 分布式锁防止并发结束（调度器 + 封顶价可能同时触发）
        String endLockKey = "session:" + sessionId + ":end_lock";
        Boolean endLocked = stringRedisTemplate.opsForValue().setIfAbsent(endLockKey, "1", Duration.ofSeconds(10));
        if (Boolean.FALSE.equals(endLocked)) return; // 其他线程已在处理

        try {
            Session session = sessionService.getById(sessionId);
            if (session.getStatus() != 1) return;
            session.setStatus(2);
            sessionService.updateById(session);

            // 更新直播间商品状态为已拍完
            List<LiveRoomGoods> roomGoodsList = liveRoomGoodsService.list(
                new LambdaQueryWrapper<LiveRoomGoods>().eq(LiveRoomGoods::getSessionId, sessionId));
            for (LiveRoomGoods rg : roomGoodsList) {
                rg.setStatus(2);
                liveRoomGoodsService.updateById(rg);
            }

            // 幂等性：检查是否已有订单，防止超卖
            List<Order> existingOrders = orderService.list(
                new LambdaQueryWrapper<Order>().eq(Order::getSessionId, sessionId));
            if (existingOrders.isEmpty() && session.getCurrentWinnerId() != null) {
                Order order = new Order();
                order.setSessionId(sessionId);
                order.setGoodsId(session.getGoodsId());
                order.setUserId(session.getCurrentWinnerId());
                order.setDealPrice(session.getCurrentPrice());
                order.setStatus(0);
                orderService.save(order);
            }

            redisTemplate.delete("session:" + sessionId + ":timer");
            Long roomId = findRoomIdBySessionId(sessionId);
            wsHandler.broadcastToRoom(roomId != null ? roomId.toString() : sessionId.toString(), String.format("{\"type\":\"AUCTION_END\",\"sessionId\":%d,\"winnerId\":%s,\"dealPrice\":%.2f}",
                    sessionId, session.getCurrentWinnerId(), session.getCurrentPrice()));
        } finally {
            stringRedisTemplate.delete(endLockKey);
        }
    }

    @PostMapping("/bid/submit")
    public Result<BidResponse> submitBid(@RequestBody BidRequest req) {
        // 从 JWT Token 获取真实用户ID，不使用请求体中的 userId（防止冒充）
        Long realUserId = UserContext.getUserId();
        if (realUserId == null) throw new RuntimeException("请先登录");

        // 分布式锁：锁 key 为 sessionId，value 为 userId+时间戳确保所有权
        String lockKey = "session:" + req.getSessionId() + ":lock";
        String lockValue = realUserId + "_" + System.currentTimeMillis();
        Boolean locked = stringRedisTemplate.opsForValue().setIfAbsent(lockKey, lockValue, Duration.ofSeconds(5));
        if (Boolean.FALSE.equals(locked)) throw new RuntimeException("系统繁忙，请稍后再试");
        try {
            String priceKey = "session:" + req.getSessionId() + ":price";
            String cached = stringRedisTemplate.opsForValue().get(priceKey);
            BigDecimal currentPrice;
            if (cached != null) currentPrice = new BigDecimal(cached);
            else {
                Session s = sessionService.getById(req.getSessionId());
                currentPrice = s.getCurrentPrice();
                stringRedisTemplate.opsForValue().set(priceKey, currentPrice.toString(), Duration.ofHours(1));
            }
            Session session = sessionService.getById(req.getSessionId());
            if (session.getStatus() != 1) throw new RuntimeException("拍卖未开始或已结束");
            BigDecimal diff = req.getBidPrice().subtract(currentPrice);
            if (diff.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("出价必须高于当前价格");
            if (diff.remainder(session.getIncrementPrice()).compareTo(BigDecimal.ZERO) != 0) throw new RuntimeException("出价金额必须是加价幅度的整数倍");

            // 记录之前最高出价者，用于被超通知
            Long previousWinnerId = session.getCurrentWinnerId();

            Bid bid = new Bid();
            bid.setSessionId(req.getSessionId());
            bid.setUserId(realUserId);
            bid.setBidPrice(req.getBidPrice());
            bid.setBidTime(LocalDateTime.now());
            bidService.save(bid);

            stringRedisTemplate.opsForValue().set(priceKey, req.getBidPrice().toString());
            stringRedisTemplate.opsForZSet().add("session:" + req.getSessionId() + ":rank", realUserId.toString(), req.getBidPrice().doubleValue());

            // 计算超越用户数：ZSet 中出价低于当前出价的用户数
            // 由于当前用户的 score = bidPrice，count(0, bidPrice-0.01) 不会计入自己
            String rankKey = "session:" + req.getSessionId() + ":rank";
            Long overtakeCount = stringRedisTemplate.opsForZSet().count(rankKey, 0, req.getBidPrice().doubleValue() - 0.01);
            int overtaken = overtakeCount != null ? overtakeCount.intValue() : 0;

            session.setCurrentPrice(req.getBidPrice());
            session.setCurrentWinnerId(realUserId);
            session.setTotalBids(session.getTotalBids() == null ? 1 : session.getTotalBids() + 1);
            sessionService.updateById(session);

            Long bidRoomId = findRoomIdBySessionId(req.getSessionId());
            SysUser bidUser = userService.getById(realUserId);
            String bidUserName = bidUser != null ? bidUser.getNickname() : ("用户" + realUserId);
            wsHandler.broadcastToRoom(bidRoomId != null ? bidRoomId.toString() : req.getSessionId().toString(),
                String.format("{\"type\":\"PRICE_UPDATE\",\"sessionId\":%d,\"currentPrice\":%.2f,\"userId\":%d,\"userName\":\"%s\",\"overtakeCount\":%d,\"outbidUserId\":%s}",
                    req.getSessionId(), req.getBidPrice(), realUserId, bidUserName, overtaken, previousWinnerId));

            if (session.getCeilingPrice() != null && req.getBidPrice().compareTo(session.getCeilingPrice()) >= 0) {
                releaseLock(lockKey, lockValue);
                endSession(session.getId());
            }

            BidResponse resp = new BidResponse();
            resp.setBid(bid);
            resp.setOvertakeCount(overtaken);
            return Result.success(resp);
        } finally {
            releaseLock(lockKey, lockValue);
        }
    }

    @GetMapping("/bid/history/{sessionId}")
    public Result<List<Bid>> getBidHistory(@PathVariable Long sessionId) {
        return Result.success(bidService.listBySessionId(sessionId));
    }

    @GetMapping("/bid/rank/{sessionId}")
    public Result<List<BidRankVO>> getRank(@PathVariable Long sessionId) {
        Set<String> set = stringRedisTemplate.opsForZSet().reverseRange("session:" + sessionId + ":rank", 0, -1);
        List<BidRankVO> list = new ArrayList<>();
        if (set != null) {
            int i = 1;
            for (String uid : set) {
                Double score = stringRedisTemplate.opsForZSet().score("session:" + sessionId + ":rank", uid);
                BidRankVO vo = new BidRankVO();
                vo.setUserId(Long.parseLong(uid));
                vo.setBidPrice(BigDecimal.valueOf(score == null ? 0 : score));
                vo.setRank(i++);
                SysUser u = userService.getById(Long.parseLong(uid));
                vo.setUserName(u != null ? u.getNickname() : ("用户" + uid));
                list.add(vo);
            }
        }
        return Result.success(list);
    }

    @GetMapping("/order/list")
    public Result<Page<Order>> getOrders(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) {
        return Result.success(orderService.page(page, size));
    }

    @GetMapping("/order/my")
    public Result<List<Order>> myOrders() {
        Long uid = UserContext.getUserId();
        return Result.success(orderService.list(new LambdaQueryWrapper<Order>().eq(Order::getUserId, uid)));
    }

    @PutMapping("/order/pay/{id}")
    public Result<Map<String,Object>> payOrder(@PathVariable Long id, @RequestBody(required = false) PayRequest req) {
        Order order = orderService.getById(id);
        if (order == null) throw new RuntimeException("订单不存在");
        int mode = req != null && req.getPaymentMode() != null ? req.getPaymentMode() : 0;
        int inst = req != null && req.getInstallments() != null ? req.getInstallments() : 0;

        order.setPaymentMode(mode);
        order.setPayTime(LocalDateTime.now());

        if (mode == 1) {
            // 先用后付
            order.setStatus(0); // 待还款
            order.setInstallments(inst > 0 ? inst : 3);
            order.setPaymentDueTime(LocalDateTime.now().plusDays(30));
        } else {
            // 立即支付
            order.setStatus(1);
            order.setInstallments(0);
        }
        orderService.updateById(order);

        Map<String,Object> result = new HashMap<>();
        result.put("status", order.getStatus());
        result.put("paymentMode", order.getPaymentMode());
        result.put("installments", order.getInstallments());
        result.put("paymentDueTime", order.getPaymentDueTime());
        if (mode == 1 && inst > 0) {
            BigDecimal monthly = order.getDealPrice().divide(BigDecimal.valueOf(inst), 2, java.math.RoundingMode.HALF_UP);
            result.put("monthlyPayment", monthly);
        }
        return Result.success(result);
    }
}

class Result<T> {
    private int code; private String message; private T data;
    public static <T> Result<T> success(T data) { Result<T> r = new Result<>(); r.code=200; r.message="success"; r.data=data; return r; }
    public static <T> Result<T> success() { return success(null); }
    public int getCode() { return code; } public void setCode(int c) { code=c; }
    public String getMessage() { return message; } public void setMessage(String m) { message=m; }
    public T getData() { return data; } public void setData(T d) { data=data; }
}

class BidRequest { private Long sessionId; private Long userId; private BigDecimal bidPrice;
    public Long getSessionId() { return sessionId; } public void setSessionId(Long v) { sessionId=v; }
    public Long getUserId() { return userId; } public void setUserId(Long v) { userId=v; }
    public BigDecimal getBidPrice() { return bidPrice; } public void setBidPrice(BigDecimal v) { bidPrice=v; }
}

class LoginRequest { private String username; private String password;
    public String getUsername() { return username; } public void setUsername(String v) { username=v; }
    public String getPassword() { return password; } public void setPassword(String v) { password=v; }
}

class RegisterRequest { private String username; private String password; private String nickname;
    public String getUsername() { return username; } public void setUsername(String v) { username=v; }
    public String getPassword() { return password; } public void setPassword(String v) { password=v; }
    public String getNickname() { return nickname; } public void setNickname(String v) { nickname=v; }
}

class LoginResponse { private String token; private SysUser user;
    public String getToken() { return token; } public void setToken(String v) { token=v; }
    public SysUser getUser() { return user; } public void setUser(SysUser v) { user=v; }
}

class CreateRoomRequest { private String roomName; private String coverUrl;
    public String getRoomName() { return roomName; } public void setRoomName(String v) { roomName=v; }
    public String getCoverUrl() { return coverUrl; } public void setCoverUrl(String v) { coverUrl=v; }
}

class AddRoomGoodsRequest { private Long roomId; private Long sessionId;
    public Long getRoomId() { return roomId; } public void setRoomId(Long v) { roomId=v; }
    public Long getSessionId() { return sessionId; } public void setSessionId(Long v) { sessionId=v; }
}

class LiveRoomVO { private Long id; private String roomName; private String coverUrl; private Integer status; private Integer viewerCount; private String playUrl; private List<Map<String, Object>> goodsList;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public String getRoomName() { return roomName; } public void setRoomName(String v) { roomName=v; }
    public String getCoverUrl() { return coverUrl; } public void setCoverUrl(String v) { coverUrl=v; }
    public Integer getStatus() { return status; } public void setStatus(Integer v) { status=v; }
    public Integer getViewerCount() { return viewerCount; } public void setViewerCount(Integer v) { viewerCount=v; }
    public String getPlayUrl() { return playUrl; } public void setPlayUrl(String v) { playUrl=v; }
    public List<Map<String, Object>> getGoodsList() { return goodsList; } public void setGoodsList(List<Map<String, Object>> v) { goodsList=v; }
}

class BidRankVO { private Long userId; private String userName; private BigDecimal bidPrice; private int rank;
    public Long getUserId() { return userId; } public void setUserId(Long v) { userId=v; }
    public String getUserName() { return userName; } public void setUserName(String v) { userName=v; }
    public BigDecimal getBidPrice() { return bidPrice; } public void setBidPrice(BigDecimal v) { bidPrice=v; }
    public int getRank() { return rank; } public void setRank(int v) { rank=v; }
}

@TableName("sys_user")
class SysUser {
    @TableId(type = IdType.AUTO) private Long id;
    private String username; private String password; private String nickname; private String avatar; private Integer role; private LocalDateTime createTime;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public String getUsername() { return username; } public void setUsername(String v) { username=v; }
    public String getPassword() { return password; } public void setPassword(String v) { password=v; }
    public String getNickname() { return nickname; } public void setNickname(String v) { nickname=v; }
    public String getAvatar() { return avatar; } public void setAvatar(String v) { avatar=v; }
    public Integer getRole() { return role; } public void setRole(Integer v) { role=v; }
    public LocalDateTime getCreateTime() { return createTime; } public void setCreateTime(LocalDateTime v) { createTime=v; }
}

@TableName("auction_goods")
class Goods {
    @TableId(type = IdType.AUTO) private Long id;
    private String name; private String description; private String category;
    @TableField(typeHandler = com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler.class)
    private List<String> images;
    private Integer stock; private LocalDateTime createTime;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public String getName() { return name; } public void setName(String v) { name=v; }
    public String getDescription() { return description; } public void setDescription(String v) { description=v; }
    public String getCategory() { return category; } public void setCategory(String v) { category=v; }
    public List<String> getImages() { return images; } public void setImages(List<String> v) { images=v; }
    public Integer getStock() { return stock; } public void setStock(Integer v) { stock=v; }
    public LocalDateTime getCreateTime() { return createTime; } public void setCreateTime(LocalDateTime v) { createTime=v; }
}

@TableName("auction_session")
class Session {
    @TableId(type = IdType.AUTO) private Long id; private Long goodsId; private BigDecimal startPrice; private BigDecimal incrementPrice; private BigDecimal ceilingPrice; private Integer durationSeconds; private Integer status; private LocalDateTime startTime; private LocalDateTime endTime; private BigDecimal currentPrice; private Long currentWinnerId; private Integer totalBids;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public Long getGoodsId() { return goodsId; } public void setGoodsId(Long v) { goodsId=v; }
    public BigDecimal getStartPrice() { return startPrice; } public void setStartPrice(BigDecimal v) { startPrice=v; }
    public BigDecimal getIncrementPrice() { return incrementPrice; } public void setIncrementPrice(BigDecimal v) { incrementPrice=v; }
    public BigDecimal getCeilingPrice() { return ceilingPrice; } public void setCeilingPrice(BigDecimal v) { ceilingPrice=v; }
    public Integer getDurationSeconds() { return durationSeconds; } public void setDurationSeconds(Integer v) { durationSeconds=v; }
    public Integer getStatus() { return status; } public void setStatus(Integer v) { status=v; }
    public LocalDateTime getStartTime() { return startTime; } public void setStartTime(LocalDateTime v) { startTime=v; }
    public LocalDateTime getEndTime() { return endTime; } public void setEndTime(LocalDateTime v) { endTime=v; }
    public BigDecimal getCurrentPrice() { return currentPrice; } public void setCurrentPrice(BigDecimal v) { currentPrice=v; }
    public Long getCurrentWinnerId() { return currentWinnerId; } public void setCurrentWinnerId(Long v) { currentWinnerId=v; }
    public Integer getTotalBids() { return totalBids; } public void setTotalBids(Integer v) { totalBids=v; }
}

@TableName("auction_bid")
class Bid {
    @TableId(type = IdType.AUTO) private Long id; private Long sessionId; private Long userId; private BigDecimal bidPrice; private LocalDateTime bidTime;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public Long getSessionId() { return sessionId; } public void setSessionId(Long v) { sessionId=v; }
    public Long getUserId() { return userId; } public void setUserId(Long v) { userId=v; }
    public BigDecimal getBidPrice() { return bidPrice; } public void setBidPrice(BigDecimal v) { bidPrice=v; }
    public LocalDateTime getBidTime() { return bidTime; } public void setBidTime(LocalDateTime v) { bidTime=v; }
}

@TableName("auction_order")
class Order {
    @TableId(type = IdType.AUTO) private Long id; private Long sessionId; private Long goodsId; private Long userId; private BigDecimal dealPrice; private Integer status; private LocalDateTime payTime;
    private Integer paymentMode;     // 0=立即支付 1=先用后付
    private Integer installments;    // 分期数: 3/6/12
    private LocalDateTime paymentDueTime; // 还款截止时间
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public Long getSessionId() { return sessionId; } public void setSessionId(Long v) { sessionId=v; }
    public Long getGoodsId() { return goodsId; } public void setGoodsId(Long v) { goodsId=v; }
    public Long getUserId() { return userId; } public void setUserId(Long v) { userId=v; }
    public BigDecimal getDealPrice() { return dealPrice; } public void setDealPrice(BigDecimal v) { dealPrice=v; }
    public Integer getStatus() { return status; } public void setStatus(Integer v) { status=v; }
    public LocalDateTime getPayTime() { return payTime; } public void setPayTime(LocalDateTime v) { payTime=v; }
    public Integer getPaymentMode() { return paymentMode; } public void setPaymentMode(Integer v) { paymentMode=v; }
    public Integer getInstallments() { return installments; } public void setInstallments(Integer v) { installments=v; }
    public LocalDateTime getPaymentDueTime() { return paymentDueTime; } public void setPaymentDueTime(LocalDateTime v) { paymentDueTime=v; }
}

class BidResponse {
    private Bid bid;
    private int overtakeCount; // 本次出价超越了之前多少用户
    public Bid getBid() { return bid; } public void setBid(Bid b) { bid=b; }
    public int getOvertakeCount() { return overtakeCount; } public void setOvertakeCount(int c) { overtakeCount=c; }
}

class PayRequest {
    private Integer paymentMode;   // 0=立即支付 1=先用后付
    private Integer installments;  // 分期数
    public Integer getPaymentMode() { return paymentMode; } public void setPaymentMode(Integer v) { paymentMode=v; }
    public Integer getInstallments() { return installments; } public void setInstallments(Integer v) { installments=v; }
}

@TableName("live_room")
class LiveRoom {
    @TableId(type = IdType.AUTO) private Long id; private Long anchorId; private String roomName; private String coverUrl; private String streamKey; private String pushUrl; private String playUrl; private Integer status; private Integer viewerCount; private LocalDateTime startTime; private LocalDateTime endTime; private LocalDateTime createTime; private LocalDateTime updateTime;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public Long getAnchorId() { return anchorId; } public void setAnchorId(Long v) { anchorId=v; }
    public String getRoomName() { return roomName; } public void setRoomName(String v) { roomName=v; }
    public String getCoverUrl() { return coverUrl; } public void setCoverUrl(String v) { coverUrl=v; }
    public String getStreamKey() { return streamKey; } public void setStreamKey(String v) { streamKey=v; }
    public String getPushUrl() { return pushUrl; } public void setPushUrl(String v) { pushUrl=v; }
    public String getPlayUrl() { return playUrl; } public void setPlayUrl(String v) { playUrl=v; }
    public Integer getStatus() { return status; } public void setStatus(Integer v) { status=v; }
    public Integer getViewerCount() { return viewerCount; } public void setViewerCount(Integer v) { viewerCount=v; }
    public LocalDateTime getStartTime() { return startTime; } public void setStartTime(LocalDateTime v) { startTime=v; }
    public LocalDateTime getEndTime() { return endTime; } public void setEndTime(LocalDateTime v) { endTime=v; }
    public LocalDateTime getCreateTime() { return createTime; } public void setCreateTime(LocalDateTime v) { createTime=v; }
    public LocalDateTime getUpdateTime() { return updateTime; } public void setUpdateTime(LocalDateTime v) { updateTime=v; }
}

@TableName("live_room_goods")
class LiveRoomGoods {
    @TableId(type = IdType.AUTO) private Long id; private Long roomId; private Long sessionId; private Integer sortOrder; private Integer status; private LocalDateTime createTime;
    public Long getId() { return id; } public void setId(Long v) { id=v; }
    public Long getRoomId() { return roomId; } public void setRoomId(Long v) { roomId=v; }
    public Long getSessionId() { return sessionId; } public void setSessionId(Long v) { sessionId=v; }
    public Integer getSortOrder() { return sortOrder; } public void setSortOrder(Integer v) { sortOrder=v; }
    public Integer getStatus() { return status; } public void setStatus(Integer v) { status=v; }
    public LocalDateTime getCreateTime() { return createTime; } public void setCreateTime(LocalDateTime v) { createTime=v; }
}

@Mapper interface UserMapper extends BaseMapper<SysUser> {}
@Mapper interface GoodsMapper extends BaseMapper<Goods> {}
@Mapper interface SessionMapper extends BaseMapper<Session> {}
@Mapper interface BidMapper extends BaseMapper<Bid> {}
@Mapper interface OrderMapper extends BaseMapper<Order> {}
@Mapper interface LiveRoomMapper extends BaseMapper<LiveRoom> {}
@Mapper interface LiveRoomGoodsMapper extends BaseMapper<LiveRoomGoods> {}

@Service
class UserService { private final UserMapper m; UserService(UserMapper m) { this.m=m; } public SysUser getById(Long id) { return m.selectById(id); } public void save(SysUser e) { m.insert(e); } public long count(LambdaQueryWrapper<SysUser> w) { return m.selectCount(w); } public SysUser getOne(LambdaQueryWrapper<SysUser> w) { return m.selectOne(w); } }
@Service
class GoodsService { private final GoodsMapper m; GoodsService(GoodsMapper m) { this.m=m; } public Page<Goods> page(int p, int s) { return m.selectPage(new Page<>(p, s), null); } public Goods getById(Long id) { return m.selectById(id); } public void save(Goods e) { m.insert(e); } public void updateById(Goods e) { m.updateById(e); } }
@Service
class SessionService { private final SessionMapper m; SessionService(SessionMapper m) { this.m=m; } public Page<Session> page(int p, int s) { return m.selectPage(new Page<>(p, s), null); } public Session getById(Long id) { return m.selectById(id); } public void save(Session e) { m.insert(e); } public void updateById(Session e) { m.updateById(e); } public List<Session> list(LambdaQueryWrapper<Session> w) { return m.selectList(w); } }
@Service
class BidService { private final BidMapper m; BidService(BidMapper m) { this.m=m; } public List<Bid> listBySessionId(Long sid) { return m.selectList(new LambdaQueryWrapper<Bid>().eq(Bid::getSessionId, sid).orderByDesc(Bid::getBidTime)); } public void save(Bid e) { m.insert(e); } }
@Service
class OrderService { private final OrderMapper m; OrderService(OrderMapper m) { this.m=m; } public Page<Order> page(int p, int s) { return m.selectPage(new Page<>(p, s), null); } public Order getById(Long id) { return m.selectById(id); } public void updateById(Order e) { m.updateById(e); } public void save(Order e) { m.insert(e); } public List<Order> list(LambdaQueryWrapper<Order> w) { return m.selectList(w); } }
@Service
class LiveRoomService { private final LiveRoomMapper m; LiveRoomService(LiveRoomMapper m) { this.m=m; } public Page<LiveRoom> page(Page<LiveRoom> p, LambdaQueryWrapper<LiveRoom> w) { return m.selectPage(p, w); } public LiveRoom getById(Long id) { return m.selectById(id); } public void save(LiveRoom e) { m.insert(e); } public void updateById(LiveRoom e) { m.updateById(e); } public void deleteById(Long id) { m.deleteById(id); } }
@Service
class LiveRoomGoodsService { private final LiveRoomGoodsMapper m; LiveRoomGoodsService(LiveRoomGoodsMapper m) { this.m=m; } public void save(LiveRoomGoods e) { m.insert(e); } public LiveRoomGoods getById(Long id) { return m.selectById(id); } public void updateById(LiveRoomGoods e) { m.updateById(e); } public List<LiveRoomGoods> list(LambdaQueryWrapper<LiveRoomGoods> w) { return m.selectList(w); } public void deleteById(Long id) { m.deleteById(id); } public void deleteByRoomId(Long roomId) { m.delete(new LambdaQueryWrapper<LiveRoomGoods>().eq(LiveRoomGoods::getRoomId, roomId)); } }

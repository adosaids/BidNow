package com.auction.master;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@SpringBootApplication
@MapperScan("com.auction.master")
public class AuctionMasterApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuctionMasterApplication.class, args);
        System.out.println("========================================");
        System.out.println("Auction Master Backend Started! Port 8082");
        System.out.println("========================================");
    }
}

@Configuration
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
        return interceptor;
    }

    private final AuctionWsHandler wsHandler;

    WebSocketConfig(AuctionWsHandler wsHandler) {
        this.wsHandler = wsHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(wsHandler, "/ws/auction/{roomId}").setAllowedOrigins("*");
    }
}

@Component
class AuctionWsHandler extends TextWebSocketHandler {
    private final ConcurrentHashMap<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomId = Objects.requireNonNull(session.getUri()).getPath().split("/")[3];
        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);
        System.out.println("New connection joined room: " + roomId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        rooms.values().forEach(sessions -> sessions.remove(session));
        System.out.println("Connection closed");
    }

    public void broadcastToRoom(String roomId, String message) {
        Set<WebSocketSession> sessions = rooms.get(roomId);
        if (sessions != null) {
            sessions.forEach(s -> {
                try {
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(message));
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }
}

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
class ApiController {
    private final GoodsService goodsService;
    private final SessionService sessionService;
    private final BidService bidService;
    private final OrderService orderService;
    private final AuctionWsHandler wsHandler;

    ApiController(GoodsService goodsService, SessionService sessionService, BidService bidService, OrderService orderService, AuctionWsHandler wsHandler) {
        this.goodsService = goodsService;
        this.sessionService = sessionService;
        this.bidService = bidService;
        this.orderService = orderService;
        this.wsHandler = wsHandler;
    }

    @GetMapping("/hello")
    public Result<String> hello() {
        return Result.success("Auction System Running!");
    }

    @GetMapping("/goods/list")
    public Result<Page<Goods>> getGoodsList(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) {
        return Result.success(goodsService.page(page, size));
    }

    @GetMapping("/goods/{id}")
    public Result<Goods> getGoods(@PathVariable Long id) {
        return Result.success(goodsService.getById(id));
    }

    @PostMapping("/goods")
    public Result<Goods> createGoods(@RequestBody Goods goods) {
        goods.setCreateTime(LocalDateTime.now());
        goodsService.save(goods);
        return Result.success(goods);
    }

    @GetMapping("/auction/list")
    public Result<Page<Session>> getSessions(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) {
        return Result.success(sessionService.page(page, size));
    }

    @GetMapping("/auction/{id}")
    public Result<Session> getSession(@PathVariable Long id) {
        return Result.success(sessionService.getById(id));
    }

    @PostMapping("/auction")
    public Result<Session> createSession(@RequestBody Session session) {
        session.setCurrentPrice(session.getStartPrice());
        sessionService.save(session);
        return Result.success(session);
    }

    @PutMapping("/auction/start/{id}")
    public Result<Void> startSession(@PathVariable Long id) {
        Session session = sessionService.getById(id);
        session.setStatus(1);
        session.setStartTime(LocalDateTime.now());
        session.setEndTime(LocalDateTime.now().plusSeconds(session.getDurationSeconds()));
        sessionService.updateById(session);
        wsHandler.broadcastToRoom(id.toString(), "{\"type\":\"AUCTION_START\",\"sessionId\":" + id + "}");
        return Result.success();
    }

    @PostMapping("/bid/submit")
    public Result<Bid> submitBid(@RequestBody BidRequest req) {
        Session session = sessionService.getById(req.getSessionId());
        if (session.getStatus() != 1) {
            throw new RuntimeException("Auction not started or ended");
        }
        BigDecimal nextPrice = session.getCurrentPrice().add(session.getIncrementPrice());
        if (req.getBidPrice().compareTo(nextPrice) != 0 && !req.getBidPrice().equals(session.getStartPrice())) {
            throw new RuntimeException("Must bid with correct increment");
        }

        Bid bid = new Bid();
        bid.setSessionId(req.getSessionId());
        bid.setUserId(req.getUserId());
        bid.setBidPrice(req.getBidPrice());
        bid.setBidTime(LocalDateTime.now());
        bidService.save(bid);

        session.setCurrentPrice(req.getBidPrice());
        session.setCurrentWinnerId(req.getUserId());
        session.setTotalBids(session.getTotalBids() + 1);
        sessionService.updateById(session);

        wsHandler.broadcastToRoom(req.getSessionId().toString(),
                String.format("{\"type\":\"PRICE_UPDATE\",\"sessionId\":%d,\"currentPrice\":%.2f,\"userId\":%d}",
                        req.getSessionId(), req.getBidPrice(), req.getUserId()));
        return Result.success(bid);
    }

    @GetMapping("/bid/history/{sessionId}")
    public Result<List<Bid>> getBidHistory(@PathVariable Long sessionId) {
        return Result.success(bidService.listBySessionId(sessionId));
    }

    @GetMapping("/order/list")
    public Result<Page<Order>> getOrders(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) {
        return Result.success(orderService.page(page, size));
    }

    @PutMapping("/order/pay/{id}")
    public Result<Void> payOrder(@PathVariable Long id) {
        Order order = orderService.getById(id);
        order.setStatus(1);
        order.setPayTime(LocalDateTime.now());
        orderService.updateById(order);
        return Result.success();
    }
}

class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.code = 200;
        r.message = "success";
        r.data = data;
        return r;
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
}

class BidRequest {
    private Long sessionId;
    private Long userId;
    private BigDecimal bidPrice;

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public BigDecimal getBidPrice() { return bidPrice; }
    public void setBidPrice(BigDecimal bidPrice) { this.bidPrice = bidPrice; }
}

@TableName("auction_goods")
class Goods {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private String category;
    private LocalDateTime createTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
}

@TableName("auction_session")
class Session {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long goodsId;
    private BigDecimal startPrice;
    private BigDecimal incrementPrice;
    private BigDecimal ceilingPrice;
    private Integer durationSeconds;
    private Integer status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private BigDecimal currentPrice;
    private Long currentWinnerId;
    private Integer totalBids;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }
    public BigDecimal getStartPrice() { return startPrice; }
    public void setStartPrice(BigDecimal startPrice) { this.startPrice = startPrice; }
    public BigDecimal getIncrementPrice() { return incrementPrice; }
    public void setIncrementPrice(BigDecimal incrementPrice) { this.incrementPrice = incrementPrice; }
    public BigDecimal getCeilingPrice() { return ceilingPrice; }
    public void setCeilingPrice(BigDecimal ceilingPrice) { this.ceilingPrice = ceilingPrice; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public BigDecimal getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(BigDecimal currentPrice) { this.currentPrice = currentPrice; }
    public Long getCurrentWinnerId() { return currentWinnerId; }
    public void setCurrentWinnerId(Long currentWinnerId) { this.currentWinnerId = currentWinnerId; }
    public Integer getTotalBids() { return totalBids; }
    public void setTotalBids(Integer totalBids) { this.totalBids = totalBids; }
}

@TableName("auction_bid")
class Bid {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long sessionId;
    private Long userId;
    private BigDecimal bidPrice;
    private LocalDateTime bidTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public BigDecimal getBidPrice() { return bidPrice; }
    public void setBidPrice(BigDecimal bidPrice) { this.bidPrice = bidPrice; }
    public LocalDateTime getBidTime() { return bidTime; }
    public void setBidTime(LocalDateTime bidTime) { this.bidTime = bidTime; }
}

@TableName("auction_order")
class Order {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long sessionId;
    private Long goodsId;
    private Long userId;
    private BigDecimal dealPrice;
    private Integer status;
    private LocalDateTime payTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public BigDecimal getDealPrice() { return dealPrice; }
    public void setDealPrice(BigDecimal dealPrice) { this.dealPrice = dealPrice; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public LocalDateTime getPayTime() { return payTime; }
    public void setPayTime(LocalDateTime payTime) { this.payTime = payTime; }
}

@Mapper
interface GoodsMapper extends BaseMapper<Goods> {}

@Mapper
interface SessionMapper extends BaseMapper<Session> {}

@Mapper
interface BidMapper extends BaseMapper<Bid> {}

@Mapper
interface OrderMapper extends BaseMapper<Order> {}

@Service
class GoodsService {
    private final GoodsMapper mapper;
    GoodsService(GoodsMapper mapper) { this.mapper = mapper; }
    public Page<Goods> page(int page, int size) { return mapper.selectPage(new Page<>(page, size), null); }
    public Goods getById(Long id) { return mapper.selectById(id); }
    public void save(Goods entity) { mapper.insert(entity); }
    public void updateById(Goods entity) { mapper.updateById(entity); }
}

@Service
class SessionService {
    private final SessionMapper mapper;
    SessionService(SessionMapper mapper) { this.mapper = mapper; }
    public Page<Session> page(int page, int size) { return mapper.selectPage(new Page<>(page, size), null); }
    public Session getById(Long id) { return mapper.selectById(id); }
    public void save(Session entity) { mapper.insert(entity); }
    public void updateById(Session entity) { mapper.updateById(entity); }
}

@Service
class BidService {
    private final BidMapper mapper;
    BidService(BidMapper mapper) { this.mapper = mapper; }
    public List<Bid> listBySessionId(Long sessionId) {
        return mapper.selectList(new LambdaQueryWrapper<Bid>().eq(Bid::getSessionId, sessionId).orderByDesc(Bid::getBidTime));
    }
    public void save(Bid entity) { mapper.insert(entity); }
}

@Service
class OrderService {
    private final OrderMapper mapper;
    OrderService(OrderMapper mapper) { this.mapper = mapper; }
    public Page<Order> page(int page, int size) { return mapper.selectPage(new Page<>(page, size), null); }
    public Order getById(Long id) { return mapper.selectById(id); }
    public void updateById(Order entity) { mapper.updateById(entity); }
}

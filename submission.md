# BidNow - 实时直播竞拍平台

## 1. 课题名称

**BidNow — 实时直播竞拍平台**

---

## 2. 团队名称与成员名单

| 姓名 | 学校 | 专业 | 角色 |
|------|------|------|------|
| 覃鹏坤 | 西安邮电大学 | 电子信息工程| 全栈开发 / 后端 / 前端 / 产品设计 |

---

## 3. 分工说明

| 模块 | 负责人 | 具体内容 |
|------|--------|----------|
| 后端服务 |覃鹏坤 | Spring Boot 核心逻辑、WebSocket 实时通信、Redis 分布式锁与排行榜、JWT 鉴权、MySQL 数据层、REST API |
| 商家管理后台 |覃鹏坤 | React + Ant Design 管理端，商品/拍卖/订单/直播间 CRUD，图片上传 |
| H5 移动端 | 覃鹏坤| React + Ant Design Mobile 竞拍端，HLS 直播播放器、实时出价 UI、排行面板、BNPL 先用后付、WebSocket 客户端 |
| 数据库设计 |覃鹏坤 | MySQL 表结构设计、索引优化、初始化脚本 |
| 部署与文档 |覃鹏坤 | 项目 README、启动脚本、构建配置 |

---

## 4. 核心功能清单

1. **直播带货 + 实时竞拍**：HLS 视频流播放，商品在直播间上架后实时同步，观众边看边出价
2. **WebSocket 毫秒级竞价同步**：出价通过 WebSocket 广播至房间内所有用户，价格、排名实时更新，支持掉线自动重连（指数退避）
3. **Redis ZSet 出价排行榜**：所有出价写入 Redis ZSet，按价格排序，每次出价返回「已超越 X 位用户」，排名数据以后端为唯一数据源
4. **先用后付（BNPL）+ 分期还款**：用户可选择「立即支付」或「先用后付（分 3 期，30 天后还款）」，降低竞拍决策门槛
5. **商家管理后台**：商品管理、拍卖场次创建（起拍价/加价幅度/封顶价/持续时间）、直播间管理、订单管理、图片上传
6. **防超卖 + 分布式锁**：拍卖结束时通过 Redis 分布式锁 + Lua 脚本安全释放 + 订单幂等检查，防止并发结束导致重复订单

---

## 5. 端到端使用流程

1. **管理员**登录商家后台，创建商品（名称、描述、图片）和拍卖场次（起拍价 ¥100、加价幅度 ¥50、封顶价 ¥10,000、持续 5 分钟）
2. **管理员**创建直播间，将商品/场次上架到直播间，开启直播
3. **用户**在 H5 移动端登录后进入直播间列表，看到正在直播的房间，点击进入
4. 直播间加载 HLS 视频流，同时通过 WebSocket 连接到房间，左上角排行面板显示当前拍卖商品名称、倒计时、当前最高价
5. **用户**选择加价倍数（+¥50 / +¥100 / +¥250 / +¥500）或自定义金额，点击「立即出价」；出价成功显示「已超越 X 位用户」，排行榜实时刷新
6. **其他用户**出价更高时，被超越的用户收到「有人出价更高，你被超越了！」的实时提醒
7. 倒计时归零或触及封顶价，拍卖自动结束，最高出价者生成待支付订单
8. **获胜用户**在「我的订单」中选择立即支付或先用后付（分 3 期，每期 ¥XXX，30 天后还款）

---

## 6. 在线 Demo 链接

> 本项目为本地运行演示，提供以下访问方式：

| 端口 | 说明 | 地址 |
|------|------|------|
| 8082 | 后端 API | `http://localhost:8082` |
| 3000 | 商家管理后台 | `http://localhost:3000` |
| 3001 | H5 移动端 | `http://localhost:3001` |

**体验账号：**

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 管理员（商家后台 + 竞拍） |
| user1 | 123456 | 竞拍用户 |
| user2 | 123456 | 竞拍用户 |


---

## 7. 演示视频链接

---

## 8. 源代码仓库链接

[> 请填写 GitHub / GitLab 仓库地址](https://github.com/adosaids/BidNow)

```
主仓库：
分支说明：main（主分支）
最后提交：git log -1 --format="%h %s %ci"
```

---

## 9. README / 运行说明

### 项目简介

BidNow 是一个功能完整的实时直播拍卖平台，支持商品管理、拍卖会话管理、实时出价、订单生成、先用后付等核心功能。采用前后端分离架构，通过 WebSocket 实现毫秒级的实时竞价同步。

### 依赖环境

| 环境 | 版本要求 |
|------|----------|
| JDK | 17+ |
| Node.js | 16+ |
| MySQL | 8.0+ |
| Maven | 3.6+ |
| Redis | 6.0+ |

### 启动步骤

**1. 数据库初始化**
```bash
mysql -u root -p < src/main/resources/sql/init.sql
```
默认数据库 `auction_master`，用户名 `root`，密码 `root`。

**2. 启动后端**
```bash
mvn spring-boot:run
# 后端运行在 http://localhost:8082
```

**3. 启动商家管理后台**
```bash
cd admin-simple
npm install
npm run dev
# 运行在 http://localhost:3000
```

**4. 启动 H5 移动端**
```bash
cd h5-simple
npm install
npm run dev
# 运行在 http://localhost:3001
```

### 目录结构

```
f:\zijie
├── src/main/java/com/auction/master/  # 后端（单文件架构 ~1100 行）
│   └── AuctionMasterApplication.java  # 所有 Entity/Mapper/Service/Controller/Config
├── src/main/resources/
│   ├── sql/init.sql                   # 数据库初始化
│   └── application.yml                # 后端配置
├── admin-simple/                      # 商家管理后台 (React + Ant Design)
│   ├── src/main.tsx                   # 单页面：商品/拍卖/订单/直播间管理
│   └── vite.config.ts                 # Vite 配置 + API 代理
├── h5-simple/                         # H5 移动端 (React + Ant Design Mobile)
│   ├── src/RoomPage.tsx               # 直播竞拍房间页（核心页面）
│   ├── src/RoomList.tsx               # 直播间列表
│   ├── src/Profile.tsx                # 个人中心 + 订单支付
│   └── src/request.ts                 # API 客户端
├── pom.xml                            # Maven 配置
└── README.md
```

### 配置说明

`application.yml` 关键配置：
- `server.port`: 8082
- `spring.datasource`: MySQL 连接（localhost:3306/auction_master）
- `spring.redis`: Redis 连接（localhost:6379，无密码）
- `mybatis-plus.configuration.log-impl`: 控制台 SQL 日志

---

## 10. 系统架构图

```
┌──────────────────────────────────────────────────────────────┐
│                        前端层                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐          │
│  │  admin-simple (3000) │    │   h5-simple (3001)   │          │
│  │  React + Ant Design  │    │ React + AntD Mobile │          │
│  │  商家管理后台          │    │  H5 移动竞拍端       │          │
│  └─────────┬───────────┘    └─────────┬───────────┘          │
│            │ HTTP/REST                │ HTTP/REST + WebSocket│
└────────────┼──────────────────────────┼──────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                     Spring Boot 3.2.5 :8082                 │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐  │
│  │AuthController│LiveRoomCtrl││ ApiController││WebSocketHandler│
│  │ /api/auth │ │ /api/live │ │  /api/*     │ │ /ws/auction│  │
│  └──────────┘ └───────────┘ └────────────┘ └───────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  JWT 鉴权拦截器  │  @RestControllerAdvice 全局异常     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬───────────────────────┬───────────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────┐  ┌────────────────────────┐
│   MySQL 8.0 :3306  │  │    Redis 6.0 :6379      │
│  sys_user          │  │  session:{id}:price     │
│  auction_goods     │  │  session:{id}:rank (ZSet)│
│  auction_session   │  │  session:{id}:lock      │
│  auction_bid       │  │  session:{id}:timer     │
│  auction_order     │  │  room:{id}:online_count │
│  live_room         │  │  token 黑名单           │
│  live_room_goods   │  └────────────────────────┘
└────────────────────┘

外部服务（可选）：
  ┌──────────────────┐
  │  阿里云直播       │
  │  (HLS 推/拉流)    │
  └──────────────────┘
```

**调用关系**：
1. H5 前端 → HTTP REST → 后端 API → MyBatis-Plus → MySQL
2. H5 前端 ↔ WebSocket ↔ 后端 AuctionWsHandler（房间广播、出价推送）
3. 后端出价逻辑 → Redis ZSet（排行） + Redis String（价格缓存/分布式锁）
4. 拍卖结束定时任务 → ScheduledExecutorService → endSession → 创建订单

---

## 11. 大模型 / AI 能力使用说明

本项目当前版本不直接调用大模型 API。以下为可扩展的 AI 集成方案：

| 集成点 | 方案 | 说明 |
|--------|------|------|
| 商品描述生成 | LLM API（如 Claude / GPT） | 管理员上传商品图片后，自动生成商品描述文案 |
| 智能推荐 | 协同过滤 / Embedding | 基于用户出价历史推荐感兴趣的拍卖商品 |
| 直播弹幕审核 | LLM 内容审核 | 对用户弹幕进行实时安全审核 |
| 风控反欺诈 | 规则引擎 + ML | 检测异常出价行为（如恶意抬价） |

若后续集成，建议使用 Claude API 或 GPT-4o，通过 Spring Boot 的 `@Service` 层封装调用，在商品创建和弹幕发送时触发。

---

## 12. 关键工程难点与解决方案

### 难点一：拍卖结束的并发竞态（超卖问题）

**问题**：拍卖倒计时归零和封顶价触发可能在极短时间间隔内同时调用 `endSession`，导致创建重复订单（超卖）。

**解决方案**：
- Redis 分布式锁（`SET key value NX EX 10`）保证同一场次只有一个线程执行结束逻辑
- 锁释放使用 **Lua 脚本**原子操作：`if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1])`，避免误删其他线程的锁
- 创建订单前**再次检查**该场次是否已有订单（幂等性），防止极端情况下的重复写入

### 难点二：Redis 序列化不一致导致 ZSet 排行失效

**问题**：项目中同时存在 `RedisTemplate<String, Object>`（使用 `GenericJackson2JsonRedisSerializer` 序列化值）和 `StringRedisTemplate`（纯字符串）。当 ZSet 成员用 `redisTemplate` 写入（值变成 `"\"100.00\""`），用 `stringRedisTemplate` 读取时，`count()` 和 `score()` 操作因数据类型不匹配而失效，导致 overtakeCount 始终为 0。

**解决方案**：
- 统一所有 ZSet（排行榜）、String（价格缓存、锁、定时器）操作使用 `stringRedisTemplate`
- `redisTemplate` 仅保留用于 `room:online_count` 等已有序列化兼容的 Key
- 出价时在 ZSet `add` **之前**记录用户是否已有出价，避免 `add`（更新 score）后无法区分首次出价和重复出价

### 难点三：前后端 WebSocket 实时排行同步

**问题**：初始方案中，前端在收到 PRICE_UPDATE 消息后本地拼接排行数据，导致排序错误、用户名缺失（显示「用户7」）、重复追加而非整体替换。

**解决方案**：
- **后端作为唯一数据源**：新增 `/api/bid/rank/{sessionId}` 接口，从 Redis ZSet 按 score 降序返回排行，并关联 `sys_user` 表填充真实昵称
- 前端在页面加载、自己出价成功、收到 WebSocket PRICE_UPDATE 三种场景下，均调用排行接口**整体替换** `bidRecords` 状态，不再前端拼接
- WebSocket PRICE_UPDATE 消息自带 `sessionId`，前端直接使用消息中的 ID 调用排行接口，解决 initRoom 异步导致的时序问题

### 难点四：商品上架实时同步

**问题**：管理员在后台将商品上架到直播间后，已在直播间的用户需要手动刷新页面才能看到新商品。

**解决方案**：
- 后端 `addGoods` 接口在保存成功后，通过 WebSocket 广播 `GOODS_UPDATE` 消息至对应房间
- 前端收到消息后自动重新请求 `/api/live/room/{id}` 获取最新商品列表，并自动切换当前竞拍场次

---

## 13. 项目亮点 / 创新点

1. **先用后付（BNPL）降低竞拍门槛**：不同于传统拍卖「落槌即付款」的模式，BidNow 支持用户竞拍成功后选择分 3 期、30 天后还款，降低决策心理负担，促进出价活跃度
2. **Redis ZSet 驱动的高性能排行榜**：所有出价实时写入 Redis ZSet（O(log N)），排行查询直接反向遍历 ZSet 返回，避免 MySQL 排序查询的性能瓶颈，每次出价精确计算「已超越 X 位用户」
3. **弹幕 + 竞拍融合体验**：将直播弹幕与出价记录融合展示，出价消息以弹幕形式飘过，同时左上角展开面板展示实时排行榜，营造直播间沉浸感

---

## 14. 其余材料

### 14.1 性能指标

| 指标 | 数值 |
|------|------|
| 后端启动时间 | ~2 秒 |
| 单次出价 API 响应 | < 50ms（含 Redis ZSet 写入 + MySQL 持久化） |
| WebSocket 广播延迟 | < 10ms（进程内广播） |
| ZSet 排行查询 | < 5ms（Redis 内存操作） |
| H5 首屏加载 | ~2.5s（含 hls.js 异步加载） |

### 14.2 评测方案

| 测试场景 | 输入 | 预期输出 |
|----------|------|----------|
| 正常出价 | 当前价 ¥100，加价 ¥50，user1 出价 ¥200 | overtakeCount=0（首次），价格更新，排行刷新 |
| 超越出价 | user2 出价 ¥300 | overtakeCount=1（超越 user1），user1 收到被超提醒 |
| 重复出价 | user1 再次出价 ¥500 | overtakeCount=1（超越 user2，不包含自己），排行仅显示每个用户最高价 |
| 封顶价触发 | user3 出价触及封顶价 | 拍卖立即结束，生成 user3 的订单 |
| 并发结束 | 倒计时归零与封顶价同时触发 | 仅生成一份订单，分布式锁保证幂等 |


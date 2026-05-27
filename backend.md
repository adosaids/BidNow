# 实时竞拍大师 - 后端详细实现文档

## 技术栈选型
- 核心框架：Spring Boot 3.x
- ORM框架：MyBatis-Plus
- 数据库：MySQL 8.0
- 缓存：Redis 7.x
- WebSocket：Spring WebSocket
- 分布式锁：Redisson
- 单元测试：JUnit 5 + Mockito
- 构建工具：Maven

## 项目目录结构
```
src/
├── main/
│   ├── java/com/auction/master/
│   │   ├── controller/          # 控制器层
│   │   ├── service/             # 服务层
│   │   │   └── impl/            # 服务实现
│   │   ├── mapper/              # MyBatis Mapper接口
│   │   ├── entity/              # 数据库实体类
│   │   ├── dto/                 # 数据传输对象
│   │   ├── vo/                  # 视图返回对象
│   │   ├── config/              # 配置类
│   │   ├── websocket/           # WebSocket处理
│   │   ├── enums/               # 枚举类
│   │   ├── exception/           # 自定义异常
│   │   └── util/                # 工具类
│   └── resources/
│       ├── mapper/              # MyBatis XML文件
│       ├── application.yml      # 配置文件
│       └── sql/                 # 初始化SQL脚本
└── test/                        # 单元测试目录（独立存放）
    └── java/com/auction/master/
        ├── controller/
        ├── service/
        └── websocket/
```

## 数据库表设计

### 1. 用户表 (sys_user)
```sql
CREATE TABLE sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(64) NOT NULL COMMENT '用户名',
    password VARCHAR(128) NOT NULL COMMENT '密码',
    nickname VARCHAR(64) COMMENT '昵称',
    avatar VARCHAR(256) COMMENT '头像',
    role TINYINT NOT NULL DEFAULT 1 COMMENT '角色 1-普通用户 2-商家',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 2. 商品表 (auction_goods)
```sql
CREATE TABLE auction_goods (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '商品ID',
    name VARCHAR(128) NOT NULL COMMENT '商品名称',
    description TEXT COMMENT '商品描述',
    images JSON COMMENT '商品图片列表',
    category VARCHAR(64) COMMENT '商品分类',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='竞拍商品表';
```

### 3. 竞拍表 (auction_session)
```sql
CREATE TABLE auction_session (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '竞拍场次ID',
    goods_id BIGINT NOT NULL COMMENT '关联商品ID',
    start_price DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '起拍价',
    increment_price DECIMAL(10,2) NOT NULL COMMENT '加价幅度',
    ceiling_price DECIMAL(10,2) COMMENT '封顶价',
    duration_seconds INT NOT NULL COMMENT '竞拍时长(秒)',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0-未开始 1-进行中 2-已结束 3-已取消',
    start_time DATETIME COMMENT '开始时间',
    end_time DATETIME COMMENT '结束时间',
    current_price DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '当前价格',
    current_winner_id BIGINT COMMENT '当前领先用户ID',
    total_bids INT DEFAULT 0 COMMENT '总出价次数',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='竞拍场次表';
```

### 4. 出价记录表 (auction_bid)
```sql
CREATE TABLE auction_bid (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '出价记录ID',
    session_id BIGINT NOT NULL COMMENT '竞拍场次ID',
    user_id BIGINT NOT NULL COMMENT '出价用户ID',
    bid_price DECIMAL(10,2) NOT NULL COMMENT '出价金额',
    bid_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '出价时间(毫秒级)',
    is_winner TINYINT DEFAULT 0 COMMENT '是否最终获胜',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出价记录表';
```

### 5. 订单表 (auction_order)
```sql
CREATE TABLE auction_order (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    session_id BIGINT NOT NULL COMMENT '竞拍场次ID',
    goods_id BIGINT NOT NULL COMMENT '商品ID',
    user_id BIGINT NOT NULL COMMENT '成交用户ID',
    deal_price DECIMAL(10,2) NOT NULL COMMENT '成交价格',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '订单状态 0-待支付 1-已支付 2-已取消',
    pay_time DATETIME COMMENT '支付时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='竞拍订单表';
```

## RESTful API 路由设计

### 1. 商品管理模块 (/api/goods)
| 方法 | 路径 | 功能说明 |
|------|------|----------|
| GET | /api/goods/list | 分页查询商品列表 |
| GET | /api/goods/{id} | 根据ID查询商品详情 |
| POST | /api/goods | 新增商品 |
| PUT | /api/goods | 修改商品信息 |
| DELETE | /api/goods/{id} | 删除商品 |

### 2. 竞拍场次模块 (/api/auction)
| 方法 | 路径 | 功能说明 |
|------|------|----------|
| GET | /api/auction/list | 查询竞拍场次列表 |
| GET | /api/auction/{id} | 查询竞拍详情 |
| POST | /api/auction | 创建竞拍场次 |
| PUT | /api/auction/start/{id} | 开始竞拍 |
| PUT | /api/auction/cancel/{id} | 取消竞拍 |
| GET | /api/auction/ranking/{sessionId} | 获取实时排行榜 |

### 3. 出价模块 (/api/bid)
| 方法 | 路径 | 功能说明 |
|------|------|----------|
| POST | /api/bid/submit | 提交出价 |
| GET | /api/bid/history/{sessionId} | 获取出价历史记录 |

### 4. 订单模块 (/api/order)
| 方法 | 路径 | 功能说明 |
|------|------|----------|
| GET | /api/order/list | 查询订单列表 |
| GET | /api/order/{id} | 查询订单详情 |
| PUT | /api/order/pay/{id} | 模拟支付 |

## WebSocket 消息设计

### 连接地址
```
ws://localhost:8080/ws/auction?sessionId={sessionId}&userId={userId}
```

### 消息类型定义
```json
{
  "type": "BID_SUCCESS",
  "data": {
    "userId": 1001,
    "nickname": "张三",
    "bidPrice": 100.00,
    "currentPrice": 100.00,
    "bidTime": "2026-05-20 23:30:00.123"
  }
}
```

### 消息类型枚举
- `BID_NOTIFY` - 新出价通知
- `PRICE_UPDATE` - 当前价格更新
- `RANKING_UPDATE` - 排行榜更新
- `TIME_EXTEND` - 竞拍延时通知
- `AUCTION_END` - 竞拍结束通知
- `AUCTION_CANCEL` - 竞拍取消通知
- `USER_LEAD` - 用户领先提示
- `USER_OVERTAKEN` - 用户被超越提示

## 核心功能实现细节

### 1. 竞拍规则引擎实现
- 使用状态机模式管理竞拍状态流转
- 规则校验链：状态校验 → 价格校验 → 加价幅度校验 → 封顶价校验
- 自动延时：在出价后检查剩余时间，如果小于30秒则延长15秒

### 2. Redis 缓存策略
- 竞拍基础信息缓存：Key = `auction:session:{sessionId}`
- 当前价格缓存：Key = `auction:price:{sessionId}`
- 实时排行榜：使用Redis ZSet，Key = `auction:ranking:{sessionId}`，score为出价金额
- 分布式锁：Redisson Lock，Key = `auction:bid:lock:{sessionId}`

### 3. 分布式锁保证幂等性
- 用户出价前先获取分布式锁
- 锁过期时间设置为3秒
- 同一用户在同一竞拍中1秒内只能出价一次，通过Redis记录最近出价时间

## 单元测试规范
- 每个Service类对应一个测试类
- 每个公共方法至少包含正常场景和异常场景测试
- 使用@SpringBootTest集成测试
- 测试覆盖率要求核心业务代码≥80%
- 执行命令：`mvn test` 一键运行所有测试

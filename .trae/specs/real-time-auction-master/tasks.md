# Tasks

- [x] Task 1: 项目初始化与数据库设计
  - [x] SubTask 1.1: 创建Spring Boot项目基础结构，配置Maven依赖
  - [x] SubTask 1.2: 设计并创建MySQL数据库表（商品表、竞拍表、出价记录表、订单表、用户表）
  - [x] SubTask 1.3: 配置Redis连接和基础缓存配置
  - [x] SubTask 1.4: 编写数据库初始化SQL脚本

- [x] Task 2: 商品管理模块后端实现
  - [x] SubTask 2.1: 创建商品实体类、Mapper、Service、Controller
  - [x] SubTask 2.2: 实现商品CRUD接口（新增、查询、修改、删除）
  - [x] SubTask 2.3: 实现商品分页查询和条件筛选接口
  - [x] SubTask 2.4: 编写商品管理模块单元测试

- [x] Task 3: 竞拍规则引擎核心实现
  - [x] SubTask 3.1: 创建竞拍实体类和状态枚举
  - [x] SubTask 3.2: 实现竞拍规则校验服务（0元起拍、加价幅度、封顶价逻辑）
  - [x] SubTask 3.3: 实现自动延时机制逻辑
  - [x] SubTask 3.4: 实现分布式锁保证出价幂等性
  - [x] SubTask 3.5: 编写竞拍规则引擎单元测试

- [x] Task 4: WebSocket实时通信模块实现
  - [x] SubTask 4.1: 配置WebSocket服务端，实现握手和连接管理
  - [x] SubTask 4.2: 实现房间级隔离，按竞拍ID分组管理连接
  - [x] SubTask 4.3: 实现心跳保活机制，超时自动清理连接
  - [x] SubTask 4.4: 实现消息广播机制，支持向房间内所有用户推送实时消息
  - [x] SubTask 4.5: 编写WebSocket模块单元测试

- [x] Task 5: 出价与实时排名模块实现
  - [x] SubTask 5.1: 创建出价记录实体类和数据持久化
  - [x] SubTask 5.2: 实现出价接口，结合Redis处理高并发
  - [x] SubTask 5.3: 实现实时排行榜，使用Redis ZSet维护出价排名
  - [x] SubTask 5.4: 实现竞拍结束自动成交逻辑，生成订单
  - [x] SubTask 5.5: 编写出价与排名模块单元测试

- [x] Task 6: 订单管理模块后端实现
  - [x] SubTask 6.1: 创建订单实体类、Mapper、Service、Controller
  - [x] SubTask 6.2: 实现订单查询、状态更新接口
  - [x] SubTask 6.3: 实现模拟支付流程
  - [x] SubTask 6.4: 编写订单管理模块单元测试

- [x] Task 7: 商家管理后台前端实现
  - [x] SubTask 7.1: 创建React + TypeScript项目，配置路由和状态管理
  - [x] SubTask 7.2: 实现商品管理页面（列表、新增、编辑）
  - [x] SubTask 7.3: 实现竞拍管理页面（查看状态、取消竞拍）
  - [x] SubTask 7.4: 实现订单管理页面
  - [x] SubTask 7.5: 对接后端RESTful API

- [x] Task 8: 用户H5竞拍端前端实现
  - [x] SubTask 8.1: 实现直播间模拟页面
  - [x] SubTask 8.2: 实现竞拍商品列表和详情页面
  - [x] SubTask 8.3: 实现出价功能和实时排名展示
  - [x] SubTask 8.4: 实现WebSocket客户端，自动重连和心跳机制
  - [x] SubTask 8.5: 实现竞拍结果展示和历史记录页面

- [x] Task 9: 集成测试与一键测试脚本
  - [x] SubTask 9.1: 编写后端集成测试
  - [x] SubTask 9.2: 配置Maven一键执行所有单元测试和集成测试
  - [x] SubTask 9.3: 验证全流程闭环功能

# Task Dependencies
- Task 1 必须在所有其他后端任务之前完成
- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1
- Task 5 依赖 Task 3 和 Task 4
- Task 6 依赖 Task 5
- Task 7 和 Task 8 依赖所有后端API任务完成

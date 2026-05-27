# 实时竞拍大师 - Agent开发规范文档

## 开发前必读
每次开始开发新功能前，必须先完整阅读本规范文档，严格遵守所有约定。

## 核心开发原则
1. **先规划后编码**：不盲目写代码，先理解需求和现有代码结构
2. **每功能必测试**：开发完一个功能点，立即编写对应的单元测试
3. **测试独立存放**：所有测试代码必须放在src/test目录下，与主源码完全分离
4. **一键可执行**：确保所有测试可以通过一条命令完整运行
5. **遵循现有风格**：新代码必须与项目现有代码风格保持一致，不引入新的编码风格

## 代码分层规范
严格遵循经典三层架构：
- Controller层：只负责接收请求、参数校验、调用Service、返回结果，不包含业务逻辑
- Service层：核心业务逻辑实现，事务控制，不直接处理HTTP相关
- Mapper层：数据库操作接口，使用MyBatis-Plus简化CRUD

## 命名规范
- 类名：大驼峰，如AuctionService、BidController
- 方法名：小驼峰，如submitBid、getAuctionDetail
- 变量名：小驼峰，如currentPrice、userId
- 常量名：全大写下划线分隔，如MAX_EXTEND_SECONDS、DEFAULT_INCREMENT
- 数据库表名：小写下划线分隔，如auction_session、auction_bid

## 单元测试开发规范
1. **测试类命名**：被测试类名 + Test，如AuctionServiceTest
2. **测试方法命名**：test + 被测试方法名 + 场景，如testSubmitBid_Success、testSubmitBid_PriceTooLow
3. **每个公共方法至少2个测试用例**：正常场景 + 异常场景
4. **使用Assert断言**：充分验证返回结果的正确性
5. **测试覆盖率**：核心业务代码覆盖率必须≥80%
6. **测试不依赖外部环境**：单元测试优先使用Mock，避免依赖真实MySQL/Redis

## Git提交规范
使用约定式提交格式：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- test: 测试相关
- refactor: 代码重构

示例：`feat: 实现商品新增接口和单元测试`

## 开发流程SOP
1. 从tasks.md中选择当前要开发的任务
2. 阅读backend.md中对应模块的详细实现说明
3. 先创建实体类、Mapper、Service、Controller骨架
4. 实现核心业务逻辑
5. 立即编写对应的单元测试
6. 运行单元测试，确保全部通过
7. 在tasks.md中标记当前任务为已完成
8. 继续下一个任务

## 错误处理规范
- 自定义业务异常类BusinessException
- 全局异常处理器@RestControllerAdvice统一捕获
- 统一返回结果封装Result<T>，包含code、message、data三个字段
- 错误码定义在统一的枚举类ErrorCode中

## 注释规范
- 类和公共方法必须添加JavaDoc注释说明用途
- 复杂业务逻辑行内添加注释说明思路
- 不添加无意义的注释，保持代码简洁

## 性能优化注意事项
- 数据库查询避免SELECT *，只查需要的字段
- 高频访问数据优先存入Redis缓存
- 使用分布式锁保证并发安全，避免超卖和重复出价
- WebSocket消息推送避免阻塞主线程，使用异步处理

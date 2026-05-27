# 实时竞拍大师 Spec

## Why
直播电商高价值商品（珠宝、艺术品、二手奢侈品）需要动态定价机制，竞拍形式能最大化商品价值并营造强互动竞争氛围。本项目构建完整的抖音电商直播竞拍全栈系统，解决高并发场景下毫秒级实时同步、复杂竞拍规则零漏洞实现的核心挑战。

## What Changes
- 后端：基于Java Spring Boot + MySQL + Redis构建高并发竞拍服务，实现RESTful API + WebSocket双通道
- 前端：React + TypeScript打造商家管理后台和用户H5竞拍页面
- 完整闭环：商品上架 → 规则配置 → 实时出价 → 动态排名 → 竞拍成交
- 核心竞拍规则：0元起拍、固定加价幅度、封顶价自动成交、结束前出价自动延时、主播异常取消
- 实时通信：WebSocket长连接、房间级隔离、心跳保活、自动重连
- 单元测试：独立测试目录，一键执行所有测试

## Impact
- Affected specs: 竞拍核心引擎、实时同步系统、商家管理后台、用户竞拍端
- Affected code: 后端Java服务、前端React应用、数据库SQL脚本、Redis缓存策略

## ADDED Requirements
### Requirement: 竞拍核心规则引擎
The system SHALL implement all specified auction rules with zero logic漏洞.

#### Scenario: 0元起拍成功
- **WHEN** 竞拍商品设置起拍价为0
- **THEN** 任意用户可首次出价，出价金额必须≥加价幅度

#### Scenario: 加价幅度校验
- **WHEN** 用户出价金额不是当前价+加价幅度的整数倍
- **THEN** 系统拒绝出价并返回错误提示

#### Scenario: 封顶价自动成交
- **WHEN** 用户出价达到或超过封顶价
- **THEN** 竞拍立即结束，当前出价者成为成交用户

#### Scenario: 自动延时机制
- **WHEN** 竞拍结束前30秒内有新出价
- **THEN** 竞拍结束时间自动延长15秒，总时长不超过最大限制

#### Scenario: 主播取消竞拍
- **WHEN** 主播在竞拍进行中点击取消
- **THEN** 竞拍立即终止，状态标记为已取消，所有用户收到通知

### Requirement: 毫秒级实时同步
The system SHALL ensure all connected users see consistent auction state within 100ms.

#### Scenario: 多用户同时出价
- **WHEN** 100+用户同时在最后一秒出价
- **THEN** 所有出价按服务器时间戳排序，最终排名全网一致

#### Scenario: 倒计时精确同步
- **WHEN** 前端展示竞拍倒计时
- **THEN** 倒计时与服务器时间偏差不超过100毫秒

## MODIFIED Requirements
无现有系统，全新实现。

## REMOVED Requirements
无。

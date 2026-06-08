-- ==========================================
-- 新增表：用户表 sys_user
-- ==========================================
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(128) NOT NULL COMMENT '密码（明文，后续可升级MD5）',
    nickname VARCHAR(64) COMMENT '昵称',
    avatar VARCHAR(256) COMMENT '头像URL',
    role TINYINT NOT NULL DEFAULT 1 COMMENT '1-普通用户 2-商家/主播',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 插入默认管理员账号（密码123456）
INSERT IGNORE INTO sys_user (id, username, password, nickname, role) VALUES 
(1, 'admin', '123456', '系统管理员', 2),
(2, 'user1', '123456', '普通用户1', 1);

-- ==========================================
-- 新增表：直播间 live_room
-- ==========================================
CREATE TABLE IF NOT EXISTS live_room (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '直播间ID',
    anchor_id BIGINT NOT NULL COMMENT '主播ID（商家用户ID）',
    room_name VARCHAR(128) NOT NULL COMMENT '直播间名称',
    cover_url VARCHAR(256) COMMENT '直播间封面',
    stream_key VARCHAR(256) COMMENT '推流密钥',
    push_url VARCHAR(512) COMMENT '推流地址',
    play_url VARCHAR(512) COMMENT '播放地址',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0-未开播 1-直播中 2-已结束',
    viewer_count INT DEFAULT 0 COMMENT '累计观看人数（定期从Redis同步）',
    start_time DATETIME COMMENT '开播时间',
    end_time DATETIME COMMENT '结束时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_anchor (anchor_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='直播间表';

-- ==========================================
-- 新增表：直播间商品关联 live_room_goods
-- ==========================================
CREATE TABLE IF NOT EXISTS live_room_goods (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关联ID',
    room_id BIGINT NOT NULL COMMENT '直播间ID',
    session_id BIGINT NOT NULL COMMENT '拍卖会话ID',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 0 COMMENT '0-待拍卖 1-拍卖中 2-已拍完',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_room (room_id),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='直播间-拍卖商品关联表';

-- ==========================================
-- 补齐 auction_goods 表的 images 字段（如果不存在）
-- ==========================================
ALTER TABLE auction_goods ADD COLUMN IF NOT EXISTS images JSON COMMENT '商品图片URL数组' AFTER category;

SELECT '所有新表创建完成！' AS result;

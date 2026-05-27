CREATE DATABASE IF NOT EXISTS auction_master DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auction_master;

DROP TABLE IF EXISTS auction_order;
DROP TABLE IF EXISTS auction_bid;
DROP TABLE IF EXISTS auction_session;
DROP TABLE IF EXISTS auction_goods;
DROP TABLE IF EXISTS sys_user;

CREATE TABLE sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    password VARCHAR(128) NOT NULL,
    nickname VARCHAR(64),
    avatar VARCHAR(256),
    role TINYINT NOT NULL DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auction_goods (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    images JSON,
    category VARCHAR(64),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auction_session (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    goods_id BIGINT NOT NULL,
    start_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    increment_price DECIMAL(10,2) NOT NULL,
    ceiling_price DECIMAL(10,2),
    duration_seconds INT NOT NULL,
    status TINYINT NOT NULL DEFAULT 0,
    start_time DATETIME,
    end_time DATETIME,
    current_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_winner_id BIGINT,
    total_bids INT DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auction_bid (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    bid_price DECIMAL(10,2) NOT NULL,
    bid_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    is_winner TINYINT DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auction_order (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    goods_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    deal_price DECIMAL(10,2) NOT NULL,
    status TINYINT NOT NULL DEFAULT 0,
    pay_time DATETIME,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO sys_user (username, password, nickname, role) VALUES ('admin', '123456', '管理员', 2);
INSERT INTO sys_user (username, password, nickname, role) VALUES ('user1', '123456', '竞拍者1', 1);
INSERT INTO sys_user (username, password, nickname, role) VALUES ('user2', '123456', '竞拍者2', 1);

INSERT INTO auction_goods (name, description, category) VALUES ('和田玉吊坠', '新疆和田羊脂白玉吊坠，质地细腻', '珠宝');
INSERT INTO auction_goods (name, description, category) VALUES ('清代青花瓷瓶', '清乾隆年间青花瓷瓶，保存完好', '艺术品');
INSERT INTO auction_goods (name, description, category) VALUES ('天然翡翠手镯', '缅甸天然A货翡翠手镯，冰种飘花', '珠宝');

INSERT INTO auction_session (goods_id, start_price, increment_price, ceiling_price, duration_seconds, status, current_price) VALUES (1, 0, 100, 5000, 300, 0, 0);
INSERT INTO auction_session (goods_id, start_price, increment_price, ceiling_price, duration_seconds, status, current_price) VALUES (2, 1000, 200, 50000, 600, 0, 1000);
INSERT INTO auction_session (goods_id, start_price, increment_price, ceiling_price, duration_seconds, status, current_price) VALUES (3, 500, 50, 10000, 300, 0, 500);

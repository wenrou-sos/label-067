-- 矿山安全监测系统数据库初始化脚本

CREATE DATABASE IF NOT EXISTS mine_safety DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mine_safety;

-- 采掘工作面表
DROP TABLE IF EXISTS working_faces;
CREATE TABLE working_faces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '工作面名称',
    location VARCHAR(200) NOT NULL COMMENT '工作面位置',
    status TINYINT DEFAULT 1 COMMENT '状态 1:正常 0:停止',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采掘工作面表';

-- 传感器表
DROP TABLE IF EXISTS sensors;
CREATE TABLE sensors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    working_face_id INT NOT NULL COMMENT '所属工作面ID',
    sensor_type VARCHAR(50) NOT NULL COMMENT '传感器类型: gas-瓦斯 dust-粉尘 temperature-温度 wind-风速',
    sensor_name VARCHAR(100) NOT NULL COMMENT '传感器名称',
    threshold DECIMAL(10,4) NOT NULL COMMENT '安全阈值',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    status TINYINT DEFAULT 1 COMMENT '状态 1:正常 0:故障',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (working_face_id) REFERENCES working_faces(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器表';

-- 传感器数据表
DROP TABLE IF EXISTS sensor_data;
CREATE TABLE sensor_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sensor_id INT NOT NULL COMMENT '传感器ID',
    working_face_id INT NOT NULL COMMENT '工作面ID',
    sensor_type VARCHAR(50) NOT NULL COMMENT '传感器类型',
    value DECIMAL(10,4) NOT NULL COMMENT '监测数值',
    is_over_limit TINYINT DEFAULT 0 COMMENT '是否超限 1:超限 0:正常',
    collect_time DATETIME NOT NULL COMMENT '采集时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sensor_id (sensor_id),
    INDEX idx_working_face_id (working_face_id),
    INDEX idx_collect_time (collect_time),
    INDEX idx_sensor_type (sensor_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器数据表';

-- 初始化工作面数据
INSERT INTO working_faces (name, location) VALUES
('1101综采工作面', '一号煤层1101'),
('1202掘进工作面', '二号煤层1202'),
('1303回采工作面', '三号煤层1303'),
('1404综掘工作面', '四号煤层1404');

-- 初始化传感器数据
-- 瓦斯浓度传感器
INSERT INTO sensors (working_face_id, sensor_type, sensor_name, threshold, unit) VALUES
(1, 'gas', '1101工作面瓦斯传感器1', 1.0000, '%'),
(1, 'dust', '1101工作面粉尘传感器1', 10.0000, 'mg/m³'),
(1, 'temperature', '1101工作面温度传感器1', 30.0000, '℃'),
(1, 'wind', '1101工作面风速传感器1', 0.2500, 'm/s'),
(2, 'gas', '1202工作面瓦斯传感器1', 1.0000, '%'),
(2, 'dust', '1202工作面粉尘传感器1', 10.0000, 'mg/m³'),
(2, 'temperature', '1202工作面温度传感器1', 30.0000, '℃'),
(2, 'wind', '1202工作面风速传感器1', 0.2500, 'm/s'),
(3, 'gas', '1303工作面瓦斯传感器1', 1.0000, '%'),
(3, 'dust', '1303工作面粉尘传感器1', 10.0000, 'mg/m³'),
(3, 'temperature', '1303工作面温度传感器1', 30.0000, '℃'),
(3, 'wind', '1303工作面风速传感器1', 0.2500, 'm/s'),
(4, 'gas', '1404工作面瓦斯传感器1', 1.0000, '%'),
(4, 'wind', '1404工作面风速传感器1', 0.2500, 'm/s'),
(4, 'dust', '1404工作面粉尘传感器1', 10.0000, 'mg/m³'),
(4, 'temperature', '1404工作面温度传感器1', 30.0000, '℃');

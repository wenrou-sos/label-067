USE mine_safety;

CREATE TABLE IF NOT EXISTS alarm_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sensor_id INT NOT NULL COMMENT '传感器ID',
    working_face_id INT NOT NULL COMMENT '工作面ID',
    sensor_type VARCHAR(50) NOT NULL COMMENT '传感器类型',
    sensor_name VARCHAR(200) NOT NULL COMMENT '传感器名称',
    working_face_name VARCHAR(200) NOT NULL COMMENT '工作面名称',
    alarm_value DECIMAL(10,4) NOT NULL COMMENT '报警时的数值',
    threshold_value DECIMAL(10,4) NOT NULL COMMENT '阈值',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    alarm_time DATETIME NOT NULL COMMENT '报警时间',
    status TINYINT DEFAULT 0 COMMENT '处理状态 0:未处理 1:已处理',
    handle_time DATETIME COMMENT '处理时间',
    handle_by VARCHAR(100) COMMENT '处理人',
    handle_remark VARCHAR(500) COMMENT '处理备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sensor_id (sensor_id),
    INDEX idx_working_face_id (working_face_id),
    INDEX idx_alarm_time (alarm_time),
    INDEX idx_sensor_type (sensor_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警记录表';

SELECT 'alarm_records 表创建成功' as message;

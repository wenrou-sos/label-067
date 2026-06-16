USE mine_safety;

DROP TABLE IF EXISTS daily_reports;

CREATE TABLE daily_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_date DATE NOT NULL COMMENT '报告日期（数据所属日期）',
    report_data JSON NOT NULL COMMENT '报告详细数据（JSON格式）',
    conclusion VARCHAR(20) NOT NULL COMMENT '结论：正常/重点关注/异常',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
    regenerated_at DATETIME COMMENT '重新生成时间',
    UNIQUE KEY uk_report_date (report_date),
    INDEX idx_report_date (report_date),
    INDEX idx_conclusion (conclusion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='安全生产日报表';

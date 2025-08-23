-- Advanced Admin System Enhancements Migration
-- Version: 3.0.0
-- Features: Notifications, Audit Trail, Analytics, System Monitoring

-- 1. Notifications System
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'alert')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50) DEFAULT 'system',
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id, is_read),
    INDEX idx_notifications_created (created_at DESC)
);

-- 2. Audit Trail System
CREATE TABLE IF NOT EXISTS audit_trails (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT')),
    user_id VARCHAR(50) REFERENCES users(user_id),
    user_role VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    session_id VARCHAR(100),
    request_id VARCHAR(100),
    duration_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at DESC),
    INDEX idx_audit_action (action)
);

-- 3. System Metrics for Monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metrics_type (metric_type, recorded_at DESC),
    INDEX idx_metrics_name (metric_name, recorded_at DESC)
);

-- 4. User Sessions Management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP,
    logout_reason VARCHAR(50),
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    INDEX idx_sessions_user (user_id, is_active),
    INDEX idx_sessions_active (is_active, expires_at)
);

-- 5. Report Templates for Advanced Analytics
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    query_template TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    visualization_type VARCHAR(50) DEFAULT 'table',
    visualization_config JSONB DEFAULT '{}',
    created_by VARCHAR(50) REFERENCES users(user_id),
    is_public BOOLEAN DEFAULT FALSE,
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_config JSONB DEFAULT '{}',
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Saved Filters and Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- 7. Activity Feed
CREATE TABLE IF NOT EXISTS activity_feed (
    id SERIAL PRIMARY KEY,
    actor_id VARCHAR(50) REFERENCES users(user_id),
    actor_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    object_type VARCHAR(50) NOT NULL,
    object_id VARCHAR(100),
    object_name VARCHAR(200),
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    target_name VARCHAR(200),
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'public',
    importance VARCHAR(20) DEFAULT 'normal',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_actor (actor_id, created_at DESC),
    INDEX idx_activity_object (object_type, object_id),
    INDEX idx_activity_created (created_at DESC)
);

-- 8. Dashboard Widgets Configuration
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,
    widget_config JSONB NOT NULL,
    position INTEGER NOT NULL,
    size VARCHAR(20) DEFAULT 'medium',
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Bulk Operation Logs
CREATE TABLE IF NOT EXISTS bulk_operations (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_records INTEGER NOT NULL,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_by VARCHAR(50) REFERENCES users(user_id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 10. System Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    target_roles TEXT[],
    target_companies INTEGER[],
    is_active BOOLEAN DEFAULT TRUE,
    show_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    show_until TIMESTAMP,
    created_by VARCHAR(50) REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_test_results_date ON test_results(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_company_admins_active ON company_admins(is_active);

-- Create views for analytics
CREATE OR REPLACE VIEW company_performance_overview AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(DISTINCT u.user_id) as total_employees,
    COUNT(DISTINCT tr.user_id) as tested_employees,
    AVG(tr.overall_score) as avg_score,
    MIN(tr.overall_score) as min_score,
    MAX(tr.overall_score) as max_score,
    STDDEV(tr.overall_score) as score_stddev,
    COUNT(DISTINCT CASE WHEN tr.test_date >= CURRENT_DATE - INTERVAL '30 days' THEN tr.user_id END) as recent_tests,
    JSONB_BUILD_OBJECT(
        'problem_solving', AVG(tr.problem_solving),
        'communication', AVG(tr.communication),
        'leadership', AVG(tr.leadership),
        'adaptability', AVG(tr.adaptability),
        'technical_knowledge', AVG(tr.technical_knowledge)
    ) as avg_competencies
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
LEFT JOIN test_results tr ON u.user_id = tr.user_id
GROUP BY c.id, c.name;

-- Create view for user activity analytics
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    DATE(created_at) as activity_date,
    COUNT(DISTINCT CASE WHEN action = 'INSERT' THEN user_id END) as creators,
    COUNT(DISTINCT CASE WHEN action = 'UPDATE' THEN user_id END) as editors,
    COUNT(DISTINCT CASE WHEN action = 'DELETE' THEN user_id END) as deleters,
    COUNT(DISTINCT CASE WHEN action = 'VIEW' THEN user_id END) as viewers,
    COUNT(*) as total_actions,
    ARRAY_AGG(DISTINCT table_name) as affected_tables
FROM audit_trails
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- Add triggers for audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_trails (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        changed_fields
    ) VALUES (
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
            ELSE NEW.id::TEXT
        END,
        TG_OP,
        current_setting('app.current_user_id', TRUE),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                ARRAY(
                    SELECT jsonb_object_keys(row_to_json(NEW)::jsonb - row_to_json(OLD)::jsonb)
                )
            ELSE NULL
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_test_results AFTER INSERT OR UPDATE OR DELETE ON test_results
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add function for notification creation
CREATE OR REPLACE FUNCTION notify_user(
    p_user_id VARCHAR(50),
    p_title VARCHAR(200),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'info',
    p_priority VARCHAR(20) DEFAULT 'normal'
) RETURNS INTEGER AS $$
DECLARE
    v_notification_id INTEGER;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, priority)
    VALUES (p_user_id, p_title, p_message, p_type, p_priority)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Add function for activity logging
CREATE OR REPLACE FUNCTION log_activity(
    p_actor_id VARCHAR(50),
    p_action VARCHAR(100),
    p_object_type VARCHAR(50),
    p_object_id VARCHAR(100),
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_feed (actor_id, action, object_type, object_id, description)
    VALUES (p_actor_id, p_action, p_object_type, p_object_id, p_description);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;
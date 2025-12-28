-- ============================================================
-- ENTERPRISE LEAVE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- For production-ready, big IT company deployment
-- ============================================================

-- ============================================================
-- 1. COUNTRY & POLICY MANAGEMENT
-- ============================================================

-- Countries with leave policies
CREATE TABLE IF NOT EXISTS countries (
    country_code VARCHAR(3) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    currency_code VARCHAR(3) DEFAULT 'USD',
    work_week_start TINYINT DEFAULT 1, -- 1=Monday, 7=Sunday
    work_week_end TINYINT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert supported countries
INSERT IGNORE INTO countries (country_code, country_name, timezone, currency_code) VALUES
('US', 'United States', 'America/New_York', 'USD'),
('IN', 'India', 'Asia/Kolkata', 'INR'),
('UK', 'United Kingdom', 'Europe/London', 'GBP'),
('DE', 'Germany', 'Europe/Berlin', 'EUR'),
('SG', 'Singapore', 'Asia/Singapore', 'SGD'),
('AU', 'Australia', 'Australia/Sydney', 'AUD'),
('CA', 'Canada', 'America/Toronto', 'CAD'),
('JP', 'Japan', 'Asia/Tokyo', 'JPY'),
('FR', 'France', 'Europe/Paris', 'EUR'),
('AE', 'United Arab Emirates', 'Asia/Dubai', 'AED');

-- Country-specific leave policies
CREATE TABLE IF NOT EXISTS country_leave_policies (
    policy_id INT AUTO_INCREMENT PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    annual_entitlement DECIMAL(5,2) NOT NULL,
    max_carry_forward DECIMAL(5,2) DEFAULT 0,
    carry_forward_expiry_months INT DEFAULT 3,
    min_service_days INT DEFAULT 0, -- Days before eligible
    max_consecutive_days INT DEFAULT 30,
    requires_document_after_days INT DEFAULT 3, -- e.g., medical cert after 3 days sick
    encashment_allowed BOOLEAN DEFAULT FALSE,
    encashment_max_days DECIMAL(5,2) DEFAULT 0,
    half_day_allowed BOOLEAN DEFAULT TRUE,
    advance_notice_days INT DEFAULT 1,
    probation_eligible BOOLEAN DEFAULT FALSE,
    gender_specific ENUM('all', 'male', 'female') DEFAULT 'all',
    is_paid BOOLEAN DEFAULT TRUE,
    accrual_type ENUM('annual', 'monthly', 'quarterly') DEFAULT 'annual',
    accrual_rate DECIMAL(5,2) DEFAULT NULL, -- For monthly accrual
    effective_from DATE NOT NULL,
    effective_to DATE DEFAULT '2099-12-31',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_code) REFERENCES countries(country_code),
    UNIQUE KEY unique_policy (country_code, leave_type, effective_from)
);

-- Insert comprehensive country policies
-- INDIA
INSERT IGNORE INTO country_leave_policies (country_code, leave_type, annual_entitlement, max_carry_forward, carry_forward_expiry_months, requires_document_after_days, encashment_allowed, encashment_max_days, advance_notice_days, probation_eligible, effective_from) VALUES
('IN', 'earned_leave', 18, 30, 12, NULL, TRUE, 30, 7, FALSE, '2024-01-01'),
('IN', 'sick_leave', 12, 0, 0, 3, FALSE, 0, 0, TRUE, '2024-01-01'),
('IN', 'casual_leave', 12, 0, 0, NULL, FALSE, 0, 1, TRUE, '2024-01-01'),
('IN', 'maternity_leave', 182, 0, 0, 1, FALSE, 0, 30, FALSE, '2024-01-01'),
('IN', 'paternity_leave', 15, 0, 0, 1, FALSE, 0, 7, FALSE, '2024-01-01'),
('IN', 'bereavement_leave', 5, 0, 0, NULL, FALSE, 0, 0, TRUE, '2024-01-01'),
('IN', 'marriage_leave', 5, 0, 0, 1, FALSE, 0, 14, FALSE, '2024-01-01'),
('IN', 'comp_off', 0, 15, 3, NULL, FALSE, 0, 1, TRUE, '2024-01-01');

-- UNITED STATES
INSERT IGNORE INTO country_leave_policies (country_code, leave_type, annual_entitlement, max_carry_forward, carry_forward_expiry_months, encashment_allowed, advance_notice_days, probation_eligible, effective_from) VALUES
('US', 'pto', 20, 5, 3, TRUE, 14, FALSE, '2024-01-01'),
('US', 'sick_leave', 10, 40, 12, FALSE, 0, TRUE, '2024-01-01'),
('US', 'fmla', 60, 0, 0, FALSE, 30, FALSE, '2024-01-01'),
('US', 'bereavement_leave', 5, 0, 0, FALSE, 0, TRUE, '2024-01-01'),
('US', 'jury_duty', 10, 0, 0, FALSE, 0, TRUE, '2024-01-01'),
('US', 'military_leave', 15, 0, 0, FALSE, 14, TRUE, '2024-01-01'),
('US', 'comp_off', 0, 10, 6, FALSE, 1, TRUE, '2024-01-01');

-- UNITED KINGDOM
INSERT IGNORE INTO country_leave_policies (country_code, leave_type, annual_entitlement, max_carry_forward, encashment_allowed, advance_notice_days, effective_from) VALUES
('UK', 'annual_leave', 28, 8, FALSE, 14, '2024-01-01'),
('UK', 'sick_leave', 28, 0, FALSE, 0, '2024-01-01'),
('UK', 'maternity_leave', 273, 0, FALSE, 105, '2024-01-01'),
('UK', 'paternity_leave', 14, 0, FALSE, 105, '2024-01-01'),
('UK', 'shared_parental_leave', 259, 0, FALSE, 56, '2024-01-01'),
('UK', 'bereavement_leave', 5, 0, FALSE, 0, '2024-01-01'),
('UK', 'comp_off', 0, 10, FALSE, 1, '2024-01-01');

-- GERMANY
INSERT IGNORE INTO country_leave_policies (country_code, leave_type, annual_entitlement, max_carry_forward, carry_forward_expiry_months, encashment_allowed, advance_notice_days, effective_from) VALUES
('DE', 'urlaub', 30, 10, 3, FALSE, 14, '2024-01-01'),
('DE', 'sick_leave', 42, 0, 0, FALSE, 0, '2024-01-01'),
('DE', 'mutterschutz', 98, 0, 0, FALSE, 42, '2024-01-01'),
('DE', 'elternzeit', 1095, 0, 0, FALSE, 49, '2024-01-01'),
('DE', 'sonderurlaub', 10, 0, 0, FALSE, 7, '2024-01-01'),
('DE', 'comp_off', 0, 15, 6, FALSE, 1, '2024-01-01');

-- SINGAPORE
INSERT IGNORE INTO country_leave_policies (country_code, leave_type, annual_entitlement, max_carry_forward, encashment_allowed, advance_notice_days, effective_from) VALUES
('SG', 'annual_leave', 14, 7, TRUE, 14, '2024-01-01'),
('SG', 'sick_leave', 14, 0, FALSE, 0, '2024-01-01'),
('SG', 'hospitalization_leave', 60, 0, FALSE, 0, '2024-01-01'),
('SG', 'maternity_leave', 112, 0, FALSE, 28, '2024-01-01'),
('SG', 'paternity_leave', 14, 0, FALSE, 7, '2024-01-01'),
('SG', 'childcare_leave', 6, 0, FALSE, 3, '2024-01-01'),
('SG', 'national_service', 40, 0, FALSE, 7, '2024-01-01'),
('SG', 'comp_off', 0, 10, FALSE, 1, '2024-01-01');

-- ============================================================
-- 2. PUBLIC HOLIDAYS
-- ============================================================

CREATE TABLE IF NOT EXISTS public_holidays (
    holiday_id INT AUTO_INCREMENT PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    is_national BOOLEAN DEFAULT TRUE,
    is_optional BOOLEAN DEFAULT FALSE,
    state_province VARCHAR(50) DEFAULT NULL, -- For regional holidays
    year INT GENERATED ALWAYS AS (YEAR(holiday_date)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_code) REFERENCES countries(country_code),
    UNIQUE KEY unique_holiday (country_code, holiday_date, state_province)
);

-- Insert 2025 holidays for major countries
-- INDIA 2025
INSERT IGNORE INTO public_holidays (country_code, holiday_date, holiday_name, is_national) VALUES
('IN', '2025-01-01', 'New Year', TRUE),
('IN', '2025-01-14', 'Makar Sankranti', TRUE),
('IN', '2025-01-26', 'Republic Day', TRUE),
('IN', '2025-03-14', 'Holi', TRUE),
('IN', '2025-04-14', 'Ambedkar Jayanti', TRUE),
('IN', '2025-04-18', 'Good Friday', TRUE),
('IN', '2025-05-01', 'May Day', TRUE),
('IN', '2025-08-15', 'Independence Day', TRUE),
('IN', '2025-08-27', 'Janmashtami', TRUE),
('IN', '2025-10-02', 'Gandhi Jayanti', TRUE),
('IN', '2025-10-20', 'Dussehra', TRUE),
('IN', '2025-11-01', 'Diwali', TRUE),
('IN', '2025-11-05', 'Bhai Dooj', TRUE),
('IN', '2025-12-25', 'Christmas', TRUE);

-- US 2025
INSERT IGNORE INTO public_holidays (country_code, holiday_date, holiday_name, is_national) VALUES
('US', '2025-01-01', 'New Year\'s Day', TRUE),
('US', '2025-01-20', 'Martin Luther King Jr. Day', TRUE),
('US', '2025-02-17', 'Presidents Day', TRUE),
('US', '2025-05-26', 'Memorial Day', TRUE),
('US', '2025-06-19', 'Juneteenth', TRUE),
('US', '2025-07-04', 'Independence Day', TRUE),
('US', '2025-09-01', 'Labor Day', TRUE),
('US', '2025-10-13', 'Columbus Day', TRUE),
('US', '2025-11-11', 'Veterans Day', TRUE),
('US', '2025-11-27', 'Thanksgiving', TRUE),
('US', '2025-12-25', 'Christmas', TRUE);

-- UK 2025
INSERT IGNORE INTO public_holidays (country_code, holiday_date, holiday_name, is_national) VALUES
('UK', '2025-01-01', 'New Year\'s Day', TRUE),
('UK', '2025-04-18', 'Good Friday', TRUE),
('UK', '2025-04-21', 'Easter Monday', TRUE),
('UK', '2025-05-05', 'Early May Bank Holiday', TRUE),
('UK', '2025-05-26', 'Spring Bank Holiday', TRUE),
('UK', '2025-08-25', 'Summer Bank Holiday', TRUE),
('UK', '2025-12-25', 'Christmas', TRUE),
('UK', '2025-12-26', 'Boxing Day', TRUE);

-- GERMANY 2025
INSERT IGNORE INTO public_holidays (country_code, holiday_date, holiday_name, is_national) VALUES
('DE', '2025-01-01', 'Neujahrstag', TRUE),
('DE', '2025-04-18', 'Karfreitag', TRUE),
('DE', '2025-04-21', 'Ostermontag', TRUE),
('DE', '2025-05-01', 'Tag der Arbeit', TRUE),
('DE', '2025-05-29', 'Christi Himmelfahrt', TRUE),
('DE', '2025-06-09', 'Pfingstmontag', TRUE),
('DE', '2025-10-03', 'Tag der Deutschen Einheit', TRUE),
('DE', '2025-12-25', 'Weihnachtstag', TRUE),
('DE', '2025-12-26', 'Zweiter Weihnachtsfeiertag', TRUE);

-- ============================================================
-- 3. ENHANCED LEAVE REQUESTS (REPLACE EXISTING)
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_requests_v2 (
    request_id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Half-day support
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_type ENUM('first_half', 'second_half') DEFAULT NULL,
    
    -- Duration calculations
    total_days DECIMAL(5,2) NOT NULL,
    working_days DECIMAL(5,2) NOT NULL, -- Excludes weekends/holidays
    
    -- Request details
    reason TEXT,
    emergency_contact VARCHAR(100),
    handover_to VARCHAR(20), -- Employee covering
    attachments JSON, -- Array of document URLs
    
    -- Approval chain
    status ENUM('draft', 'pending', 'pending_l1', 'pending_l2', 'pending_hr', 'approved', 'rejected', 'cancelled', 'withdrawn') DEFAULT 'pending',
    current_approver_id VARCHAR(20),
    current_approval_level INT DEFAULT 1,
    
    -- AI Processing
    ai_recommendation ENUM('approve', 'reject', 'escalate', 'review') DEFAULT NULL,
    ai_confidence DECIMAL(5,4) DEFAULT NULL,
    ai_analysis JSON, -- Full constraint analysis
    ai_processing_time_ms INT DEFAULT NULL,
    
    -- Final approval
    final_approved_by VARCHAR(20),
    final_approval_date TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Tracking
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    
    -- Integration sync
    calendar_event_id VARCHAR(100), -- Google/Outlook event ID
    payroll_sync_status ENUM('pending', 'synced', 'failed', 'not_required') DEFAULT 'pending',
    payroll_sync_at TIMESTAMP NULL,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    source ENUM('web', 'mobile', 'api', 'slack', 'teams') DEFAULT 'web',
    
    INDEX idx_emp_dates (emp_id, start_date, end_date),
    INDEX idx_status (status),
    INDEX idx_country_type (country_code, leave_type),
    INDEX idx_approver (current_approver_id),
    FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

-- ============================================================
-- 4. APPROVAL CHAIN MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS approval_chains (
    chain_id INT AUTO_INCREMENT PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    department VARCHAR(50) DEFAULT '*', -- * means all departments
    leave_type VARCHAR(50) DEFAULT '*',
    min_days DECIMAL(5,2) DEFAULT 0,
    max_days DECIMAL(5,2) DEFAULT 999,
    
    -- Approval levels
    level_1_role ENUM('manager', 'team_lead', 'supervisor', 'skip') NOT NULL,
    level_1_auto_approve_days DECIMAL(5,2) DEFAULT 0, -- Auto-approve if <= this
    
    level_2_role ENUM('department_head', 'director', 'skip') DEFAULT 'skip',
    level_2_threshold_days DECIMAL(5,2) DEFAULT 5, -- Escalate if > this
    
    level_3_role ENUM('hr', 'vp', 'skip') DEFAULT 'skip',
    level_3_threshold_days DECIMAL(5,2) DEFAULT 10,
    
    -- Settings
    allow_self_approval BOOLEAN DEFAULT FALSE,
    notify_hr BOOLEAN DEFAULT TRUE,
    require_backup_approver BOOLEAN DEFAULT TRUE,
    sla_hours INT DEFAULT 48, -- Hours to approve before escalation
    
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_to DATE DEFAULT '2099-12-31',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

-- Insert default approval chains
INSERT IGNORE INTO approval_chains (country_code, department, leave_type, min_days, max_days, level_1_role, level_1_auto_approve_days, level_2_role, level_2_threshold_days, level_3_role, level_3_threshold_days, effective_from) VALUES
('IN', '*', '*', 0, 3, 'manager', 1, 'skip', 999, 'skip', 999, '2024-01-01'),
('IN', '*', '*', 3.5, 7, 'manager', 0, 'department_head', 5, 'skip', 999, '2024-01-01'),
('IN', '*', '*', 7.5, 999, 'manager', 0, 'department_head', 0, 'hr', 10, '2024-01-01'),
('US', '*', '*', 0, 5, 'manager', 2, 'skip', 999, 'skip', 999, '2024-01-01'),
('US', '*', '*', 5.5, 999, 'manager', 0, 'director', 10, 'hr', 15, '2024-01-01'),
('UK', '*', '*', 0, 10, 'manager', 3, 'department_head', 10, 'skip', 999, '2024-01-01'),
('DE', '*', '*', 0, 14, 'manager', 5, 'skip', 999, 'skip', 999, '2024-01-01');

-- Approval workflow log
CREATE TABLE IF NOT EXISTS approval_workflow_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    approval_level INT NOT NULL,
    approver_id VARCHAR(20) NOT NULL,
    approver_role VARCHAR(50),
    action ENUM('approved', 'rejected', 'escalated', 'delegated', 'auto_approved', 'sla_breached') NOT NULL,
    comments TEXT,
    action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_taken_hours DECIMAL(10,2), -- Time from previous action
    ip_address VARCHAR(45),
    
    INDEX idx_request (request_id),
    INDEX idx_approver (approver_id)
);

-- ============================================================
-- 5. COMP-OFF (COMPENSATORY OFF) MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS comp_off_records (
    comp_off_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- Earned details
    work_date DATE NOT NULL, -- Date when overtime was worked
    work_type ENUM('weekend', 'holiday', 'overtime', 'on_call', 'travel') NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL,
    days_earned DECIMAL(3,2) NOT NULL, -- Usually 0.5 or 1
    
    -- Approval
    approved_by VARCHAR(20),
    approved_at TIMESTAMP NULL,
    approval_status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    
    -- Usage tracking
    days_used DECIMAL(3,2) DEFAULT 0,
    days_remaining DECIMAL(3,2) GENERATED ALWAYS AS (days_earned - days_used) STORED,
    
    -- Validity
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE NOT NULL, -- Based on country policy
    
    -- Linking
    linked_leave_request_id VARCHAR(50), -- When used
    project_code VARCHAR(50),
    task_description TEXT,
    
    INDEX idx_emp_status (emp_id, approval_status),
    INDEX idx_expiry (expires_at),
    FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

-- ============================================================
-- 6. LEAVE ENCASHMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_encashment_requests (
    encashment_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- Request details
    leave_type VARCHAR(50) NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    
    -- Financial calculation
    daily_rate DECIMAL(15,2) NOT NULL,
    gross_amount DECIMAL(15,2) NOT NULL,
    tax_deduction DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    
    -- Approval
    status ENUM('pending', 'approved', 'rejected', 'processed', 'paid') DEFAULT 'pending',
    approved_by VARCHAR(20),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Payroll processing
    payroll_period VARCHAR(20), -- e.g., '2025-01'
    payment_date DATE,
    payment_reference VARCHAR(50),
    
    -- Tracking
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    INDEX idx_emp (emp_id),
    INDEX idx_status (status),
    FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

-- ============================================================
-- 7. ENHANCED LEAVE BALANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_balances_v2 (
    balance_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    
    -- Entitlements
    annual_entitlement DECIMAL(5,2) NOT NULL,
    carried_forward DECIMAL(5,2) DEFAULT 0,
    additional_granted DECIMAL(5,2) DEFAULT 0, -- Manual adjustments
    
    -- Usage
    used_days DECIMAL(5,2) DEFAULT 0,
    pending_days DECIMAL(5,2) DEFAULT 0, -- In pending requests
    encashed_days DECIMAL(5,2) DEFAULT 0,
    lapsed_days DECIMAL(5,2) DEFAULT 0,
    
    -- Calculated
    total_entitlement DECIMAL(5,2) GENERATED ALWAYS AS (annual_entitlement + carried_forward + additional_granted) STORED,
    available_balance DECIMAL(5,2) GENERATED ALWAYS AS (annual_entitlement + carried_forward + additional_granted - used_days - pending_days - encashed_days - lapsed_days) STORED,
    
    -- Accrual tracking (for monthly accrual)
    accrued_to_date DECIMAL(5,2) DEFAULT 0,
    last_accrual_date DATE,
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_balance (emp_id, leave_type, year),
    INDEX idx_emp_year (emp_id, year),
    FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

-- ============================================================
-- 8. INTEGRATION SYNC LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_sync_log (
    sync_id INT AUTO_INCREMENT PRIMARY KEY,
    integration_type ENUM('calendar_google', 'calendar_outlook', 'email', 'slack', 'teams', 'payroll', 'hris') NOT NULL,
    entity_type ENUM('leave_request', 'encashment', 'comp_off', 'holiday') NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    
    -- Sync details
    action ENUM('create', 'update', 'delete', 'notify') NOT NULL,
    external_id VARCHAR(200), -- ID from external system
    
    -- Status
    status ENUM('pending', 'in_progress', 'success', 'failed', 'retrying') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Request/Response
    request_payload JSON,
    response_payload JSON,
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    next_retry_at TIMESTAMP NULL,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (status),
    INDEX idx_integration (integration_type)
);

-- ============================================================
-- 9. COMPREHENSIVE AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- What changed
    entity_type ENUM('leave_request', 'balance', 'policy', 'encashment', 'comp_off', 'holiday', 'approval_chain') NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action ENUM('create', 'update', 'delete', 'approve', 'reject', 'cancel', 'withdraw', 'escalate', 'sync', 'encash') NOT NULL,
    
    -- Who made the change
    user_id VARCHAR(20),
    user_role VARCHAR(50),
    user_name VARCHAR(100),
    
    -- Change details
    old_values JSON,
    new_values JSON,
    change_reason TEXT,
    
    -- Context
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Compliance
    is_sensitive BOOLEAN DEFAULT FALSE,
    compliance_flag ENUM('gdpr', 'hipaa', 'sox', 'none') DEFAULT 'none',
    retention_days INT DEFAULT 2555, -- 7 years for compliance
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user (user_id),
    INDEX idx_date (created_at),
    INDEX idx_action (action)
);

-- ============================================================
-- 10. NOTIFICATION QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_queue (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Recipient
    recipient_id VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(100),
    recipient_slack_id VARCHAR(50),
    recipient_teams_id VARCHAR(50),
    
    -- Content
    notification_type ENUM('leave_submitted', 'leave_approved', 'leave_rejected', 'approval_pending', 'approval_reminder', 'sla_breach', 'balance_low', 'comp_off_expiring', 'encashment_processed') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    body_slack JSON, -- Slack block kit format
    
    -- Channels
    send_email BOOLEAN DEFAULT TRUE,
    send_slack BOOLEAN DEFAULT FALSE,
    send_teams BOOLEAN DEFAULT FALSE,
    send_push BOOLEAN DEFAULT FALSE,
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id VARCHAR(50),
    
    -- Status
    status ENUM('pending', 'processing', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    
    -- Results
    email_sent_at TIMESTAMP NULL,
    slack_sent_at TIMESTAMP NULL,
    teams_sent_at TIMESTAMP NULL,
    error_message TEXT,
    
    -- Timing
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    INDEX idx_recipient (recipient_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_for)
);

-- ============================================================
-- 11. TEAM CALENDAR VIEW (For UI)
-- ============================================================

CREATE OR REPLACE VIEW v_team_calendar AS
SELECT 
    lr.emp_id,
    e.full_name as employee_name,
    e.department,
    t.team_name,
    lr.start_date,
    lr.end_date,
    lr.leave_type,
    lr.is_half_day,
    lr.half_day_type,
    lr.status,
    lr.working_days,
    tm.manager_id
FROM leave_requests_v2 lr
JOIN employees e ON lr.emp_id = e.emp_id
LEFT JOIN team_members tm ON e.emp_id = tm.emp_id
LEFT JOIN teams t ON tm.team_id = t.team_id
WHERE lr.status IN ('approved', 'pending', 'pending_l1', 'pending_l2', 'pending_hr');

-- ============================================================
-- 12. LEAVE SUMMARY VIEW (For Dashboards)
-- ============================================================

CREATE OR REPLACE VIEW v_leave_summary AS
SELECT 
    lb.emp_id,
    e.full_name,
    e.department,
    lb.country_code,
    lb.year,
    lb.leave_type,
    lb.total_entitlement,
    lb.used_days,
    lb.pending_days,
    lb.available_balance,
    lb.encashed_days,
    lb.carried_forward,
    clp.max_carry_forward,
    clp.encashment_allowed,
    clp.encashment_max_days
FROM leave_balances_v2 lb
JOIN employees e ON lb.emp_id = e.emp_id
LEFT JOIN country_leave_policies clp ON lb.country_code = clp.country_code 
    AND lb.leave_type = clp.leave_type
    AND CURDATE() BETWEEN clp.effective_from AND clp.effective_to;

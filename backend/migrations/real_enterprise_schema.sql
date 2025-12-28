-- ============================================================
-- ENTERPRISE LEAVE MANAGEMENT - REAL EMPLOYEE HIERARCHY
-- For Big IT Companies (Google, Microsoft, TCS, Infosys scale)
-- ============================================================

-- 1. Organization Structure
CREATE TABLE IF NOT EXISTS organization_units (
    unit_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_code VARCHAR(20) NOT NULL UNIQUE,
    unit_name VARCHAR(100) NOT NULL,
    unit_type ENUM('company', 'division', 'department', 'team', 'sub_team') NOT NULL,
    parent_unit_id INT NULL,
    head_emp_id VARCHAR(20) NULL,
    country_code VARCHAR(3) NOT NULL DEFAULT 'IN',
    location VARCHAR(100),
    cost_center VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_unit_id) REFERENCES organization_units(unit_id)
) ENGINE=InnoDB;

-- 2. Job Levels (Real IT Company Hierarchy)
CREATE TABLE IF NOT EXISTS job_levels (
    level_id INT AUTO_INCREMENT PRIMARY KEY,
    level_code VARCHAR(10) NOT NULL UNIQUE,
    level_name VARCHAR(50) NOT NULL,
    level_rank INT NOT NULL, -- 1 = Intern, 10 = CEO
    can_approve_leave BOOLEAN DEFAULT FALSE,
    max_reportees INT DEFAULT 0,
    min_experience_years INT DEFAULT 0,
    is_management BOOLEAN DEFAULT FALSE,
    is_executive BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

-- Insert Real IT Company Job Levels
INSERT INTO job_levels (level_code, level_name, level_rank, can_approve_leave, max_reportees, min_experience_years, is_management, is_executive) VALUES
('L1', 'Intern/Trainee', 1, FALSE, 0, 0, FALSE, FALSE),
('L2', 'Junior Engineer', 2, FALSE, 0, 0, FALSE, FALSE),
('L3', 'Software Engineer', 3, FALSE, 0, 1, FALSE, FALSE),
('L4', 'Senior Engineer', 4, FALSE, 0, 3, FALSE, FALSE),
('L5', 'Lead Engineer', 5, TRUE, 5, 5, FALSE, FALSE),
('L6', 'Tech Lead/Manager', 6, TRUE, 10, 7, TRUE, FALSE),
('L7', 'Senior Manager', 7, TRUE, 25, 10, TRUE, FALSE),
('L8', 'Director', 8, TRUE, 50, 12, TRUE, FALSE),
('L9', 'Vice President', 9, TRUE, 100, 15, TRUE, TRUE),
('L10', 'CXO/CEO', 10, TRUE, 1000, 20, TRUE, TRUE)
ON DUPLICATE KEY UPDATE level_name = VALUES(level_name);

-- 3. Enhanced Employees Table (ALTER existing)
ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS level_code VARCHAR(10) DEFAULT 'L3',
    ADD COLUMN IF NOT EXISTS team_id INT NULL,
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(3) DEFAULT 'IN',
    ADD COLUMN IF NOT EXISTS gender ENUM('M', 'F', 'O') NULL,
    ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5) NULL,
    ADD COLUMN IF NOT EXISTS probation_end_date DATE NULL,
    ADD COLUMN IF NOT EXISTS is_critical_role BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS google_access_token TEXT NULL,
    ADD COLUMN IF NOT EXISTS google_refresh_token TEXT NULL,
    ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS slack_user_id VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS pusher_channel VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500) NULL;

-- 4. Manager Approval Chain (Who can approve for whom)
CREATE TABLE IF NOT EXISTS approval_hierarchy (
    hierarchy_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    level1_approver VARCHAR(20) NOT NULL COMMENT 'Direct Manager',
    level2_approver VARCHAR(20) NULL COMMENT 'Skip Level Manager',
    level3_approver VARCHAR(20) NULL COMMENT 'Department Head',
    level4_approver VARCHAR(20) NULL COMMENT 'VP/Director',
    hr_partner VARCHAR(20) NULL COMMENT 'HR Business Partner',
    backup_approver VARCHAR(20) NULL,
    effective_from DATE NOT NULL,
    effective_to DATE DEFAULT '2099-12-31',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    UNIQUE KEY unique_emp_hierarchy (emp_id, effective_from)
) ENGINE=InnoDB;

-- 5. Real Leave Requests with Full Tracking
DROP TABLE IF EXISTS leave_requests_enterprise;
CREATE TABLE leave_requests_enterprise (
    request_id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    working_days DECIMAL(5,2) NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_type ENUM('first_half', 'second_half') NULL,
    reason TEXT NOT NULL,
    
    -- AI Analysis Results
    ai_recommendation ENUM('approve', 'reject', 'review', 'escalate') NULL,
    ai_confidence DECIMAL(5,4) NULL,
    ai_analysis_json JSON NULL,
    
    -- Approval Workflow
    status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'escalated') DEFAULT 'pending',
    current_approver VARCHAR(20) NULL,
    current_level INT DEFAULT 1,
    
    -- Level 1 Approval (Manager)
    level1_approver VARCHAR(20) NULL,
    level1_status ENUM('pending', 'approved', 'rejected', 'skipped') DEFAULT 'pending',
    level1_action_at TIMESTAMP NULL,
    level1_comments TEXT NULL,
    
    -- Level 2 Approval (Director)
    level2_approver VARCHAR(20) NULL,
    level2_status ENUM('pending', 'approved', 'rejected', 'skipped', 'not_required') DEFAULT 'not_required',
    level2_action_at TIMESTAMP NULL,
    level2_comments TEXT NULL,
    
    -- Level 3 Approval (VP/HR)
    level3_approver VARCHAR(20) NULL,
    level3_status ENUM('pending', 'approved', 'rejected', 'skipped', 'not_required') DEFAULT 'not_required',
    level3_action_at TIMESTAMP NULL,
    level3_comments TEXT NULL,
    
    -- SLA Tracking
    sla_deadline TIMESTAMP NULL,
    sla_breached BOOLEAN DEFAULT FALSE,
    escalation_count INT DEFAULT 0,
    last_escalation_at TIMESTAMP NULL,
    
    -- Google Calendar
    google_event_id VARCHAR(255) NULL,
    calendar_synced BOOLEAN DEFAULT FALSE,
    calendar_sync_error TEXT NULL,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    pusher_notified BOOLEAN DEFAULT FALSE,
    email_notified BOOLEAN DEFAULT FALSE,
    
    -- Documents
    attachments JSON NULL,
    
    -- Metadata
    applied_from_ip VARCHAR(45) NULL,
    applied_from_device VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_emp (emp_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_approver (current_approver),
    INDEX idx_sla (sla_deadline, sla_breached),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
) ENGINE=InnoDB;

-- 6. Notification Log (Pusher, Email, etc.)
CREATE TABLE IF NOT EXISTS notification_log (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type ENUM('pusher', 'email', 'sms', 'slack', 'teams') NOT NULL,
    channel VARCHAR(100) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    recipient_emp_id VARCHAR(20) NULL,
    recipient_email VARCHAR(255) NULL,
    subject VARCHAR(255) NULL,
    message TEXT NOT NULL,
    payload JSON NULL,
    status ENUM('pending', 'sent', 'failed', 'delivered', 'read') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    related_entity_type VARCHAR(50) NULL,
    related_entity_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient_emp_id),
    INDEX idx_status (status),
    INDEX idx_entity (related_entity_type, related_entity_id)
) ENGINE=InnoDB;

-- 7. SLA Escalation Log
CREATE TABLE IF NOT EXISTS sla_escalation_log (
    escalation_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    escalation_level INT NOT NULL,
    from_approver VARCHAR(20) NULL,
    to_approver VARCHAR(20) NOT NULL,
    reason ENUM('sla_breach', 'manual', 'auto_escalate', 'approver_unavailable') NOT NULL,
    sla_hours_breached INT NULL,
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_sent BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (request_id) REFERENCES leave_requests_enterprise(request_id)
) ENGINE=InnoDB;

-- 8. Leave Accrual Log
CREATE TABLE IF NOT EXISTS leave_accrual_log (
    accrual_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    accrual_date DATE NOT NULL,
    accrual_period VARCHAR(20) NOT NULL COMMENT 'monthly, quarterly, yearly',
    days_accrued DECIMAL(5,2) NOT NULL,
    days_before DECIMAL(5,2) NOT NULL,
    days_after DECIMAL(5,2) NOT NULL,
    accrual_formula TEXT NULL,
    cron_job_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp_date (emp_id, accrual_date),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
) ENGINE=InnoDB;

-- 9. Google OAuth Tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    provider ENUM('google', 'microsoft', 'slack') NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NOT NULL,
    scope TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_emp_provider (emp_id, provider),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
) ENGINE=InnoDB;

-- 10. Audit Trail (Compliance)
CREATE TABLE IF NOT EXISTS audit_trail (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action ENUM('create', 'read', 'update', 'delete', 'approve', 'reject', 'escalate', 'export', 'bulk_action') NOT NULL,
    actor_emp_id VARCHAR(20) NULL,
    actor_role VARCHAR(50) NULL,
    actor_ip VARCHAR(45) NULL,
    actor_device VARCHAR(255) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    change_summary TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_actor (actor_emp_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;

-- 11. HR Analytics Cache (For Dashboard)
CREATE TABLE IF NOT EXISTS hr_analytics_cache (
    cache_id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_date DATE NOT NULL,
    country_code VARCHAR(3) NULL,
    department VARCHAR(50) NULL,
    team_id INT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_json JSON NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    UNIQUE KEY unique_metric (metric_name, metric_date, country_code, department, team_id)
) ENGINE=InnoDB;

-- 12. Bulk Operations Log
CREATE TABLE IF NOT EXISTS bulk_operations_log (
    operation_id VARCHAR(50) PRIMARY KEY,
    operation_type ENUM('bulk_approve', 'bulk_reject', 'bulk_cancel', 'bulk_export') NOT NULL,
    initiated_by VARCHAR(20) NOT NULL,
    total_records INT NOT NULL,
    successful_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    affected_ids JSON NOT NULL,
    results JSON NULL,
    status ENUM('processing', 'completed', 'failed', 'partial') DEFAULT 'processing',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    error_message TEXT NULL,
    FOREIGN KEY (initiated_by) REFERENCES employees(emp_id)
) ENGINE=InnoDB;

-- ============================================================
-- INSERT SAMPLE EMPLOYEE HIERARCHY DATA
-- ============================================================

-- Insert Organization Structure
INSERT INTO organization_units (unit_code, unit_name, unit_type, parent_unit_id, country_code, location) VALUES
('CORP', 'TechCorp Global', 'company', NULL, 'IN', 'Bangalore'),
('TECH', 'Technology Division', 'division', 1, 'IN', 'Bangalore'),
('ENG', 'Engineering', 'department', 2, 'IN', 'Bangalore'),
('PLATFORM', 'Platform Team', 'team', 3, 'IN', 'Bangalore'),
('PRODUCT', 'Product Team', 'team', 3, 'IN', 'Bangalore'),
('HR', 'Human Resources', 'department', 1, 'IN', 'Bangalore'),
('FIN', 'Finance', 'department', 1, 'IN', 'Bangalore'),
('US-DIV', 'US Division', 'division', 1, 'US', 'San Francisco'),
('UK-DIV', 'UK Division', 'division', 1, 'UK', 'London')
ON DUPLICATE KEY UPDATE unit_name = VALUES(unit_name);

-- Insert Real Employees with Hierarchy
INSERT INTO employees (emp_id, full_name, email, department, position, manager_id, hire_date, employment_type, work_location, level_code, country_code, gender, is_critical_role, pusher_channel, is_active) VALUES
-- C-Suite
('EMP001', 'Rajesh Kumar', 'rajesh.kumar@techcorp.com', 'Executive', 'CEO', NULL, '2015-01-15', 'full-time', 'Bangalore', 'L10', 'IN', 'M', TRUE, 'user-EMP001', TRUE),

-- VPs
('EMP002', 'Priya Sharma', 'priya.sharma@techcorp.com', 'Technology', 'VP Engineering', 'EMP001', '2016-03-20', 'full-time', 'Bangalore', 'L9', 'IN', 'F', TRUE, 'user-EMP002', TRUE),
('EMP003', 'Amit Patel', 'amit.patel@techcorp.com', 'HR', 'VP Human Resources', 'EMP001', '2016-06-01', 'full-time', 'Bangalore', 'L9', 'IN', 'M', TRUE, 'user-EMP003', TRUE),

-- Directors
('EMP004', 'Sneha Reddy', 'sneha.reddy@techcorp.com', 'Engineering', 'Director Engineering', 'EMP002', '2017-04-15', 'full-time', 'Bangalore', 'L8', 'IN', 'F', TRUE, 'user-EMP004', TRUE),
('EMP005', 'Vikram Singh', 'vikram.singh@techcorp.com', 'Engineering', 'Director Platform', 'EMP002', '2017-08-01', 'full-time', 'Bangalore', 'L8', 'IN', 'M', TRUE, 'user-EMP005', TRUE),

-- Senior Managers
('EMP006', 'Ananya Gupta', 'ananya.gupta@techcorp.com', 'Engineering', 'Senior Manager', 'EMP004', '2018-02-01', 'full-time', 'Bangalore', 'L7', 'IN', 'F', FALSE, 'user-EMP006', TRUE),
('EMP007', 'Rahul Verma', 'rahul.verma@techcorp.com', 'Engineering', 'Senior Manager', 'EMP005', '2018-05-15', 'full-time', 'Bangalore', 'L7', 'IN', 'M', FALSE, 'user-EMP007', TRUE),

-- Tech Leads/Managers
('EMP008', 'Deepak Joshi', 'deepak.joshi@techcorp.com', 'Engineering', 'Tech Lead', 'EMP006', '2019-01-10', 'full-time', 'Bangalore', 'L6', 'IN', 'M', FALSE, 'user-EMP008', TRUE),
('EMP009', 'Kavita Nair', 'kavita.nair@techcorp.com', 'Engineering', 'Tech Lead', 'EMP006', '2019-03-20', 'full-time', 'Bangalore', 'L6', 'IN', 'F', FALSE, 'user-EMP009', TRUE),
('EMP010', 'Suresh Menon', 'suresh.menon@techcorp.com', 'Engineering', 'Tech Lead', 'EMP007', '2019-06-01', 'full-time', 'Bangalore', 'L6', 'IN', 'M', FALSE, 'user-EMP010', TRUE),

-- Lead Engineers
('EMP011', 'Neha Kulkarni', 'neha.kulkarni@techcorp.com', 'Engineering', 'Lead Engineer', 'EMP008', '2020-01-15', 'full-time', 'Bangalore', 'L5', 'IN', 'F', FALSE, 'user-EMP011', TRUE),
('EMP012', 'Arjun Das', 'arjun.das@techcorp.com', 'Engineering', 'Lead Engineer', 'EMP008', '2020-04-01', 'full-time', 'Bangalore', 'L5', 'IN', 'M', FALSE, 'user-EMP012', TRUE),
('EMP013', 'Pooja Iyer', 'pooja.iyer@techcorp.com', 'Engineering', 'Lead Engineer', 'EMP009', '2020-06-15', 'full-time', 'Bangalore', 'L5', 'IN', 'F', FALSE, 'user-EMP013', TRUE),

-- Senior Engineers
('EMP014', 'Karthik Rao', 'karthik.rao@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP011', '2021-01-10', 'full-time', 'Bangalore', 'L4', 'IN', 'M', FALSE, 'user-EMP014', TRUE),
('EMP015', 'Meera Shah', 'meera.shah@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP011', '2021-03-01', 'full-time', 'Bangalore', 'L4', 'IN', 'F', FALSE, 'user-EMP015', TRUE),
('EMP016', 'Aditya Bansal', 'aditya.bansal@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP012', '2021-05-15', 'full-time', 'Bangalore', 'L4', 'IN', 'M', FALSE, 'user-EMP016', TRUE),
('EMP017', 'Ritu Chauhan', 'ritu.chauhan@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP012', '2021-08-01', 'full-time', 'Bangalore', 'L4', 'IN', 'F', FALSE, 'user-EMP017', TRUE),
('EMP018', 'Vivek Malhotra', 'vivek.malhotra@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP013', '2021-10-15', 'full-time', 'Bangalore', 'L4', 'IN', 'M', FALSE, 'user-EMP018', TRUE),

-- Software Engineers
('EMP019', 'Shruti Pandey', 'shruti.pandey@techcorp.com', 'Engineering', 'Software Engineer', 'EMP014', '2022-01-15', 'full-time', 'Bangalore', 'L3', 'IN', 'F', FALSE, 'user-EMP019', TRUE),
('EMP020', 'Nikhil Sharma', 'nikhil.sharma@techcorp.com', 'Engineering', 'Software Engineer', 'EMP014', '2022-03-01', 'full-time', 'Bangalore', 'L3', 'IN', 'M', FALSE, 'user-EMP020', TRUE),
('EMP021', 'Anjali Mishra', 'anjali.mishra@techcorp.com', 'Engineering', 'Software Engineer', 'EMP015', '2022-06-01', 'full-time', 'Bangalore', 'L3', 'IN', 'F', FALSE, 'user-EMP021', TRUE),
('EMP022', 'Rohit Kapoor', 'rohit.kapoor@techcorp.com', 'Engineering', 'Software Engineer', 'EMP015', '2022-08-15', 'full-time', 'Bangalore', 'L3', 'IN', 'M', FALSE, 'user-EMP022', TRUE),
('EMP023', 'Divya Srinivasan', 'divya.srinivasan@techcorp.com', 'Engineering', 'Software Engineer', 'EMP016', '2023-01-10', 'full-time', 'Bangalore', 'L3', 'IN', 'F', FALSE, 'user-EMP023', TRUE),
('EMP024', 'Siddharth Pillai', 'siddharth.pillai@techcorp.com', 'Engineering', 'Software Engineer', 'EMP016', '2023-03-20', 'full-time', 'Bangalore', 'L3', 'IN', 'M', FALSE, 'user-EMP024', TRUE),
('EMP025', 'Priyanka Desai', 'priyanka.desai@techcorp.com', 'Engineering', 'Software Engineer', 'EMP017', '2023-06-01', 'full-time', 'Bangalore', 'L3', 'IN', 'F', FALSE, 'user-EMP025', TRUE),
('EMP026', 'Akash Mehta', 'akash.mehta@techcorp.com', 'Engineering', 'Software Engineer', 'EMP017', '2023-08-15', 'full-time', 'Bangalore', 'L3', 'IN', 'M', FALSE, 'user-EMP026', TRUE),
('EMP027', 'Nisha Agarwal', 'nisha.agarwal@techcorp.com', 'Engineering', 'Software Engineer', 'EMP018', '2023-10-01', 'full-time', 'Bangalore', 'L3', 'IN', 'F', FALSE, 'user-EMP027', TRUE),
('EMP028', 'Gaurav Saxena', 'gaurav.saxena@techcorp.com', 'Engineering', 'Software Engineer', 'EMP018', '2024-01-15', 'full-time', 'Bangalore', 'L3', 'IN', 'M', FALSE, 'user-EMP028', TRUE),

-- Junior Engineers
('EMP029', 'Tanvi Jain', 'tanvi.jain@techcorp.com', 'Engineering', 'Junior Engineer', 'EMP019', '2024-06-01', 'full-time', 'Bangalore', 'L2', 'IN', 'F', FALSE, 'user-EMP029', TRUE),
('EMP030', 'Harsh Gupta', 'harsh.gupta@techcorp.com', 'Engineering', 'Junior Engineer', 'EMP020', '2024-06-15', 'full-time', 'Bangalore', 'L2', 'IN', 'M', FALSE, 'user-EMP030', TRUE),
('EMP031', 'Swati Tiwari', 'swati.tiwari@techcorp.com', 'Engineering', 'Junior Engineer', 'EMP021', '2024-07-01', 'full-time', 'Bangalore', 'L2', 'IN', 'F', FALSE, 'user-EMP031', TRUE),
('EMP032', 'Manish Kumar', 'manish.kumar@techcorp.com', 'Engineering', 'Junior Engineer', 'EMP022', '2024-08-01', 'full-time', 'Bangalore', 'L2', 'IN', 'M', FALSE, 'user-EMP032', TRUE),

-- HR Team
('EMP033', 'Rekha Yadav', 'rekha.yadav@techcorp.com', 'HR', 'HR Manager', 'EMP003', '2018-04-01', 'full-time', 'Bangalore', 'L6', 'IN', 'F', FALSE, 'user-EMP033', TRUE),
('EMP034', 'Sanjay Patil', 'sanjay.patil@techcorp.com', 'HR', 'HR Business Partner', 'EMP033', '2020-01-15', 'full-time', 'Bangalore', 'L5', 'IN', 'M', FALSE, 'user-EMP034', TRUE),
('EMP035', 'Lakshmi Narayanan', 'lakshmi.narayanan@techcorp.com', 'HR', 'HR Executive', 'EMP033', '2022-03-01', 'full-time', 'Bangalore', 'L3', 'IN', 'F', FALSE, 'user-EMP035', TRUE),

-- US Team
('EMP036', 'John Smith', 'john.smith@techcorp.com', 'Engineering', 'Director US Ops', 'EMP002', '2017-09-01', 'full-time', 'San Francisco', 'L8', 'US', 'M', TRUE, 'user-EMP036', TRUE),
('EMP037', 'Emily Johnson', 'emily.johnson@techcorp.com', 'Engineering', 'Senior Manager', 'EMP036', '2019-02-15', 'full-time', 'San Francisco', 'L7', 'US', 'F', FALSE, 'user-EMP037', TRUE),
('EMP038', 'Michael Brown', 'michael.brown@techcorp.com', 'Engineering', 'Tech Lead', 'EMP037', '2020-05-01', 'full-time', 'San Francisco', 'L6', 'US', 'M', FALSE, 'user-EMP038', TRUE),
('EMP039', 'Sarah Davis', 'sarah.davis@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP038', '2021-08-15', 'full-time', 'San Francisco', 'L4', 'US', 'F', FALSE, 'user-EMP039', TRUE),
('EMP040', 'David Wilson', 'david.wilson@techcorp.com', 'Engineering', 'Software Engineer', 'EMP039', '2023-01-10', 'full-time', 'San Francisco', 'L3', 'US', 'M', FALSE, 'user-EMP040', TRUE),

-- UK Team
('EMP041', 'James Taylor', 'james.taylor@techcorp.com', 'Engineering', 'Director UK Ops', 'EMP002', '2018-01-15', 'full-time', 'London', 'L8', 'UK', 'M', TRUE, 'user-EMP041', TRUE),
('EMP042', 'Emma White', 'emma.white@techcorp.com', 'Engineering', 'Senior Manager', 'EMP041', '2019-06-01', 'full-time', 'London', 'L7', 'UK', 'F', FALSE, 'user-EMP042', TRUE),
('EMP043', 'Oliver Harris', 'oliver.harris@techcorp.com', 'Engineering', 'Tech Lead', 'EMP042', '2020-09-15', 'full-time', 'London', 'L6', 'UK', 'M', FALSE, 'user-EMP043', TRUE),
('EMP044', 'Sophia Clark', 'sophia.clark@techcorp.com', 'Engineering', 'Senior Engineer', 'EMP043', '2022-02-01', 'full-time', 'London', 'L4', 'UK', 'F', FALSE, 'user-EMP044', TRUE),
('EMP045', 'William Lewis', 'william.lewis@techcorp.com', 'Engineering', 'Software Engineer', 'EMP044', '2023-05-15', 'full-time', 'London', 'L3', 'UK', 'M', FALSE, 'user-EMP045', TRUE)

ON DUPLICATE KEY UPDATE 
    full_name = VALUES(full_name),
    manager_id = VALUES(manager_id),
    level_code = VALUES(level_code),
    country_code = VALUES(country_code);

-- Insert Approval Hierarchy for all employees
INSERT INTO approval_hierarchy (emp_id, level1_approver, level2_approver, level3_approver, level4_approver, hr_partner, effective_from)
SELECT 
    e.emp_id,
    e.manager_id as level1_approver,
    m.manager_id as level2_approver,
    mm.manager_id as level3_approver,
    mmm.manager_id as level4_approver,
    'EMP034' as hr_partner,
    '2024-01-01'
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id
LEFT JOIN employees mm ON m.manager_id = mm.emp_id
LEFT JOIN employees mmm ON mm.manager_id = mmm.emp_id
WHERE e.emp_id != 'EMP001'
ON DUPLICATE KEY UPDATE level1_approver = VALUES(level1_approver);

-- Initialize Leave Balances for all employees
INSERT INTO leave_balances_v2 (emp_id, country_code, leave_type, year, annual_entitlement, used_days, pending_days, carried_forward)
SELECT 
    e.emp_id,
    e.country_code,
    clp.leave_type,
    2025 as year,
    clp.annual_entitlement as annual_entitlement,
    FLOOR(RAND() * 5) as used_days,
    0 as pending_days,
    FLOOR(RAND() * 3) as carried_forward
FROM employees e
JOIN country_leave_policies clp ON e.country_code = clp.country_code
WHERE clp.effective_to >= CURDATE()
ON DUPLICATE KEY UPDATE annual_entitlement = VALUES(annual_entitlement);

-- ============================================================
-- CREATE 60 REAL PENDING LEAVE REQUESTS
-- ============================================================
INSERT INTO leave_requests_enterprise (request_id, emp_id, country_code, leave_type, start_date, end_date, total_days, working_days, reason, status, current_approver, current_level, level1_approver, level1_status, sla_deadline)
SELECT 
    CONCAT('LR-2025-', LPAD(seq.n, 4, '0')) as request_id,
    emp.emp_id,
    emp.country_code,
    lt.leave_type,
    DATE_ADD('2025-01-15', INTERVAL seq.n DAY) as start_date,
    DATE_ADD('2025-01-15', INTERVAL seq.n + FLOOR(1 + RAND() * 5) DAY) as end_date,
    FLOOR(1 + RAND() * 5) as total_days,
    FLOOR(1 + RAND() * 4) as working_days,
    CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'Family vacation - need time off for family gathering'
        WHEN 1 THEN 'Personal medical appointment scheduled'
        WHEN 2 THEN 'Attending a family wedding ceremony'
        WHEN 3 THEN 'House shifting and settlement work'
        ELSE 'Personal emergency and important commitments'
    END as reason,
    'pending' as status,
    emp.manager_id as current_approver,
    1 as current_level,
    emp.manager_id as level1_approver,
    'pending' as level1_status,
    DATE_ADD(NOW(), INTERVAL 48 HOUR) as sla_deadline
FROM 
    (SELECT @n := @n + 1 as n FROM 
        (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) a,
        (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) b,
        (SELECT @n := 0) init
    ) seq
CROSS JOIN 
    (SELECT emp_id, country_code, manager_id FROM employees WHERE manager_id IS NOT NULL ORDER BY RAND() LIMIT 60) emp
CROSS JOIN 
    (SELECT leave_type FROM (SELECT 'earned_leave' as leave_type UNION SELECT 'sick_leave' UNION SELECT 'casual_leave') t ORDER BY RAND() LIMIT 1) lt
WHERE seq.n <= 60
ON DUPLICATE KEY UPDATE status = 'pending';

SELECT 'Real Enterprise Schema Created Successfully!' as status;
SELECT COUNT(*) as total_employees FROM employees;
SELECT COUNT(*) as pending_leave_requests FROM leave_requests_enterprise WHERE status = 'pending';

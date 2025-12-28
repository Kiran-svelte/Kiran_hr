-- Enterprise Leave System: Sample Test Data
-- Run this after enterprise_leave_schema.sql

-- Initialize leave balances for test employees
-- India employees (15 earned, 12 sick, 12 casual)
INSERT INTO leave_balances_v2 (emp_id, country_code, leave_type, year, annual_entitlement, used_days, pending_days, carried_forward) VALUES
-- John Doe (India)
('EMP101', 'IN', 'earned_leave', 2025, 15.00, 5.00, 0.00, 2.00),
('EMP101', 'IN', 'sick_leave', 2025, 12.00, 2.00, 0.00, 0.00),
('EMP101', 'IN', 'casual_leave', 2025, 12.00, 3.00, 0.00, 0.00),
('EMP101', 'IN', 'comp_off', 2025, 0.00, 0.00, 0.00, 2.00),

-- Jane Manager (India)
('EMP102', 'IN', 'earned_leave', 2025, 18.00, 8.00, 0.00, 3.00),
('EMP102', 'IN', 'sick_leave', 2025, 12.00, 1.00, 0.00, 0.00),
('EMP102', 'IN', 'casual_leave', 2025, 12.00, 4.00, 0.00, 0.00),

-- Bob Director (India)
('EMP103', 'IN', 'earned_leave', 2025, 21.00, 10.00, 0.00, 5.00),
('EMP103', 'IN', 'sick_leave', 2025, 12.00, 0.00, 0.00, 0.00),
('EMP103', 'IN', 'casual_leave', 2025, 12.00, 2.00, 0.00, 0.00),

-- Alice Smith (US)
('EMP104', 'US', 'annual_leave', 2025, 15.00, 3.00, 0.00, 0.00),
('EMP104', 'US', 'sick_leave', 2025, 10.00, 1.00, 0.00, 0.00),
('EMP104', 'US', 'personal_leave', 2025, 3.00, 0.00, 0.00, 0.00),

-- Charlie Manager (US)
('EMP105', 'US', 'annual_leave', 2025, 20.00, 5.00, 0.00, 0.00),
('EMP105', 'US', 'sick_leave', 2025, 10.00, 2.00, 0.00, 0.00),

-- Diana UK
('EMP106', 'UK', 'annual_leave', 2025, 25.00, 10.00, 0.00, 0.00),

-- Edward Manager UK
('EMP107', 'UK', 'annual_leave', 2025, 28.00, 8.00, 0.00, 0.00),

-- Frank Germany
('EMP108', 'DE', 'annual_leave', 2025, 30.00, 5.00, 0.00, 0.00),

-- Greta Manager Germany
('EMP109', 'DE', 'annual_leave', 2025, 30.00, 12.00, 0.00, 0.00),

-- Hans Singapore
('EMP110', 'SG', 'annual_leave', 2025, 14.00, 4.00, 0.00, 0.00),
('EMP110', 'SG', 'sick_leave', 2025, 14.00, 2.00, 0.00, 0.00)
ON DUPLICATE KEY UPDATE 
    annual_entitlement = VALUES(annual_entitlement),
    used_days = VALUES(used_days);

-- Insert some comp-off records
INSERT INTO comp_off_records (emp_id, country_code, work_date, work_type, hours_worked, days_earned, approved_by, approved_at, approval_status, expires_at, task_description) VALUES
('EMP101', 'IN', '2024-12-14', 'weekend', 8.00, 1.00, 'EMP102', '2024-12-15 10:00:00', 'approved', '2025-03-14', 'Weekend deployment support'),
('EMP101', 'IN', '2024-12-21', 'weekend', 8.00, 1.00, 'EMP102', '2024-12-22 09:00:00', 'approved', '2025-03-21', 'Critical bug fix on Saturday'),
('EMP104', 'US', '2024-12-07', 'weekend', 8.00, 1.00, 'EMP105', '2024-12-08 11:00:00', 'approved', '2025-03-07', 'Production migration')
ON DUPLICATE KEY UPDATE task_description = VALUES(task_description);

-- Insert approval chain configurations
INSERT INTO approval_chains (country_code, department, leave_type, min_days, max_days, level_1_role, level_1_auto_approve_days, level_2_role, level_2_threshold_days, level_3_role, level_3_threshold_days, sla_hours, effective_from) VALUES
-- India approval chains
('IN', '*', 'earned_leave', 0.00, 999.00, 'manager', 1.00, 'director', 5.00, 'hr', 10.00, 24, '2024-01-01'),
('IN', '*', 'sick_leave', 0.00, 999.00, 'manager', 3.00, 'skip', 999.00, 'skip', 999.00, 12, '2024-01-01'),
('IN', '*', 'casual_leave', 0.00, 999.00, 'manager', 2.00, 'skip', 999.00, 'skip', 999.00, 24, '2024-01-01'),
('IN', '*', 'comp_off', 0.00, 999.00, 'manager', 5.00, 'skip', 999.00, 'skip', 999.00, 24, '2024-01-01'),

-- US approval chains  
('US', '*', 'annual_leave', 0.00, 999.00, 'manager', 1.00, 'director', 5.00, 'hr', 10.00, 24, '2024-01-01'),
('US', '*', 'sick_leave', 0.00, 999.00, 'manager', 5.00, 'skip', 999.00, 'skip', 999.00, 12, '2024-01-01'),
('US', '*', 'personal_leave', 0.00, 999.00, 'manager', 3.00, 'skip', 999.00, 'skip', 999.00, 24, '2024-01-01'),

-- UK approval chains
('UK', '*', 'annual_leave', 0.00, 999.00, 'manager', 2.00, 'director', 10.00, 'hr', 15.00, 24, '2024-01-01'),

-- Germany approval chains  
('DE', '*', 'annual_leave', 0.00, 999.00, 'manager', 2.00, 'director', 10.00, 'hr', 15.00, 24, '2024-01-01'),

-- Singapore approval chains
('SG', '*', 'annual_leave', 0.00, 999.00, 'manager', 1.00, 'director', 7.00, 'hr', 14.00, 24, '2024-01-01'),
('SG', '*', 'sick_leave', 0.00, 999.00, 'manager', 3.00, 'skip', 999.00, 'skip', 999.00, 12, '2024-01-01')
ON DUPLICATE KEY UPDATE sla_hours = VALUES(sla_hours);

-- Insert some sample leave requests
INSERT INTO leave_requests_v2 (request_id, emp_id, country_code, leave_type, start_date, end_date, total_days, working_days, is_half_day, reason, status) VALUES
-- Past approved leaves
('LR-2024-001', 'EMP101', 'IN', 'earned_leave', '2024-11-11', '2024-11-13', 3.00, 3.00, 0, 'Family function', 'approved'),
('LR-2024-002', 'EMP101', 'IN', 'sick_leave', '2024-10-20', '2024-10-21', 2.00, 2.00, 0, 'Fever', 'approved'),
('LR-2024-003', 'EMP104', 'US', 'annual_leave', '2024-12-23', '2024-12-27', 5.00, 3.00, 0, 'Christmas vacation', 'approved'),

-- Pending leave request
('LR-2025-001', 'EMP106', 'UK', 'annual_leave', '2025-01-15', '2025-01-20', 6.00, 4.00, 0, 'Winter break', 'pending'),
('LR-2025-002', 'EMP108', 'DE', 'annual_leave', '2025-02-01', '2025-02-07', 7.00, 5.00, 0, 'Skiing holiday', 'pending')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Insert approval workflow log for approved requests
INSERT INTO approval_workflow_log (request_id, approval_level, approver_id, approver_role, action, comments) VALUES
('LR-2024-001', 1, 'EMP102', 'manager', 'approved', 'Approved. Enjoy your time with family.'),
('LR-2024-002', 1, 'EMP102', 'manager', 'approved', 'Get well soon!'),
('LR-2024-003', 1, 'EMP105', 'manager', 'approved', 'Happy holidays!')
ON DUPLICATE KEY UPDATE comments = VALUES(comments);

-- Summary message
SELECT 'Test data inserted successfully!' AS status;
SELECT COUNT(*) as leave_balance_records FROM leave_balances_v2;
SELECT COUNT(*) as comp_off_records FROM comp_off_records;
SELECT COUNT(*) as approval_chains FROM approval_chains;
SELECT COUNT(*) as leave_requests FROM leave_requests_v2;

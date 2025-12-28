/**
 * LEAVE APPROVAL WORKFLOW ENGINE
 * Real multi-level approval with proper routing
 * INTEGRATED WITH AI CONSTRAINT ENGINE
 */

const db = require('../config/db');
const Pusher = require('pusher');
const axios = require('axios');

// Initialize Pusher
const pusher = new Pusher({
    appId: "2095719",
    key: "b6c8ed8a35f95339f71c",
    secret: "8a62e6b69e9bac088b77",
    cluster: "ap2",
    useTLS: true
});

// AI Constraint Engine URL
const CONSTRAINT_ENGINE_URL = 'http://localhost:8001';

class WorkflowEngine {
    
    /**
     * DECISION RULES:
     * - AI AUTO-APPROVE: All constraints pass + confidence >= 0.85
     * - AI AUTO-REJECT: Critical constraint fails (no balance, blackout)
     * - ESCALATE TO MANAGER: Non-critical constraints fail
     * - ESCALATE TO HR: Multiple failures or policy exceptions
     */
    
    static APPROVAL_LEVELS = {
        MANAGER: 1,
        DEPARTMENT_HEAD: 2,
        HR_DIRECTOR: 3
    };
    
    static POSITION_HIERARCHY = {
        'CEO': 6,
        'Director': 5,
        'HR Director': 5,
        'Engineering Director': 5,
        'Sales Director': 5,
        'Manager': 4,
        'HR Manager': 4,
        'Engineering Manager': 4,
        'Sales Manager': 4,
        'Tech Lead': 3,
        'Senior Developer': 2,
        'Developer': 1,
        'Junior Developer': 0,
        'Executive': 1
    };
    
    /**
     * Get the approval chain for a leave request
     */
    static async getApprovalChain(empId, totalDays, leaveType) {
        const chain = [];
        
        // Get employee info
        const emp = await db.query(`
            SELECT e.*, m.emp_id as mgr_id, m.full_name as mgr_name, m.position as mgr_position
            FROM employees e
            LEFT JOIN employees m ON e.manager_id = m.emp_id
            WHERE e.emp_id = ?
        `, [empId]);
        
        if (!emp || !emp[0]) {
            throw new Error('Employee not found');
        }
        
        const employee = emp[0];
        
        // Level 1: Direct Manager (always required unless CEO)
        if (employee.mgr_id) {
            chain.push({
                level: 1,
                emp_id: employee.mgr_id,
                name: employee.mgr_name,
                position: employee.mgr_position,
                role: 'Direct Manager'
            });
        }
        
        // Level 2: Department Head (for 4+ days or if position requires)
        if (totalDays >= 4 && employee.mgr_id) {
            const deptHead = await this.getDepartmentHead(employee.department, employee.mgr_id);
            if (deptHead && deptHead.emp_id !== employee.mgr_id) {
                chain.push({
                    level: 2,
                    emp_id: deptHead.emp_id,
                    name: deptHead.full_name,
                    position: deptHead.position,
                    role: 'Department Head'
                });
            }
        }
        
        // Level 3: HR Director (for 8+ days or special leave types)
        if (totalDays >= 8 || ['maternity_leave', 'paternity_leave', 'sabbatical'].includes(leaveType)) {
            const hrDirector = await this.getHRDirector();
            if (hrDirector) {
                chain.push({
                    level: 3,
                    emp_id: hrDirector.emp_id,
                    name: hrDirector.full_name,
                    position: hrDirector.position,
                    role: 'HR Director'
                });
            }
        }
        
        return chain;
    }
    
    /**
     * Get Department Head for a department
     */
    static async getDepartmentHead(department, excludeEmpId = null) {
        const result = await db.query(`
            SELECT emp_id, full_name, position
            FROM employees
            WHERE department = ?
            AND position LIKE '%Director%'
            AND emp_id != ?
            LIMIT 1
        `, [department, excludeEmpId || '']);
        
        if (result && result[0]) return result[0];
        
        // Fallback: Find any manager in the department
        const manager = await db.query(`
            SELECT emp_id, full_name, position
            FROM employees
            WHERE department = ?
            AND (position LIKE '%Manager%' OR position LIKE '%Lead%')
            AND emp_id != ?
            ORDER BY FIELD(position, 'Engineering Manager', 'HR Manager', 'Sales Manager', 'Tech Lead') 
            LIMIT 1
        `, [department, excludeEmpId || '']);
        
        return manager ? manager[0] : null;
    }
    
    /**
     * Get HR Director
     */
    static async getHRDirector() {
        const result = await db.query(`
            SELECT emp_id, full_name, position
            FROM employees
            WHERE position LIKE '%HR Director%' OR position LIKE '%HR Manager%'
            ORDER BY CASE WHEN position LIKE '%Director%' THEN 0 ELSE 1 END
            LIMIT 1
        `);
        return result ? result[0] : null;
    }
    
    /**
     * Call AI Constraint Engine to evaluate leave request
     */
    static async callConstraintEngine(emp_id, leave_type, start_date, end_date, reason) {
        try {
            const response = await axios.post(`${CONSTRAINT_ENGINE_URL}/analyze`, {
                employee_id: emp_id,
                text: `${reason || 'Leave request'} - ${leave_type} from ${start_date} to ${end_date}`
            }, { timeout: 5000 });
            
            return response.data;
        } catch (err) {
            console.error('Constraint Engine unavailable:', err.message);
            return null; // Return null if AI is down, will escalate to human
        }
    }
    
    /**
     * Submit a leave request - AI FIRST, then humans if needed
     */
    static async submitLeaveRequest(data) {
        const { emp_id, leave_type, start_date, end_date, reason, is_half_day } = data;
        
        // Calculate days
        const start = new Date(start_date);
        const end = new Date(end_date);
        const totalDays = is_half_day ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Generate request ID
        const requestId = `LR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Get employee details
        const empDetails = await db.query(`SELECT full_name, email, department FROM employees WHERE emp_id = ?`, [emp_id]);
        const employee = empDetails[0];
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 1: CALL AI CONSTRAINT ENGINE FIRST
        // ═══════════════════════════════════════════════════════════════
        console.log(`\n[AI] Constraint Engine analyzing request for ${emp_id}...`);
        const aiAnalysis = await this.callConstraintEngine(emp_id, leave_type, start_date, end_date, reason);
        
        let aiDecision = 'ESCALATE'; // Default: escalate to human
        let aiRecommendation = 'review';
        let aiConfidence = 0;
        let requiresHumanApproval = true;
        let autoApproved = false;
        // Note: AI NEVER auto-rejects - always escalates to humans for rejection decisions
        
        if (aiAnalysis && aiAnalysis.success) {
            // New constraint engine format
            const summary = aiAnalysis.summary || {};
            const passedRules = summary.passed || 0;
            const totalRules = summary.total_rules || 1;
            const criticalFailures = summary.critical_failures || 0;
            
            aiConfidence = aiAnalysis.confidence || (passedRules / totalRules);
            aiRecommendation = aiAnalysis.recommendation || 'review';
            
            console.log(`[AI] Result: ${passedRules}/${totalRules} rules passed, confidence: ${Math.round(aiConfidence * 100)}%`);
            console.log(`[AI] Recommendation: ${aiRecommendation}`);
            
            // AI AUTO-APPROVE: Recommendation is approve AND high confidence AND no critical failures
            if (aiRecommendation === 'approve' && aiConfidence >= 0.85 && criticalFailures === 0) {
                aiDecision = 'AUTO_APPROVED';
                requiresHumanApproval = false;
                autoApproved = true;
                console.log('[AI] >>> AUTO-APPROVED: All constraints satisfied');
            }
            // AI ESCALATE: Any issues -> escalate to humans (AI NEVER rejects)
            else {
                aiDecision = 'ESCALATE';
                requiresHumanApproval = true;
                // Determine escalation level based on severity
                if (criticalFailures > 0) {
                    aiRecommendation = 'escalate_hr'; // Critical issues go to HR
                    console.log('[AI] >>> ESCALATING TO HR: Critical constraint issue');
                } else {
                    aiRecommendation = 'escalate_manager'; // Warnings go to manager
                    console.log('[AI] >>> ESCALATING TO MANAGER: Needs human review');
                }
            }
        } else {
            console.log('[AI] Constraint Engine unavailable, escalating to human approvers');
        }
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 2: DETERMINE STATUS AND APPROVAL CHAIN
        // ═══════════════════════════════════════════════════════════════
        let status = 'pending';
        let approvalChain = [];
        let currentApprover = null;
        
        if (autoApproved) {
            status = 'approved';
            // Update leave balance
            await db.query(`
                UPDATE leave_balances_v2
                SET used_days = used_days + ?, pending_days = GREATEST(0, pending_days - ?)
                WHERE emp_id = ? AND leave_type = ? AND year = YEAR(NOW())
            `, [totalDays, totalDays, emp_id, leave_type]);
        } 
        else {
            // AI doesn't reject - always escalate to humans for rejection decisions
            // Get human approval chain based on AI recommendation
            approvalChain = await this.getApprovalChain(emp_id, totalDays, leave_type);
            
            // If critical issues, route to HR directly
            if (aiRecommendation === 'escalate_hr') {
                const hrDirector = await this.getHRDirector();
                if (hrDirector) {
                    currentApprover = hrDirector.emp_id;
                    // Add HR to front of chain if not already there
                    if (!approvalChain.some(a => a.emp_id === hrDirector.emp_id)) {
                        approvalChain.unshift({
                            level: 0,
                            emp_id: hrDirector.emp_id,
                            name: hrDirector.full_name,
                            position: hrDirector.position,
                            role: 'HR (AI Escalated)'
                        });
                    }
                }
            } else {
                currentApprover = approvalChain[0]?.emp_id || null;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 3: INSERT LEAVE REQUEST WITH AI ANALYSIS
        // ═══════════════════════════════════════════════════════════════
        await db.query(`
            INSERT INTO leave_requests_enterprise (
                request_id, emp_id, leave_type, start_date, end_date, total_days,
                reason, status, current_approver, current_level,
                level1_approver, level1_status,
                level2_approver, level2_status,
                level3_approver, level3_status,
                ai_recommendation, ai_confidence, ai_analysis_json,
                sla_deadline, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR), NOW())
        `, [
            requestId, emp_id, leave_type, start_date, end_date, totalDays,
            reason, status, 
            currentApprover,
            requiresHumanApproval ? 1 : 0,
            approvalChain[0]?.emp_id || null,
            autoApproved ? 'approved' : 'pending',
            approvalChain[1]?.emp_id || null,
            approvalChain[1] ? 'pending' : 'not_required',
            approvalChain[2]?.emp_id || null,
            approvalChain[2] ? 'pending' : 'not_required',
            aiRecommendation,
            aiConfidence,
            aiAnalysis ? JSON.stringify(aiAnalysis) : null
        ]);
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 4: SEND NOTIFICATIONS
        // ═══════════════════════════════════════════════════════════════
        try {
            if (autoApproved) {
                // Notify employee of auto-approval
                await pusher.trigger(`employee-${emp_id}`, 'leave-auto-approved', {
                    request_id: requestId,
                    message: `Your ${totalDays}-day ${leave_type.replace(/_/g, ' ')} has been AUTO-APPROVED by AI`,
                    ai_analysis: aiAnalysis?.constraint_results
                });
                await pusher.trigger('hr-dashboard', 'leave-auto-approved', {
                    request_id: requestId,
                    employee: employee.full_name,
                    days: totalDays,
                    message: `AI auto-approved ${employee.full_name}'s leave - all constraints passed`
                });
            } 
            else {
                // Notify approver of pending request
                await pusher.trigger('hr-notifications', 'new-leave-request', {
                    request_id: requestId,
                    employee: employee.full_name,
                    department: employee.department,
                    leave_type,
                    total_days: totalDays,
                    ai_recommendation: aiRecommendation,
                    ai_confidence: aiConfidence,
                    violations: aiAnalysis?.constraint_results?.violations || []
                });
                
                if (currentApprover) {
                    await pusher.trigger(`employee-${currentApprover}`, 'pending-approval', {
                        request_id: requestId,
                        employee: employee.full_name,
                        leave_type,
                        days: totalDays,
                        ai_says: aiRecommendation,
                        message: `${employee.full_name} requests ${totalDays} days - AI recommends: ${aiRecommendation}`
                    });
                }
            }
            
            await db.query(`UPDATE leave_requests_enterprise SET pusher_notified = 1 WHERE request_id = ?`, [requestId]);
            
        } catch (err) {
            console.error('Pusher error:', err.message);
        }
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 5: RETURN RESULT
        // ═══════════════════════════════════════════════════════════════
        return {
            success: true,
            request_id: requestId,
            total_days: totalDays,
            status,
            ai_decision: aiDecision,
            ai_recommendation: aiRecommendation,
            ai_confidence: Math.round(aiConfidence * 100) + '%',
            auto_approved: autoApproved,
            auto_rejected: false, // AI NEVER rejects - always escalates
            requires_human_approval: requiresHumanApproval,
            approval_chain: approvalChain,
            current_approver: requiresHumanApproval ? approvalChain[0] : null,
            ai_analysis: aiAnalysis ? {
                rules_passed: aiAnalysis.summary?.passed || 0,
                rules_total: aiAnalysis.summary?.total_rules || 0,
                critical_failures: aiAnalysis.summary?.critical_failures || 0,
                warnings: aiAnalysis.summary?.warnings || 0,
                violations: aiAnalysis.constraints?.critical_failures || [],
                recommendation_reason: aiAnalysis.recommendation_reason
            } : null,
            message: autoApproved 
                ? `Leave AUTO-APPROVED by AI - all ${aiAnalysis?.summary?.total_rules || 0} constraints passed`
                : aiRecommendation === 'escalate_hr'
                    ? `Escalated to HR for review - AI found issues: ${aiAnalysis?.constraints?.critical_failures?.map(v => v.message).slice(0,2).join('; ') || 'Policy check required'}`
                    : `Pending approval from ${approvalChain[0]?.name || 'Manager'} (AI confidence: ${Math.round(aiConfidence * 100)}%)`
        };
    }
    
    /**
     * Process approval/rejection
     */
    static async processAction(requestId, approverId, action, comments) {
        // Get request details
        const requests = await db.query(`
            SELECT lr.*, e.full_name as emp_name, e.email as emp_email
            FROM leave_requests_enterprise lr
            JOIN employees e ON lr.emp_id = e.emp_id
            WHERE lr.request_id = ?
        `, [requestId]);
        
        if (!requests || !requests[0]) {
            throw new Error('Request not found');
        }
        
        const request = requests[0];
        
        // Verify approver is authorized
        if (request.current_approver !== approverId) {
            // Check if approver is HR (can approve any)
            const approver = await db.query(`SELECT position FROM employees WHERE emp_id = ?`, [approverId]);
            if (!approver[0] || !approver[0].position.includes('HR')) {
                throw new Error('You are not authorized to approve this request');
            }
        }
        
        const currentLevel = request.current_level;
        
        if (action === 'approve') {
            return await this.processApproval(request, approverId, comments, currentLevel);
        } else if (action === 'reject') {
            return await this.processRejection(request, approverId, comments, currentLevel);
        }
        
        throw new Error('Invalid action');
    }
    
    /**
     * Process approval at current level
     */
    static async processApproval(request, approverId, comments, currentLevel) {
        const requestId = request.request_id;
        
        // Update current level to approved
        await db.query(`
            UPDATE leave_requests_enterprise
            SET level${currentLevel}_status = 'approved',
                level${currentLevel}_action_at = NOW(),
                level${currentLevel}_comments = ?
            WHERE request_id = ?
        `, [comments || '', requestId]);
        
        // Check if more approvals needed
        let nextLevel = null;
        let nextApprover = null;
        
        if (currentLevel === 1 && request.level2_status === 'pending') {
            nextLevel = 2;
            nextApprover = request.level2_approver;
        } else if (currentLevel === 2 && request.level3_status === 'pending') {
            nextLevel = 3;
            nextApprover = request.level3_approver;
        }
        
        if (nextLevel && nextApprover) {
            // Move to next level
            await db.query(`
                UPDATE leave_requests_enterprise
                SET current_level = ?, current_approver = ?, sla_deadline = DATE_ADD(NOW(), INTERVAL 48 HOUR)
                WHERE request_id = ?
            `, [nextLevel, nextApprover, requestId]);
            
            // Get next approver name
            const approverInfo = await db.query(`SELECT full_name FROM employees WHERE emp_id = ?`, [nextApprover]);
            
            // Notify next approver
            try {
                await pusher.trigger(`employee-${nextApprover}`, 'pending-approval', {
                    request_id: requestId,
                    employee: request.emp_name,
                    days: request.total_days,
                    level: nextLevel,
                    message: `Leave request escalated for your approval`
                });
            } catch (err) {
                console.error('Pusher error:', err.message);
            }
            
            return {
                success: true,
                message: `Approved at level ${currentLevel}. Pending level ${nextLevel} approval from ${approverInfo[0]?.full_name || nextApprover}`,
                status: 'pending_next_level',
                next_approver: nextApprover
            };
            
        } else {
            // Fully approved
            await db.query(`
                UPDATE leave_requests_enterprise
                SET status = 'approved', updated_at = NOW()
                WHERE request_id = ?
            `, [requestId]);
            
            // Update leave balance
            await db.query(`
                UPDATE leave_balances_v2
                SET used_days = used_days + ?, pending_days = GREATEST(0, pending_days - ?)
                WHERE emp_id = ? AND leave_type = ? AND year = YEAR(NOW())
            `, [request.total_days, request.total_days, request.emp_id, request.leave_type]);
            
            // Notify employee
            try {
                await pusher.trigger(`employee-${request.emp_id}`, 'leave-approved', {
                    request_id: requestId,
                    message: 'Your leave request has been approved!',
                    start_date: request.start_date,
                    end_date: request.end_date
                });
                
                await pusher.trigger('hr-dashboard', 'leave-status-changed', {
                    request_id: requestId,
                    status: 'approved',
                    employee: request.emp_name
                });
            } catch (err) {
                console.error('Pusher error:', err.message);
            }
            
            return {
                success: true,
                message: 'Leave request fully approved',
                status: 'approved'
            };
        }
    }
    
    /**
     * Process rejection
     */
    static async processRejection(request, approverId, comments, currentLevel) {
        const requestId = request.request_id;
        
        // Update to rejected
        await db.query(`
            UPDATE leave_requests_enterprise
            SET status = 'rejected',
                level${currentLevel}_status = 'rejected',
                level${currentLevel}_action_at = NOW(),
                level${currentLevel}_comments = ?
            WHERE request_id = ?
        `, [comments || 'Rejected', requestId]);
        
        // Notify employee
        try {
            await pusher.trigger(`employee-${request.emp_id}`, 'leave-rejected', {
                request_id: requestId,
                reason: comments,
                message: `Your leave request was rejected: ${comments || 'No reason provided'}`
            });
            
            await pusher.trigger('hr-dashboard', 'leave-status-changed', {
                request_id: requestId,
                status: 'rejected',
                employee: request.emp_name
            });
        } catch (err) {
            console.error('Pusher error:', err.message);
        }
        
        return {
            success: true,
            message: 'Leave request rejected',
            status: 'rejected'
        };
    }
    
    /**
     * Get pending approvals for an approver
     */
    static async getPendingApprovals(approverId) {
        const requests = await db.query(`
            SELECT lr.*, e.full_name, e.email, e.department, e.position,
                   TIMESTAMPDIFF(HOUR, lr.created_at, NOW()) as hours_pending,
                   lr.sla_deadline < NOW() as is_overdue
            FROM leave_requests_enterprise lr
            JOIN employees e ON lr.emp_id = e.emp_id
            WHERE lr.current_approver = ? AND lr.status = 'pending'
            ORDER BY lr.sla_deadline ASC
        `, [approverId]);
        
        return requests || [];
    }
    
    /**
     * Get all pending requests for HR dashboard
     */
    static async getAllPendingRequests(filters = {}) {
        let whereClause = "WHERE lr.status = 'pending'";
        const params = [];
        
        if (filters.department) {
            whereClause += " AND e.department = ?";
            params.push(filters.department);
        }
        
        if (filters.leave_type) {
            whereClause += " AND lr.leave_type = ?";
            params.push(filters.leave_type);
        }
        
        const requests = await db.query(`
            SELECT lr.*, 
                   e.full_name, e.email, e.department, e.position,
                   m.full_name as approver_name, m.position as approver_position,
                   TIMESTAMPDIFF(HOUR, lr.created_at, NOW()) as hours_pending,
                   lr.sla_deadline < NOW() as is_overdue
            FROM leave_requests_enterprise lr
            JOIN employees e ON lr.emp_id = e.emp_id
            LEFT JOIN employees m ON lr.current_approver = m.emp_id
            ${whereClause}
            ORDER BY lr.sla_breached DESC, lr.created_at ASC
        `, params);
        
        return requests || [];
    }
    
    /**
     * Get dashboard analytics
     */
    static async getDashboardAnalytics() {
        const pending = await db.query(`SELECT COUNT(*) as count FROM leave_requests_enterprise WHERE status = 'pending'`);
        const approved = await db.query(`SELECT COUNT(*) as count FROM leave_requests_enterprise WHERE status = 'approved' AND MONTH(updated_at) = MONTH(NOW())`);
        const rejected = await db.query(`SELECT COUNT(*) as count FROM leave_requests_enterprise WHERE status = 'rejected' AND MONTH(created_at) = MONTH(NOW())`);
        const slaBreaches = await db.query(`SELECT COUNT(*) as count FROM leave_requests_enterprise WHERE sla_breached = 1 AND status = 'pending'`);
        
        const byDepartment = await db.query(`
            SELECT e.department, COUNT(*) as count, SUM(lr.total_days) as total_days
            FROM leave_requests_enterprise lr
            JOIN employees e ON lr.emp_id = e.emp_id
            WHERE MONTH(lr.created_at) = MONTH(NOW())
            GROUP BY e.department
        `);
        
        const byLeaveType = await db.query(`
            SELECT leave_type, COUNT(*) as count
            FROM leave_requests_enterprise
            WHERE MONTH(created_at) = MONTH(NOW())
            GROUP BY leave_type
        `);
        
        const pendingByApprover = await db.query(`
            SELECT e.full_name as approver, e.emp_id, COUNT(*) as pending_count
            FROM leave_requests_enterprise lr
            JOIN employees e ON lr.current_approver = e.emp_id
            WHERE lr.status = 'pending'
            GROUP BY lr.current_approver
            ORDER BY pending_count DESC
            LIMIT 10
        `);
        
        return {
            summary: {
                pending: pending[0]?.count || 0,
                approved_this_month: approved[0]?.count || 0,
                rejected_this_month: rejected[0]?.count || 0,
                sla_breaches: slaBreaches[0]?.count || 0
            },
            by_department: byDepartment || [],
            by_leave_type: byLeaveType || [],
            pending_by_approver: pendingByApprover || []
        };
    }
    
    /**
     * Get team calendar data
     */
    static async getTeamCalendar(managerId, startDate, endDate) {
        // Get all team members under this manager (recursive)
        const teamMembers = await this.getTeamMembers(managerId);
        const empIds = teamMembers.map(m => m.emp_id);
        
        if (empIds.length === 0) {
            return [];
        }
        
        const leaves = await db.query(`
            SELECT lr.*, e.full_name, e.department, e.position
            FROM leave_requests_enterprise lr
            JOIN employees e ON lr.emp_id = e.emp_id
            WHERE lr.emp_id IN (?) 
            AND lr.status = 'approved'
            AND ((lr.start_date BETWEEN ? AND ?) OR (lr.end_date BETWEEN ? AND ?) OR (lr.start_date <= ? AND lr.end_date >= ?))
            ORDER BY lr.start_date
        `, [empIds, startDate, endDate, startDate, endDate, startDate, endDate]);
        
        return {
            team_members: teamMembers,
            leaves: leaves || []
        };
    }
    
    /**
     * Get all team members under a manager (recursive)
     */
    static async getTeamMembers(managerId, includeManager = true) {
        const members = [];
        
        if (includeManager) {
            const mgr = await db.query(`SELECT emp_id, full_name, position, department FROM employees WHERE emp_id = ?`, [managerId]);
            if (mgr[0]) members.push(mgr[0]);
        }
        
        const directReports = await db.query(`
            SELECT emp_id, full_name, position, department 
            FROM employees 
            WHERE manager_id = ?
        `, [managerId]);
        
        for (const report of directReports || []) {
            members.push(report);
            // Get their reports recursively
            const subReports = await this.getTeamMembers(report.emp_id, false);
            members.push(...subReports);
        }
        
        return members;
    }
}

module.exports = WorkflowEngine;

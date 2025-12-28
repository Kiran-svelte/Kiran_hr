/**
 * LEAVE MANAGEMENT API ROUTES
 * Uses WorkflowEngine for real approval routing
 */

const express = require('express');
const router = express.Router();
const WorkflowEngine = require('../services/WorkflowEngine');
const db = require('../config/db');

// ============================================
// LEAVE SUBMISSION
// ============================================
router.post('/submit', async (req, res) => {
    try {
        const { emp_id, leave_type, start_date, end_date, reason, is_half_day } = req.body;
        
        if (!emp_id || !leave_type || !start_date || !end_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await WorkflowEngine.submitLeaveRequest({
            emp_id, leave_type, start_date, end_date, reason, is_half_day
        });
        
        res.json(result);
        
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// APPROVE/REJECT LEAVE
// ============================================
router.put('/:requestId/action', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action, comments, approver_id } = req.body;
        
        if (!action || !approver_id) {
            return res.status(400).json({ error: 'Action and approver_id required' });
        }
        
        const result = await WorkflowEngine.processAction(requestId, approver_id, action, comments);
        res.json(result);
        
    } catch (error) {
        console.error('Action error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET PENDING APPROVALS FOR APPROVER
// ============================================
router.get('/pending/:approverId', async (req, res) => {
    try {
        const { approverId } = req.params;
        const requests = await WorkflowEngine.getPendingApprovals(approverId);
        res.json({ requests, count: requests.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET ALL PENDING (HR DASHBOARD)
// ============================================
router.get('/pending', async (req, res) => {
    try {
        const { department, leave_type } = req.query;
        const requests = await WorkflowEngine.getAllPendingRequests({ department, leave_type });
        res.json({ requests, count: requests.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HR DASHBOARD ANALYTICS
// ============================================
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await WorkflowEngine.getDashboardAnalytics();
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TEAM CALENDAR
// ============================================
router.get('/team-calendar/:managerId', async (req, res) => {
    try {
        const { managerId } = req.params;
        const { start_date, end_date } = req.query;
        
        const startDate = start_date || new Date().toISOString().split('T')[0];
        const endDateDefault = new Date();
        endDateDefault.setMonth(endDateDefault.getMonth() + 1);
        const endDate = end_date || endDateDefault.toISOString().split('T')[0];
        
        const data = await WorkflowEngine.getTeamCalendar(managerId, startDate, endDate);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EMPLOYEE LEAVE BALANCE
// ============================================
router.get('/balance/:empId', async (req, res) => {
    try {
        const { empId } = req.params;
        
        // Get existing balances (using correct column names)
        const balances = await db.query(`
            SELECT leave_type, annual_entitlement, accrued_to_date, used_days, pending_days,
                   available_balance
            FROM leave_balances_v2
            WHERE emp_id = ? AND year = YEAR(NOW())
        `, [empId]);
        
        // Default balances if not found
        const defaultBalances = {
            earned_leave: { entitled: 15, used: 0, pending: 0, available: 15 },
            sick_leave: { entitled: 10, used: 0, pending: 0, available: 10 },
            casual_leave: { entitled: 8, used: 0, pending: 0, available: 8 },
            comp_off: { entitled: 0, used: 0, pending: 0, available: 0 }
        };
        
        // Merge with actual data
        for (const b of balances || []) {
            defaultBalances[b.leave_type] = {
                entitled: parseFloat(b.annual_entitlement) || 0,
                used: parseFloat(b.used_days) || 0,
                pending: parseFloat(b.pending_days) || 0,
                available: parseFloat(b.available_balance) || 0
            };
        }
        
        res.json(defaultBalances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EMPLOYEE LEAVE HISTORY
// ============================================
router.get('/history/:empId', async (req, res) => {
    try {
        const { empId } = req.params;
        const { limit = 20 } = req.query;
        
        const requests = await db.query(`
            SELECT request_id, leave_type, start_date, end_date, total_days, 
                   status, reason, created_at, 
                   COALESCE(level3_action_at, level2_action_at, level1_action_at) as approved_at,
                   level1_comments, level2_comments, level3_comments
            FROM leave_requests_enterprise
            WHERE emp_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [empId, parseInt(limit)]);
        
        res.json({ requests: requests || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET APPROVAL CHAIN PREVIEW
// ============================================
router.get('/approval-chain/:empId', async (req, res) => {
    try {
        const { empId } = req.params;
        const { days = 1, leave_type = 'casual_leave' } = req.query;
        
        const chain = await WorkflowEngine.getApprovalChain(empId, parseInt(days), leave_type);
        res.json({ approval_chain: chain });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BULK APPROVE/REJECT
// ============================================
router.post('/bulk-action', async (req, res) => {
    try {
        const { request_ids, action, comments, approver_id } = req.body;
        
        if (!request_ids || request_ids.length === 0) {
            return res.status(400).json({ error: 'No request IDs provided' });
        }
        
        const results = { success: [], failed: [] };
        
        for (const reqId of request_ids) {
            try {
                await WorkflowEngine.processAction(reqId, approver_id, action, comments);
                results.success.push(reqId);
            } catch (err) {
                results.failed.push({ id: reqId, error: err.message });
            }
        }
        
        res.json({
            success: true,
            total: request_ids.length,
            successful: results.success.length,
            failed: results.failed.length,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET HIERARCHY
// ============================================
router.get('/hierarchy/:empId', async (req, res) => {
    try {
        const { empId } = req.params;
        
        const emp = await db.query(`
            SELECT e.*, m.full_name as manager_name, m.position as manager_position
            FROM employees e
            LEFT JOIN employees m ON e.manager_id = m.emp_id
            WHERE e.emp_id = ?
        `, [empId]);
        
        if (!emp || !emp[0]) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        const directReports = await db.query(`
            SELECT emp_id, full_name, position, department
            FROM employees WHERE manager_id = ?
        `, [empId]);
        
        res.json({
            employee: emp[0],
            direct_reports: directReports || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'leave-workflow', timestamp: new Date().toISOString() });
});

module.exports = router;

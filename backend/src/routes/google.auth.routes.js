/**
 * Google OAuth Routes
 * Handles authentication flow for Gmail & Calendar
 */

const express = require('express');
const router = express.Router();
const googleService = require('../services/GoogleService');
const googleConfig = require('../config/google.config');
const db = require('../config/db');

/**
 * GET /api/auth/google
 * Start OAuth flow - redirect to Google consent screen
 */
router.get('/google', (req, res) => {
    const empId = req.query.emp_id || req.headers['x-employee-id'];
    
    if (!empId) {
        return res.status(400).json({ error: 'Employee ID required' });
    }

    const authUrl = googleService.getAuthUrl({ empId });
    
    // If AJAX request, return URL; otherwise redirect
    if (req.headers.accept?.includes('application/json')) {
        res.json({ authUrl });
    } else {
        res.redirect(authUrl);
    }
});

/**
 * GET /api/auth/google/callback
 * Handle OAuth callback from Google
 */
router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect(`/pages/settings?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect('/pages/settings?error=no_code');
    }

    try {
        // Parse state to get employee ID
        let empId;
        try {
            const stateData = JSON.parse(state || '{}');
            empId = stateData.empId;
        } catch {
            empId = null;
        }

        if (!empId) {
            return res.redirect('/pages/settings?error=invalid_state');
        }

        // Exchange code for tokens
        const tokens = await googleService.getTokensFromCode(code);
        
        // Get user info to verify email
        const userInfo = await googleService.getUserInfo(tokens.access_token);
        
        // Check if email is verified
        if (!googleConfig.verifiedEmails.includes(userInfo.email)) {
            console.log(`[OAuth] Unverified email attempted: ${userInfo.email}`);
            // Still save tokens but warn user
        }

        // Save tokens to database
        await googleService.saveTokens(empId, tokens);

        // Update employee's Google ID
        await db.execute(
            'UPDATE employees SET google_id = ?, email = COALESCE(email, ?) WHERE emp_id = ?',
            [userInfo.id, userInfo.email, empId]
        );

        console.log(`[OAuth] Google connected for ${empId}: ${userInfo.email}`);

        // Redirect to success page
        res.redirect(`/pages/settings?google_connected=true&email=${encodeURIComponent(userInfo.email)}`);

    } catch (err) {
        console.error('[OAuth] Callback error:', err);
        res.redirect(`/pages/settings?error=${encodeURIComponent(err.message)}`);
    }
});

/**
 * GET /api/auth/google/status
 * Check if user is connected to Google
 */
router.get('/google/status', async (req, res) => {
    const empId = req.query.emp_id || req.headers['x-employee-id'];
    
    if (!empId) {
        return res.status(400).json({ error: 'Employee ID required' });
    }

    try {
        const rows = await db.query(
            'SELECT google_refresh_token, email FROM employees WHERE emp_id = ?',
            [empId]
        );

        if (!rows || rows.length === 0) {
            return res.json({ connected: false, error: 'Employee not found' });
        }

        const connected = !!rows[0].google_refresh_token;
        const canSendEmail = googleConfig.verifiedEmails.includes(rows[0].email);

        res.json({
            connected,
            email: rows[0].email,
            canSendEmail,
            verifiedEmails: googleConfig.verifiedEmails
        });

    } catch (err) {
        res.status(500).json({ connected: false, error: err.message });
    }
});

/**
 * POST /api/auth/google/disconnect
 * Disconnect Google account
 */
router.post('/google/disconnect', async (req, res) => {
    const empId = req.body.emp_id || req.headers['x-employee-id'];
    
    if (!empId) {
        return res.status(400).json({ error: 'Employee ID required' });
    }

    try {
        await db.execute(
            'UPDATE employees SET google_access_token = NULL, google_refresh_token = NULL WHERE emp_id = ?',
            [empId]
        );

        res.json({ success: true, message: 'Google disconnected' });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/auth/google/test-email
 * Send a test email
 */
router.post('/google/test-email', async (req, res) => {
    const { emp_id, to, to_email, subject, message } = req.body;
    
    if (!emp_id) {
        return res.status(400).json({ error: 'Employee ID required' });
    }

    const recipient = to || to_email || 'kirancompany094@gmail.com';
    const emailSubject = subject || '🧪 Test Email - AI Leave Management';
    const emailBody = message ? `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${emailSubject}</h2>
            <p>${message}</p>
            <p>Sent at: ${new Date().toISOString()}</p>
        </div>
    ` : `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Email Integration Working!</h2>
            <p>This is a test email from the AI Leave Management System.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
            <p>If you received this, your Gmail integration is working correctly.</p>
        </div>
    `;

    try {
        const result = await googleService.sendEmail(
            emp_id,
            recipient,
            emailSubject,
            emailBody
        );

        res.json(result);

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/auth/google/test-calendar
 * Create a test calendar event
 */
router.post('/google/test-calendar', async (req, res) => {
    const { emp_id } = req.body;
    
    if (!emp_id) {
        return res.status(400).json({ error: 'Employee ID required' });
    }

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const result = await googleService.createLeaveEvent(emp_id, {
            requestId: 'TEST-' + Date.now(),
            employeeName: 'Test User',
            leaveType: 'Test Leave',
            leaveTypeDb: 'casual_leave',
            startDate: tomorrow.toISOString().split('T')[0],
            endDate: tomorrow.toISOString().split('T')[0],
            totalDays: 1
        });

        res.json(result);

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

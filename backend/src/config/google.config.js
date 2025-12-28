/**
 * Google OAuth Configuration
 * For Gmail and Calendar integration
 */

module.exports = {
    // OAuth 2.0 Credentials
    clientId: '354227009682-eq7k9c4raa91gotpsrco06tph22uaeca.apps.googleusercontent.com',
    clientSecret: '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',
    
    // Redirect URI (must match Google Console)
    redirectUri: 'http://localhost:5000/api/auth/google/callback',
    
    // Scopes for Gmail and Calendar
    scopes: [
        'https://www.googleapis.com/auth/gmail.send',      // Send emails
        'https://www.googleapis.com/auth/gmail.modify',    // Read + send emails
        'https://www.googleapis.com/auth/calendar',        // Full calendar access
        'https://www.googleapis.com/auth/userinfo.email',  // Get user email
        'https://www.googleapis.com/auth/userinfo.profile' // Get user profile
    ],
    
    // Verified email accounts (can send/receive)
    verifiedEmails: [
        'kirancompany094@gmail.com',
        'kiranlighter11@gmail.com',
        'traderlighter11@gmail.com'
    ],
    
    // Default sender (HR notifications)
    defaultSender: 'kirancompany094@gmail.com',
    
    // Calendar settings
    calendar: {
        // Calendar ID for leave events (use 'primary' for main calendar)
        leaveCalendarId: 'primary',
        // Event colors by leave type
        eventColors: {
            'sick_leave': '11',      // Red
            'earned_leave': '9',     // Blue
            'casual_leave': '5',     // Yellow
            'maternity_leave': '6',  // Orange
            'paternity_leave': '7',  // Cyan
            'bereavement_leave': '8' // Gray
        }
    }
};

const crypto = require('crypto');
const db = require('../../database/database');

/**
 * Enhanced Session Management System
 * Provides secure session handling with Redis-like functionality using PostgreSQL
 */

class SessionManager {
    constructor(options = {}) {
        this.options = {
            maxAge: options.maxAge || 30 * 60 * 1000, // 30 minutes default
            checkInterval: options.checkInterval || 60 * 1000, // Check every minute
            maxSessions: options.maxSessions || 5, // Max concurrent sessions per user
            extendOnActivity: options.extendOnActivity !== false, // Auto-extend on activity
            secureCookie: options.secureCookie !== false,
            sameSite: options.sameSite || 'strict'
        };

        // Start cleanup interval
        this.startCleanupInterval();
    }

    /**
     * Create a new session
     */
    async createSession(userId, ipAddress, userAgent, metadata = {}) {
        try {
            const sessionId = this.generateSessionId();
            const expiresAt = new Date(Date.now() + this.options.maxAge);

            // Check for existing sessions
            const existingSessionsQuery = `
                SELECT COUNT(*) as count FROM user_sessions
                WHERE user_id = $1 AND is_active = true
            `;
            const existingResult = await db.query(existingSessionsQuery, [userId]);
            
            // If max sessions exceeded, invalidate oldest
            if (existingResult.rows[0].count >= this.options.maxSessions) {
                await this.invalidateOldestSession(userId);
            }

            // Create new session
            const query = `
                INSERT INTO user_sessions (
                    session_id, user_id, ip_address, user_agent,
                    expires_at, device_info, location_info
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const deviceInfo = this.parseUserAgent(userAgent);
            const locationInfo = await this.getLocationInfo(ipAddress);

            const result = await db.query(query, [
                sessionId,
                userId,
                ipAddress,
                userAgent,
                expiresAt,
                JSON.stringify(deviceInfo),
                JSON.stringify(locationInfo)
            ]);

            // Create notification for new login
            await this.notifyNewLogin(userId, deviceInfo, locationInfo);

            return {
                sessionId,
                userId,
                expiresAt,
                token: this.generateToken(sessionId, userId)
            };
        } catch (error) {
            console.error('Failed to create session:', error);
            throw error;
        }
    }

    /**
     * Validate and get session
     */
    async validateSession(sessionId) {
        try {
            const query = `
                SELECT s.*, u.name, u.email, u.role
                FROM user_sessions s
                JOIN users u ON s.user_id = u.user_id
                WHERE s.session_id = $1 
                  AND s.is_active = true
                  AND s.expires_at > NOW()
            `;

            const result = await db.query(query, [sessionId]);

            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];

            // Extend session if configured
            if (this.options.extendOnActivity) {
                await this.extendSession(sessionId);
            }

            // Update last activity
            await db.query(
                'UPDATE user_sessions SET last_activity = NOW() WHERE session_id = $1',
                [sessionId]
            );

            return session;
        } catch (error) {
            console.error('Failed to validate session:', error);
            return null;
        }
    }

    /**
     * Extend session expiry
     */
    async extendSession(sessionId) {
        try {
            const newExpiry = new Date(Date.now() + this.options.maxAge);
            const query = `
                UPDATE user_sessions 
                SET expires_at = $1, last_activity = NOW()
                WHERE session_id = $2 AND is_active = true
                RETURNING *
            `;

            await db.query(query, [newExpiry, sessionId]);
        } catch (error) {
            console.error('Failed to extend session:', error);
        }
    }

    /**
     * Invalidate session
     */
    async invalidateSession(sessionId, reason = 'manual_logout') {
        try {
            const query = `
                UPDATE user_sessions
                SET is_active = false, 
                    logout_at = NOW(),
                    logout_reason = $1
                WHERE session_id = $2
                RETURNING user_id
            `;

            const result = await db.query(query, [reason, sessionId]);
            
            if (result.rows.length > 0) {
                // Log the logout
                await this.logSessionEvent(result.rows[0].user_id, 'logout', { reason });
            }

            return true;
        } catch (error) {
            console.error('Failed to invalidate session:', error);
            return false;
        }
    }

    /**
     * Invalidate all sessions for a user
     */
    async invalidateAllUserSessions(userId, reason = 'security') {
        try {
            const query = `
                UPDATE user_sessions
                SET is_active = false,
                    logout_at = NOW(),
                    logout_reason = $1
                WHERE user_id = $2 AND is_active = true
            `;

            await db.query(query, [reason, userId]);

            // Notify user
            await this.createNotification(
                userId,
                'Security Alert',
                'All your sessions have been terminated for security reasons.',
                'warning',
                'urgent'
            );

            return true;
        } catch (error) {
            console.error('Failed to invalidate user sessions:', error);
            return false;
        }
    }

    /**
     * Get active sessions for user
     */
    async getUserSessions(userId) {
        try {
            const query = `
                SELECT 
                    session_id,
                    ip_address,
                    user_agent,
                    device_info,
                    location_info,
                    login_at,
                    last_activity,
                    expires_at
                FROM user_sessions
                WHERE user_id = $1 AND is_active = true
                ORDER BY last_activity DESC
            `;

            const result = await db.query(query, [userId]);
            
            return result.rows.map(session => ({
                ...session,
                device_info: JSON.parse(session.device_info || '{}'),
                location_info: JSON.parse(session.location_info || '{}'),
                isCurrent: false // Will be set by caller
            }));
        } catch (error) {
            console.error('Failed to get user sessions:', error);
            return [];
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            const query = `
                UPDATE user_sessions
                SET is_active = false,
                    logout_at = NOW(),
                    logout_reason = 'session_expired'
                WHERE is_active = true 
                  AND expires_at <= NOW()
                RETURNING user_id, session_id
            `;

            const result = await db.query(query);

            // Log expired sessions
            for (const session of result.rows) {
                await this.logSessionEvent(
                    session.user_id,
                    'session_expired',
                    { sessionId: session.session_id }
                );
            }

            return result.rows.length;
        } catch (error) {
            console.error('Failed to cleanup sessions:', error);
            return 0;
        }
    }

    /**
     * Session analytics
     */
    async getSessionAnalytics(timeRange = '24h') {
        try {
            const intervals = {
                '1h': '1 hour',
                '24h': '24 hours',
                '7d': '7 days',
                '30d': '30 days'
            };

            const interval = intervals[timeRange] || '24 hours';

            const query = `
                SELECT 
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
                    AVG(EXTRACT(EPOCH FROM (COALESCE(logout_at, NOW()) - login_at))/60) as avg_session_duration_minutes,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    JSONB_AGG(DISTINCT device_info->'browser') as browsers,
                    JSONB_AGG(DISTINCT device_info->'os') as operating_systems
                FROM user_sessions
                WHERE login_at >= NOW() - INTERVAL '${interval}'
            `;

            const result = await db.query(query);
            
            return result.rows[0];
        } catch (error) {
            console.error('Failed to get session analytics:', error);
            return null;
        }
    }

    /**
     * Detect suspicious session activity
     */
    async detectSuspiciousActivity(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT ip_address) as ip_count,
                    COUNT(DISTINCT SUBSTRING(ip_address FROM '^[^.]+')) as country_count,
                    COUNT(*) as login_count,
                    MAX(login_at) - MIN(login_at) as time_span
                FROM user_sessions
                WHERE user_id = $1
                  AND login_at >= NOW() - INTERVAL '1 hour'
            `;

            const result = await db.query(query, [userId]);
            const stats = result.rows[0];

            const suspicious = 
                stats.ip_count > 3 ||  // Multiple IPs in short time
                stats.country_count > 1 || // Multiple countries
                stats.login_count > 10; // Excessive login attempts

            if (suspicious) {
                await this.handleSuspiciousActivity(userId, stats);
            }

            return suspicious;
        } catch (error) {
            console.error('Failed to detect suspicious activity:', error);
            return false;
        }
    }

    /**
     * Helper methods
     */
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateToken(sessionId, userId) {
        const payload = `${sessionId}.${userId}.${Date.now()}`;
        const signature = crypto
            .createHmac('sha256', process.env.SESSION_SECRET || 'default-secret')
            .update(payload)
            .digest('hex');
        return `${payload}.${signature}`;
    }

    parseUserAgent(userAgent) {
        // Simple parsing - in production use a library like 'useragent'
        const info = {
            browser: 'Unknown',
            os: 'Unknown',
            device: 'Desktop'
        };

        if (userAgent.includes('Chrome')) info.browser = 'Chrome';
        else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
        else if (userAgent.includes('Safari')) info.browser = 'Safari';
        else if (userAgent.includes('Edge')) info.browser = 'Edge';

        if (userAgent.includes('Windows')) info.os = 'Windows';
        else if (userAgent.includes('Mac')) info.os = 'macOS';
        else if (userAgent.includes('Linux')) info.os = 'Linux';
        else if (userAgent.includes('Android')) info.os = 'Android';
        else if (userAgent.includes('iOS')) info.os = 'iOS';

        if (userAgent.includes('Mobile')) info.device = 'Mobile';
        else if (userAgent.includes('Tablet')) info.device = 'Tablet';

        return info;
    }

    async getLocationInfo(ipAddress) {
        // In production, use a geolocation API
        // For now, return mock data
        return {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown'
        };
    }

    async notifyNewLogin(userId, deviceInfo, locationInfo) {
        try {
            const message = `New login from ${deviceInfo.browser} on ${deviceInfo.os} (${locationInfo.city || 'Unknown location'})`;
            
            await this.createNotification(
                userId,
                'New Login',
                message,
                'info',
                'normal'
            );
        } catch (error) {
            console.error('Failed to notify new login:', error);
        }
    }

    async createNotification(userId, title, message, type, priority) {
        try {
            const query = `
                INSERT INTO notifications (user_id, title, message, type, priority)
                VALUES ($1, $2, $3, $4, $5)
            `;
            
            await db.query(query, [userId, title, message, type, priority]);
        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    }

    async logSessionEvent(userId, event, metadata = {}) {
        try {
            const query = `
                INSERT INTO activity_feed (actor_id, action, object_type, object_id, metadata)
                VALUES ($1, $2, 'session', $3, $4)
            `;
            
            await db.query(query, [
                userId,
                event,
                `session_${Date.now()}`,
                JSON.stringify(metadata)
            ]);
        } catch (error) {
            console.error('Failed to log session event:', error);
        }
    }

    async handleSuspiciousActivity(userId, stats) {
        // Create security alert
        await this.createNotification(
            userId,
            'Security Alert',
            'Suspicious login activity detected on your account',
            'warning',
            'urgent'
        );

        // Notify admins
        const adminQuery = `
            INSERT INTO notifications (user_id, title, message, type, priority)
            SELECT user_id, 'Security Alert', $1, 'error', 'urgent'
            FROM users WHERE role = 'super_admin'
        `;
        
        await db.query(adminQuery, [
            `Suspicious activity detected for user ${userId}: ${JSON.stringify(stats)}`
        ]);
    }

    async invalidateOldestSession(userId) {
        const query = `
            UPDATE user_sessions
            SET is_active = false,
                logout_at = NOW(),
                logout_reason = 'max_sessions_exceeded'
            WHERE session_id = (
                SELECT session_id FROM user_sessions
                WHERE user_id = $1 AND is_active = true
                ORDER BY login_at ASC
                LIMIT 1
            )
        `;
        
        await db.query(query, [userId]);
    }

    startCleanupInterval() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.options.checkInterval);
    }
}

// Middleware factory
const sessionMiddleware = (sessionManager) => {
    return async (req, res, next) => {
        const sessionId = req.headers['x-session-id'] || 
                         req.cookies?.sessionId ||
                         req.session?.id;

        if (!sessionId) {
            return next();
        }

        const session = await sessionManager.validateSession(sessionId);
        
        if (session) {
            req.sessionData = session;
            req.user = {
                userId: session.user_id,
                name: session.name,
                email: session.email,
                role: session.role
            };
        }

        next();
    };
};

// Export singleton instance
const sessionManager = new SessionManager();

module.exports = {
    SessionManager,
    sessionManager,
    sessionMiddleware
};
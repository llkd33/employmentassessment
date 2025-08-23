const db = require('../../database/database');

/**
 * Audit Trail Middleware
 * Tracks all data modifications and access patterns
 */

// Audit log levels
const AuditLevel = {
    CRITICAL: 'critical', // Security events, unauthorized access
    HIGH: 'high',         // Data modifications, deletions
    MEDIUM: 'medium',     // Updates, configuration changes
    LOW: 'low',           // Views, exports
    INFO: 'info'          // General access
};

// Action types
const AuditAction = {
    CREATE: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
    EXPORT: 'EXPORT',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    FAILED_AUTH: 'FAILED_AUTH',
    PERMISSION_DENIED: 'PERMISSION_DENIED'
};

/**
 * Main audit middleware
 */
const auditMiddleware = (options = {}) => {
    const {
        level = AuditLevel.MEDIUM,
        excludePaths = ['/api/health', '/api/metrics'],
        includeSensitive = false
    } = options;

    return async (req, res, next) => {
        // Skip excluded paths
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        const startTime = Date.now();
        const auditEntry = {
            requestId: generateRequestId(),
            userId: req.user?.userId || 'anonymous',
            userRole: req.user?.role || 'none',
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'],
            method: req.method,
            path: req.path,
            query: req.query,
            sessionId: req.session?.id || req.headers['x-session-id']
        };

        // Store original methods
        const originalJson = res.json;
        const originalSend = res.send;

        // Override response methods to capture response
        res.json = function(data) {
            auditEntry.responseStatus = res.statusCode;
            auditEntry.responseTime = Date.now() - startTime;
            logAudit(auditEntry, data, req.body);
            return originalJson.call(this, data);
        };

        res.send = function(data) {
            auditEntry.responseStatus = res.statusCode;
            auditEntry.responseTime = Date.now() - startTime;
            logAudit(auditEntry, data, req.body);
            return originalSend.call(this, data);
        };

        // Continue to next middleware
        next();
    };
};

/**
 * Log audit entry to database
 */
async function logAudit(auditEntry, responseData, requestBody) {
    try {
        // Determine action type based on method and status
        let action = AuditAction.VIEW;
        if (auditEntry.method === 'POST') action = AuditAction.CREATE;
        else if (auditEntry.method === 'PUT' || auditEntry.method === 'PATCH') action = AuditAction.UPDATE;
        else if (auditEntry.method === 'DELETE') action = AuditAction.DELETE;

        // Extract table and record from path
        const pathParts = auditEntry.path.split('/').filter(Boolean);
        const tableName = pathParts[1] || 'unknown'; // e.g., /api/users/123 -> users
        const recordId = pathParts[2] || 'N/A';

        // Sanitize sensitive data
        const sanitizedRequestBody = sanitizeData(requestBody);
        const sanitizedResponseData = sanitizeData(responseData);

        // Create audit trail entry
        const query = `
            INSERT INTO audit_trails (
                table_name, record_id, action, user_id, user_role,
                ip_address, user_agent, old_values, new_values,
                session_id, request_id, duration_ms, status, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        const values = [
            tableName,
            recordId,
            action,
            auditEntry.userId,
            auditEntry.userRole,
            auditEntry.ipAddress,
            auditEntry.userAgent,
            action === AuditAction.UPDATE || action === AuditAction.DELETE ? sanitizedRequestBody : null,
            action === AuditAction.CREATE || action === AuditAction.UPDATE ? sanitizedResponseData : null,
            auditEntry.sessionId,
            auditEntry.requestId,
            auditEntry.responseTime,
            auditEntry.responseStatus < 400 ? 'success' : 'error',
            auditEntry.responseStatus >= 400 ? sanitizedResponseData?.error || 'Request failed' : null
        ];

        await db.query(query, values);

        // Log to activity feed for important actions
        if (shouldLogToActivityFeed(action, auditEntry.responseStatus)) {
            await logToActivityFeed(auditEntry, action, tableName, recordId);
        }

    } catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw - audit logging should not break the application
    }
}

/**
 * Log to activity feed for user-visible activities
 */
async function logToActivityFeed(auditEntry, action, tableName, recordId) {
    try {
        const query = `
            INSERT INTO activity_feed (
                actor_id, action, object_type, object_id,
                description, visibility, importance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        const description = generateActivityDescription(action, tableName);
        const importance = getActivityImportance(action);

        await db.query(query, [
            auditEntry.userId,
            action.toLowerCase(),
            tableName,
            recordId,
            description,
            'public',
            importance
        ]);
    } catch (error) {
        console.error('Failed to log to activity feed:', error);
    }
}

/**
 * Specific audit loggers for critical operations
 */
const auditLogin = async (userId, success, ipAddress, userAgent, reason = null) => {
    try {
        const action = success ? AuditAction.LOGIN : AuditAction.FAILED_AUTH;
        const query = `
            INSERT INTO audit_trails (
                table_name, record_id, action, user_id, 
                ip_address, user_agent, status, error_message
            ) VALUES ('users', $1, $2, $3, $4, $5, $6, $7)
        `;

        await db.query(query, [
            userId,
            action,
            userId,
            ipAddress,
            userAgent,
            success ? 'success' : 'error',
            reason
        ]);

        // Update user last login if successful
        if (success) {
            await db.query(
                'UPDATE users SET last_login = NOW() WHERE user_id = $1',
                [userId]
            );
        }
    } catch (error) {
        console.error('Failed to audit login:', error);
    }
};

const auditDataExport = async (userId, dataType, recordCount, format) => {
    try {
        const query = `
            INSERT INTO audit_trails (
                table_name, record_id, action, user_id,
                new_values, status
            ) VALUES ($1, $2, $3, $4, $5, 'success')
        `;

        await db.query(query, [
            dataType,
            `export_${Date.now()}`,
            AuditAction.EXPORT,
            userId,
            JSON.stringify({ recordCount, format, timestamp: new Date() })
        ]);
    } catch (error) {
        console.error('Failed to audit data export:', error);
    }
};

const auditPermissionDenied = async (userId, resource, action, reason) => {
    try {
        const query = `
            INSERT INTO audit_trails (
                table_name, record_id, action, user_id,
                error_message, status
            ) VALUES ($1, $2, $3, $4, $5, 'error')
        `;

        await db.query(query, [
            resource,
            'N/A',
            AuditAction.PERMISSION_DENIED,
            userId,
            reason
        ]);

        // Send notification to admin for repeated permission denials
        const recentDenialsQuery = `
            SELECT COUNT(*) as count FROM audit_trails
            WHERE user_id = $1 
              AND action = $2
              AND created_at >= NOW() - INTERVAL '1 hour'
        `;

        const result = await db.query(recentDenialsQuery, [userId, AuditAction.PERMISSION_DENIED]);
        
        if (result.rows[0].count >= 5) {
            // Create security alert
            await createSecurityAlert(userId, 'Multiple permission denial attempts detected');
        }
    } catch (error) {
        console.error('Failed to audit permission denied:', error);
    }
};

/**
 * Helper functions
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
}

function sanitizeData(data) {
    if (!data) return null;
    
    const sensitiveFields = [
        'password', 'token', 'secret', 'apiKey', 'creditCard',
        'ssn', 'pin', 'cvv', 'accountNumber'
    ];
    
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

function shouldLogToActivityFeed(action, status) {
    // Log successful modifications and important events
    return status < 400 && [
        AuditAction.CREATE,
        AuditAction.UPDATE,
        AuditAction.DELETE,
        AuditAction.LOGIN
    ].includes(action);
}

function generateActivityDescription(action, tableName) {
    const descriptions = {
        [AuditAction.CREATE]: `Created new ${tableName.slice(0, -1)}`,
        [AuditAction.UPDATE]: `Updated ${tableName.slice(0, -1)}`,
        [AuditAction.DELETE]: `Deleted ${tableName.slice(0, -1)}`,
        [AuditAction.LOGIN]: 'User logged in',
        [AuditAction.LOGOUT]: 'User logged out'
    };
    
    return descriptions[action] || `Performed ${action} on ${tableName}`;
}

function getActivityImportance(action) {
    const importance = {
        [AuditAction.DELETE]: 'high',
        [AuditAction.CREATE]: 'normal',
        [AuditAction.UPDATE]: 'normal',
        [AuditAction.LOGIN]: 'low',
        [AuditAction.LOGOUT]: 'low'
    };
    
    return importance[action] || 'normal';
}

async function createSecurityAlert(userId, message) {
    try {
        // Create notification for all super admins
        const query = `
            INSERT INTO notifications (user_id, title, message, type, priority, category)
            SELECT user_id, 'Security Alert', $1, 'error', 'urgent', 'security'
            FROM users WHERE role = 'super_admin'
        `;
        
        await db.query(query, [`User ${userId}: ${message}`]);
    } catch (error) {
        console.error('Failed to create security alert:', error);
    }
}

/**
 * Audit report generation
 */
const generateAuditReport = async (filters = {}) => {
    try {
        const { startDate, endDate, userId, action, tableName } = filters;
        
        let query = `
            SELECT 
                at.*,
                u.name as user_name,
                u.email as user_email
            FROM audit_trails at
            LEFT JOIN users u ON at.user_id = u.user_id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        if (startDate) {
            query += ` AND at.created_at >= $${paramIndex++}`;
            params.push(startDate);
        }
        
        if (endDate) {
            query += ` AND at.created_at <= $${paramIndex++}`;
            params.push(endDate);
        }
        
        if (userId) {
            query += ` AND at.user_id = $${paramIndex++}`;
            params.push(userId);
        }
        
        if (action) {
            query += ` AND at.action = $${paramIndex++}`;
            params.push(action);
        }
        
        if (tableName) {
            query += ` AND at.table_name = $${paramIndex++}`;
            params.push(tableName);
        }
        
        query += ` ORDER BY at.created_at DESC LIMIT 1000`;
        
        const result = await db.query(query, params);
        
        // Generate summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT DATE(created_at)) as days_covered,
                AVG(duration_ms) as avg_response_time,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
            FROM audit_trails
            WHERE created_at >= $1 AND created_at <= $2
        `;
        
        const summary = await db.query(summaryQuery, [
            startDate || '1900-01-01',
            endDate || '2100-01-01'
        ]);
        
        return {
            summary: summary.rows[0],
            events: result.rows
        };
    } catch (error) {
        console.error('Failed to generate audit report:', error);
        throw error;
    }
};

module.exports = {
    auditMiddleware,
    auditLogin,
    auditDataExport,
    auditPermissionDenied,
    generateAuditReport,
    AuditLevel,
    AuditAction
};
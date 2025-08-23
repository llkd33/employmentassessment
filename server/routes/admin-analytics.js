const express = require('express');
const router = express.Router();
const db = require('../../database/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { apiResponse, apiError } = require('../utils/apiResponse');

// Middleware
router.use(authenticateToken);
router.use(authorizeRole(['super_admin', 'company_admin']));

// Get comprehensive dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.getDashboardStats();
        
        // Calculate trends
        const trendsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '30 days') as new_companies_30d,
                (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as new_companies_prev_30d,
                (SELECT COUNT(*) FROM users WHERE registration_date >= NOW() - INTERVAL '30 days') as new_users_30d,
                (SELECT COUNT(*) FROM users WHERE registration_date >= NOW() - INTERVAL '60 days' AND registration_date < NOW() - INTERVAL '30 days') as new_users_prev_30d,
                (SELECT COUNT(*) FROM test_results WHERE test_date >= NOW() - INTERVAL '30 days') as tests_30d,
                (SELECT COUNT(*) FROM test_results WHERE test_date >= NOW() - INTERVAL '60 days' AND test_date < NOW() - INTERVAL '30 days') as tests_prev_30d,
                (SELECT AVG(overall_score) FROM test_results WHERE test_date >= NOW() - INTERVAL '30 days') as avg_score_30d,
                (SELECT AVG(overall_score) FROM test_results WHERE test_date >= NOW() - INTERVAL '60 days' AND test_date < NOW() - INTERVAL '30 days') as avg_score_prev_30d
        `;
        
        const trends = await db.query(trendsQuery);
        const trend = trends.rows[0];
        
        // Calculate percentage changes
        const calculateChange = (current, previous) => {
            if (!previous || previous === 0) return 0;
            return Math.round(((current - previous) / previous) * 100);
        };
        
        const enhancedStats = {
            ...stats,
            trends: {
                companies: calculateChange(trend.new_companies_30d, trend.new_companies_prev_30d),
                users: calculateChange(trend.new_users_30d, trend.new_users_prev_30d),
                tests: calculateChange(trend.tests_30d, trend.tests_prev_30d),
                avgScore: calculateChange(trend.avg_score_30d, trend.avg_score_prev_30d)
            },
            realTimeMetrics: {
                activeNow: await getActiveUsersCount(),
                testsToday: await getTodaysTestCount(),
                newUsersToday: await getTodaysNewUsers()
            }
        };
        
        return apiResponse(res, 'Dashboard stats retrieved', enhancedStats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return apiError(res, 'Failed to fetch dashboard stats', 500);
    }
});

// Get user growth data
router.get('/growth/:period', async (req, res) => {
    try {
        const { period } = req.params; // 7, 30, 90 days
        const days = parseInt(period) || 30;
        
        const query = `
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '${days} days',
                    CURRENT_DATE,
                    '1 day'::interval
                )::date AS date
            )
            SELECT 
                ds.date,
                COALESCE(COUNT(DISTINCT u.user_id), 0) as new_users,
                COALESCE(COUNT(DISTINCT t.user_id), 0) as active_users,
                COALESCE(COUNT(t.test_id), 0) as tests_completed
            FROM date_series ds
            LEFT JOIN users u ON DATE(u.registration_date) = ds.date
            LEFT JOIN test_results t ON DATE(t.test_date) = ds.date
            GROUP BY ds.date
            ORDER BY ds.date ASC
        `;
        
        const result = await db.query(query);
        
        return apiResponse(res, 'Growth data retrieved', result.rows);
    } catch (error) {
        console.error('Error fetching growth data:', error);
        return apiError(res, 'Failed to fetch growth data', 500);
    }
});

// Get performance distribution
router.get('/performance-distribution', async (req, res) => {
    try {
        const query = `
            SELECT 
                CASE 
                    WHEN overall_score >= 90 THEN 'Excellent'
                    WHEN overall_score >= 70 THEN 'Good'
                    WHEN overall_score >= 50 THEN 'Average'
                    ELSE 'Below Average'
                END as category,
                COUNT(*) as count,
                ROUND(AVG(overall_score), 2) as avg_score
            FROM test_results
            WHERE test_date >= NOW() - INTERVAL '30 days'
            GROUP BY category
            ORDER BY avg_score DESC
        `;
        
        const result = await db.query(query);
        
        return apiResponse(res, 'Performance distribution retrieved', result.rows);
    } catch (error) {
        console.error('Error fetching performance distribution:', error);
        return apiError(res, 'Failed to fetch performance distribution', 500);
    }
});

// Get competency analysis
router.get('/competency-analysis', async (req, res) => {
    try {
        const { companyId } = req.query;
        
        let query = `
            SELECT 
                ROUND(AVG(problem_solving), 2) as problem_solving,
                ROUND(AVG(communication), 2) as communication,
                ROUND(AVG(leadership), 2) as leadership,
                ROUND(AVG(adaptability), 2) as adaptability,
                ROUND(AVG(technical_knowledge), 2) as technical_knowledge,
                COUNT(DISTINCT user_id) as sample_size
            FROM test_results
            WHERE 1=1
        `;
        
        const params = [];
        if (companyId) {
            query += ` AND user_id IN (SELECT user_id FROM users WHERE company_id = $1)`;
            params.push(companyId);
        }
        
        const result = await db.query(query, params);
        
        // Get industry benchmarks
        const benchmarkQuery = `
            SELECT 
                ROUND(AVG(problem_solving), 2) as problem_solving,
                ROUND(AVG(communication), 2) as communication,
                ROUND(AVG(leadership), 2) as leadership,
                ROUND(AVG(adaptability), 2) as adaptability,
                ROUND(AVG(technical_knowledge), 2) as technical_knowledge
            FROM test_results
        `;
        
        const benchmark = await db.query(benchmarkQuery);
        
        return apiResponse(res, 'Competency analysis retrieved', {
            current: result.rows[0],
            benchmark: benchmark.rows[0]
        });
    } catch (error) {
        console.error('Error fetching competency analysis:', error);
        return apiError(res, 'Failed to fetch competency analysis', 500);
    }
});

// Get activity feed
router.get('/activities', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        
        const query = `
            SELECT 
                af.*,
                u.name as actor_name,
                u.profile_image_url as actor_avatar
            FROM activity_feed af
            LEFT JOIN users u ON af.actor_id = u.user_id
            ORDER BY af.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        
        const result = await db.query(query, [limit, offset]);
        
        // Transform activities for frontend
        const activities = result.rows.map(activity => ({
            id: activity.id,
            type: getActivityType(activity.action),
            action: activity.action,
            title: formatActivityTitle(activity),
            description: activity.description,
            timestamp: activity.created_at,
            actor: {
                id: activity.actor_id,
                name: activity.actor_name,
                avatar: activity.actor_avatar
            },
            metadata: activity.metadata
        }));
        
        return apiResponse(res, 'Activities retrieved', activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        return apiError(res, 'Failed to fetch activities', 500);
    }
});

// Get system metrics
router.get('/metrics', async (req, res) => {
    try {
        // Simulate system metrics (in production, get from monitoring service)
        const metrics = {
            serverLoad: Math.random() * 100,
            memoryUsage: Math.random() * 100,
            databaseLoad: Math.random() * 100,
            apiResponseTime: Math.floor(Math.random() * 500),
            activeConnections: Math.floor(Math.random() * 1000),
            errorRate: Math.random() * 5,
            uptime: 99.9,
            diskUsage: Math.random() * 100
        };
        
        // Store metrics for historical tracking
        const storeMetricsQuery = `
            INSERT INTO system_metrics (metric_type, metric_name, metric_value, metric_unit)
            VALUES 
                ('performance', 'server_load', $1, 'percent'),
                ('performance', 'memory_usage', $2, 'percent'),
                ('performance', 'database_load', $3, 'percent'),
                ('performance', 'api_response_time', $4, 'ms')
        `;
        
        await db.query(storeMetricsQuery, [
            metrics.serverLoad,
            metrics.memoryUsage,
            metrics.databaseLoad,
            metrics.apiResponseTime
        ]);
        
        return apiResponse(res, 'System metrics retrieved', metrics);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return apiError(res, 'Failed to fetch metrics', 500);
    }
});

// Get notifications for admin
router.get('/notifications', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { unreadOnly = false } = req.query;
        
        let query = `
            SELECT * FROM notifications
            WHERE user_id = $1
        `;
        
        if (unreadOnly === 'true') {
            query += ` AND is_read = false`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT 20`;
        
        const result = await db.query(query, [userId]);
        
        return apiResponse(res, 'Notifications retrieved', result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return apiError(res, 'Failed to fetch notifications', 500);
    }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        const query = `
            UPDATE notifications 
            SET is_read = true, read_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        
        const result = await db.query(query, [id, userId]);
        
        if (result.rows.length === 0) {
            return apiError(res, 'Notification not found', 404);
        }
        
        return apiResponse(res, 'Notification marked as read', result.rows[0]);
    } catch (error) {
        console.error('Error updating notification:', error);
        return apiError(res, 'Failed to update notification', 500);
    }
});

// Create announcement
router.post('/announcements', authorizeRole(['super_admin']), async (req, res) => {
    try {
        const { title, content, type = 'info', targetRoles, targetCompanies, showUntil } = req.body;
        const createdBy = req.user.userId;
        
        const query = `
            INSERT INTO announcements (
                title, content, type, target_roles, target_companies, 
                show_until, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            title, content, type, targetRoles, targetCompanies, showUntil, createdBy
        ]);
        
        // Create notifications for affected users
        const notifyQuery = `
            INSERT INTO notifications (user_id, title, message, type, category)
            SELECT DISTINCT u.user_id, $1, $2, 'info', 'announcement'
            FROM users u
            WHERE ($3::text[] IS NULL OR u.role = ANY($3::text[]))
              AND ($4::integer[] IS NULL OR u.company_id = ANY($4::integer[]))
        `;
        
        await db.query(notifyQuery, [title, content, targetRoles, targetCompanies]);
        
        return apiResponse(res, 'Announcement created', result.rows[0]);
    } catch (error) {
        console.error('Error creating announcement:', error);
        return apiError(res, 'Failed to create announcement', 500);
    }
});

// Helper functions
async function getActiveUsersCount() {
    const query = `
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE is_active = true 
          AND last_activity >= NOW() - INTERVAL '5 minutes'
    `;
    const result = await db.query(query);
    return result.rows[0]?.count || 0;
}

async function getTodaysTestCount() {
    const query = `
        SELECT COUNT(*) as count
        FROM test_results
        WHERE DATE(test_date) = CURRENT_DATE
    `;
    const result = await db.query(query);
    return result.rows[0]?.count || 0;
}

async function getTodaysNewUsers() {
    const query = `
        SELECT COUNT(*) as count
        FROM users
        WHERE DATE(registration_date) = CURRENT_DATE
    `;
    const result = await db.query(query);
    return result.rows[0]?.count || 0;
}

function getActivityType(action) {
    const typeMap = {
        'create': 'success',
        'update': 'info',
        'delete': 'error',
        'approve': 'success',
        'reject': 'warning',
        'login': 'info'
    };
    return typeMap[action] || 'info';
}

function formatActivityTitle(activity) {
    const templates = {
        'create': `Created new ${activity.object_type}`,
        'update': `Updated ${activity.object_type}`,
        'delete': `Deleted ${activity.object_type}`,
        'approve': `Approved ${activity.object_type}`,
        'reject': `Rejected ${activity.object_type}`,
        'login': `User logged in`
    };
    
    return templates[activity.action] || activity.action;
}

module.exports = router;
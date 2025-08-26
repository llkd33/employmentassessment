const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create or update feedback for a test result
router.post('/feedback/:resultId', authenticateToken, requireAdmin, async (req, res) => {
    const { resultId } = req.params;
    const {
        overall_feedback,
        overall_rating,
        competencies
    } = req.body;
    const adminId = req.user.userId;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get test result and user info
        const resultQuery = await client.query(`
            SELECT tr.*, u.company_id, u.name as user_name, u.email as user_email
            FROM test_results tr
            JOIN users u ON tr.user_id = u.user_id
            WHERE tr.result_id = $1
        `, [resultId]);
        
        if (resultQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Test result not found' });
        }
        
        const testResult = resultQuery.rows[0];
        
        // Check if admin has permission (same company or super admin)
        const adminQuery = await client.query(`
            SELECT company_id, role FROM users WHERE user_id = $1
        `, [adminId]);
        
        const admin = adminQuery.rows[0];
        if (admin.role !== 'super_admin' && admin.company_id !== testResult.company_id) {
            return res.status(403).json({ error: 'Not authorized to provide feedback for this user' });
        }
        
        // Check if feedback already exists
        const existingFeedback = await client.query(`
            SELECT id FROM test_feedback WHERE result_id = $1
        `, [resultId]);
        
        let feedbackId;
        
        if (existingFeedback.rows.length > 0) {
            // Update existing feedback
            feedbackId = existingFeedback.rows[0].id;
            await client.query(`
                UPDATE test_feedback 
                SET overall_feedback = $1, overall_rating = $2, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [overall_feedback, overall_rating, feedbackId]);
            
            // Delete existing competency feedback to replace
            await client.query(`
                DELETE FROM competency_feedback WHERE feedback_id = $1
            `, [feedbackId]);
        } else {
            // Create new feedback
            const insertResult = await client.query(`
                INSERT INTO test_feedback (
                    result_id, user_id, admin_id, company_id,
                    overall_feedback, overall_rating
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [
                resultId,
                testResult.user_id,
                adminId,
                testResult.company_id,
                overall_feedback,
                overall_rating
            ]);
            feedbackId = insertResult.rows[0].id;
        }
        
        // Insert competency feedback
        if (competencies && Array.isArray(competencies)) {
            for (const comp of competencies) {
                await client.query(`
                    INSERT INTO competency_feedback (
                        feedback_id, competency_type, score,
                        feedback, strengths, improvements, action_items
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    feedbackId,
                    comp.type,
                    comp.score,
                    comp.feedback,
                    comp.strengths,
                    comp.improvements,
                    comp.action_items
                ]);
            }
        }
        
        // Create notification for user
        await client.query(`
            INSERT INTO feedback_notifications (
                feedback_id, user_id, notification_type
            ) VALUES ($1, $2, 'new_feedback')
        `, [feedbackId, testResult.user_id]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Feedback saved successfully',
            feedbackId
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    } finally {
        client.release();
    }
});

// Get feedback for a specific test result
router.get('/feedback/:resultId', authenticateToken, async (req, res) => {
    const { resultId } = req.params;
    const userId = req.user.userId;
    
    try {
        // Get main feedback
        const feedbackQuery = await pool.query(`
            SELECT 
                tf.*,
                u.name as admin_name,
                u.email as admin_email
            FROM test_feedback tf
            LEFT JOIN users u ON tf.admin_id = u.user_id
            WHERE tf.result_id = $1
        `, [resultId]);
        
        if (feedbackQuery.rows.length === 0) {
            return res.json({ feedback: null });
        }
        
        const feedback = feedbackQuery.rows[0];
        
        // Check if user has permission to view
        const userQuery = await pool.query(`
            SELECT role, company_id FROM users WHERE user_id = $1
        `, [userId]);
        
        const user = userQuery.rows[0];
        const isAdmin = ['company_admin', 'hr_manager', 'super_admin'].includes(user.role);
        const isSameCompany = user.company_id === feedback.company_id;
        const isOwner = userId === feedback.user_id;
        
        if (!isOwner && !(isAdmin && isSameCompany) && user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Not authorized to view this feedback' });
        }
        
        // Get competency feedback
        const competenciesQuery = await pool.query(`
            SELECT * FROM competency_feedback 
            WHERE feedback_id = $1
            ORDER BY competency_type
        `, [feedback.id]);
        
        // Mark as read if user is the feedback recipient
        if (isOwner && !feedback.is_read) {
            await pool.query(`
                UPDATE test_feedback SET is_read = TRUE 
                WHERE id = $1
            `, [feedback.id]);
            
            // Mark notification as read
            await pool.query(`
                UPDATE feedback_notifications 
                SET is_read = TRUE 
                WHERE feedback_id = $1 AND user_id = $2
            `, [feedback.id, userId]);
        }
        
        res.json({
            feedback: {
                ...feedback,
                competencies: competenciesQuery.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Get all feedback for a user
router.get('/user/:userId/feedback', authenticateToken, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = req.user.userId;
    const { limit = 10, offset = 0 } = req.query;
    
    try {
        // Check admin permission
        const adminQuery = await pool.query(`
            SELECT company_id, role FROM users WHERE user_id = $1
        `, [adminId]);
        
        const userQuery = await pool.query(`
            SELECT company_id FROM users WHERE user_id = $1
        `, [userId]);
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const admin = adminQuery.rows[0];
        const user = userQuery.rows[0];
        
        if (admin.role !== 'super_admin' && admin.company_id !== user.company_id) {
            return res.status(403).json({ error: 'Not authorized to view feedback for this user' });
        }
        
        // Get all feedback for user
        const feedbackQuery = await pool.query(`
            SELECT 
                tf.*,
                tr.overall_score,
                tr.test_date,
                u.name as admin_name
            FROM test_feedback tf
            JOIN test_results tr ON tf.result_id = tr.result_id
            LEFT JOIN users u ON tf.admin_id = u.user_id
            WHERE tf.user_id = $1
            ORDER BY tf.created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        
        // Get total count
        const countQuery = await pool.query(`
            SELECT COUNT(*) as total 
            FROM test_feedback 
            WHERE user_id = $1
        `, [userId]);
        
        res.json({
            feedbacks: feedbackQuery.rows,
            total: parseInt(countQuery.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ error: 'Failed to fetch user feedback' });
    }
});

// Get feedback templates
router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
    const adminId = req.user.userId;
    const { competency_type, template_type } = req.query;
    
    try {
        // Get admin's company
        const adminQuery = await pool.query(`
            SELECT company_id FROM users WHERE user_id = $1
        `, [adminId]);
        
        const companyId = adminQuery.rows[0]?.company_id;
        
        let query = `
            SELECT * FROM feedback_templates 
            WHERE is_active = TRUE 
            AND (company_id IS NULL OR company_id = $1)
        `;
        const params = [companyId];
        
        if (competency_type) {
            params.push(competency_type);
            query += ` AND competency_type = $${params.length}`;
        }
        
        if (template_type) {
            params.push(template_type);
            query += ` AND template_type = $${params.length}`;
        }
        
        query += ' ORDER BY template_name';
        
        const templates = await pool.query(query, params);
        
        res.json({
            templates: templates.rows
        });
        
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Create custom feedback template
router.post('/templates', authenticateToken, requireAdmin, async (req, res) => {
    const adminId = req.user.userId;
    const {
        template_name,
        competency_type,
        score_range_min,
        score_range_max,
        template_text,
        template_type
    } = req.body;
    
    try {
        // Get admin's company
        const adminQuery = await pool.query(`
            SELECT company_id FROM users WHERE user_id = $1
        `, [adminId]);
        
        const companyId = adminQuery.rows[0]?.company_id;
        
        const result = await pool.query(`
            INSERT INTO feedback_templates (
                company_id, admin_id, template_name, competency_type,
                score_range_min, score_range_max, template_text, template_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            companyId,
            adminId,
            template_name,
            competency_type,
            score_range_min,
            score_range_max,
            template_text,
            template_type
        ]);
        
        res.json({
            success: true,
            template: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// Get user's unread feedback notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const notifications = await pool.query(`
            SELECT 
                fn.*,
                tf.overall_rating,
                tf.created_at as feedback_date,
                tr.overall_score,
                u.name as admin_name
            FROM feedback_notifications fn
            JOIN test_feedback tf ON fn.feedback_id = tf.id
            JOIN test_results tr ON tf.result_id = tr.result_id
            LEFT JOIN users u ON tf.admin_id = u.user_id
            WHERE fn.user_id = $1 AND fn.is_read = FALSE
            ORDER BY fn.created_at DESC
        `, [userId]);
        
        res.json({
            notifications: notifications.rows
        });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        await pool.query(`
            UPDATE feedback_notifications 
            SET is_read = TRUE 
            WHERE id = $1 AND user_id = $2
        `, [id, userId]);
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
        
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Get feedback statistics for a company
router.get('/company/:companyId/stats', authenticateToken, requireAdmin, async (req, res) => {
    const { companyId } = req.params;
    const adminId = req.user.userId;
    
    try {
        // Check admin permission
        const adminQuery = await pool.query(`
            SELECT company_id, role FROM users WHERE user_id = $1
        `, [adminId]);
        
        const admin = adminQuery.rows[0];
        if (admin.role !== 'super_admin' && admin.company_id !== parseInt(companyId)) {
            return res.status(403).json({ error: 'Not authorized to view company statistics' });
        }
        
        // Get feedback statistics
        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT tf.id) as total_feedbacks,
                COUNT(DISTINCT tf.user_id) as users_with_feedback,
                AVG(tf.overall_rating) as avg_rating,
                COUNT(CASE WHEN tf.is_read = FALSE THEN 1 END) as unread_feedbacks,
                COUNT(DISTINCT CASE WHEN tf.created_at >= NOW() - INTERVAL '7 days' THEN tf.id END) as recent_feedbacks
            FROM test_feedback tf
            WHERE tf.company_id = $1
        `, [companyId]);
        
        // Get competency breakdown
        const competencyStats = await pool.query(`
            SELECT 
                cf.competency_type,
                AVG(cf.score) as avg_score,
                COUNT(*) as feedback_count
            FROM competency_feedback cf
            JOIN test_feedback tf ON cf.feedback_id = tf.id
            WHERE tf.company_id = $1
            GROUP BY cf.competency_type
        `, [companyId]);
        
        res.json({
            stats: stats.rows[0],
            competencyBreakdown: competencyStats.rows
        });
        
    } catch (error) {
        console.error('Error fetching company stats:', error);
        res.status(500).json({ error: 'Failed to fetch company statistics' });
    }
});

module.exports = router;
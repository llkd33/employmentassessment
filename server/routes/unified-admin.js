const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 관리자 프로필 정보
router.get('/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    
    try {
        const result = await pool.query(`
            SELECT user_id, name, email, role, company_id, department, position
            FROM users 
            WHERE user_id = $1
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 시스템 통계 (Super Admin)
router.get('/system-stats', authenticateToken, async (req, res) => {
    const userRole = req.user.role;
    
    if (!['super_admin', 'sys_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
        const stats = {};
        
        // 전체 사용자 수
        const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        stats.totalUsers = parseInt(usersResult.rows[0].count);
        
        // 전체 기업 수
        const companiesResult = await pool.query('SELECT COUNT(*) as count FROM companies');
        stats.totalCompanies = parseInt(companiesResult.rows[0].count);
        
        // 완료된 테스트 수
        const testsResult = await pool.query('SELECT COUNT(*) as count FROM test_results');
        stats.totalTests = parseInt(testsResult.rows[0].count);
        
        // 피드백 수
        const feedbackResult = await pool.query('SELECT COUNT(*) as count FROM test_feedback');
        stats.totalFeedback = parseInt(feedbackResult.rows[0].count);
        
        // 평균 점수
        const avgScoreResult = await pool.query('SELECT AVG(overall_score) as avg FROM test_results');
        stats.avgScore = Math.round(avgScoreResult.rows[0].avg || 0);
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 회사 통계 (Company Admin)
router.get('/company-stats', authenticateToken, async (req, res) => {
    const companyId = req.user.companyId;
    
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID not found' });
    }
    
    try {
        const stats = {};
        
        // 회사 사용자 수
        const usersResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
            [companyId]
        );
        stats.totalUsers = parseInt(usersResult.rows[0].count);
        
        // 완료된 테스트 수
        const testsResult = await pool.query(`
            SELECT COUNT(*) as count 
            FROM test_results tr
            JOIN users u ON tr.user_id = u.user_id
            WHERE u.company_id = $1
        `, [companyId]);
        stats.totalTests = parseInt(testsResult.rows[0].count);
        
        // 피드백 수
        const feedbackResult = await pool.query(`
            SELECT COUNT(*) as count 
            FROM test_feedback 
            WHERE company_id = $1
        `, [companyId]);
        stats.totalFeedback = parseInt(feedbackResult.rows[0].count);
        
        // 평균 점수
        const avgScoreResult = await pool.query(`
            SELECT AVG(tr.overall_score) as avg 
            FROM test_results tr
            JOIN users u ON tr.user_id = u.user_id
            WHERE u.company_id = $1
        `, [companyId]);
        stats.avgScore = Math.round(avgScoreResult.rows[0].avg || 0);
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching company stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 기업 목록 (Super Admin)
router.get('/companies', authenticateToken, async (req, res) => {
    const userRole = req.user.role;
    
    if (!['super_admin', 'sys_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                COUNT(DISTINCT u.user_id) as employee_count
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 직원 목록 (Company Admin)
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
    const companyId = req.user.companyId;
    const userRole = req.user.role;
    
    try {
        let query;
        let params = [];
        
        if (['super_admin', 'sys_admin'].includes(userRole)) {
            // Super admin은 모든 직원 조회
            query = `
                SELECT 
                    u.*,
                    c.name as company_name,
                    COUNT(tr.result_id) > 0 as test_completed
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                LEFT JOIN test_results tr ON u.user_id = tr.user_id
                GROUP BY u.user_id, c.id, c.name
                ORDER BY u.created_at DESC
            `;
        } else {
            // Company admin은 자기 회사 직원만 조회
            query = `
                SELECT 
                    u.*,
                    COUNT(tr.result_id) > 0 as test_completed
                FROM users u
                LEFT JOIN test_results tr ON u.user_id = tr.user_id
                WHERE u.company_id = $1
                GROUP BY u.user_id
                ORDER BY u.created_at DESC
            `;
            params = [companyId];
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 테스트 결과 목록
router.get('/test-results', authenticateToken, requireAdmin, async (req, res) => {
    const companyId = req.user.companyId;
    const userRole = req.user.role;
    
    try {
        let query;
        let params = [];
        
        if (['super_admin', 'sys_admin'].includes(userRole)) {
            // Super admin은 모든 결과 조회
            query = `
                SELECT 
                    tr.*,
                    u.name as user_name,
                    u.email as user_email,
                    c.name as company_name,
                    COUNT(tf.id) > 0 as has_feedback
                FROM test_results tr
                JOIN users u ON tr.user_id = u.user_id
                LEFT JOIN companies c ON u.company_id = c.id
                LEFT JOIN test_feedback tf ON tr.result_id = tf.result_id
                GROUP BY tr.result_id, u.user_id, u.name, u.email, c.id, c.name
                ORDER BY tr.test_date DESC
            `;
        } else {
            // Company admin은 자기 회사 결과만 조회
            query = `
                SELECT 
                    tr.*,
                    u.name as user_name,
                    u.email as user_email,
                    COUNT(tf.id) > 0 as has_feedback
                FROM test_results tr
                JOIN users u ON tr.user_id = u.user_id
                LEFT JOIN test_feedback tf ON tr.result_id = tf.result_id
                WHERE u.company_id = $1
                GROUP BY tr.result_id, u.user_id, u.name, u.email
                ORDER BY tr.test_date DESC
            `;
            params = [companyId];
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching test results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 기업 추가 (Super Admin)
router.post('/companies', authenticateToken, async (req, res) => {
    const userRole = req.user.role;
    
    if (!['super_admin', 'sys_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, domain, admin_email, admin_name, admin_password } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 기업 생성
        const companyResult = await client.query(`
            INSERT INTO companies (name, domain, is_active)
            VALUES ($1, $2, true)
            RETURNING id
        `, [name, domain]);
        
        const companyId = companyResult.rows[0].id;
        
        // 관리자 계정 생성
        if (admin_email && admin_name && admin_password) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(admin_password, 10);
            
            await client.query(`
                INSERT INTO users (
                    user_id, name, email, password, role, 
                    company_id, is_email_verified
                ) VALUES (
                    'admin_' || gen_random_uuid(),
                    $1, $2, $3, 'company_admin', $4, true
                )
            `, [admin_name, admin_email, hashedPassword, companyId]);
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            companyId,
            message: '기업이 성공적으로 추가되었습니다.'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating company:', error);
        res.status(500).json({ error: 'Failed to create company' });
    } finally {
        client.release();
    }
});

// 기업 상태 토글 (Super Admin)
router.put('/companies/:id/toggle', authenticateToken, async (req, res) => {
    const userRole = req.user.role;
    
    if (!['super_admin', 'sys_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const companyId = req.params.id;
    
    try {
        await pool.query(`
            UPDATE companies 
            SET is_active = NOT is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [companyId]);
        
        res.json({ success: true, message: '기업 상태가 변경되었습니다.' });
        
    } catch (error) {
        console.error('Error toggling company status:', error);
        res.status(500).json({ error: 'Failed to update company status' });
    }
});

// 특정 사용자의 테스트 결과 조회
router.get('/user/:userId/test-results', authenticateToken, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = req.user.userId;
    const adminRole = req.user.role;
    const adminCompanyId = req.user.companyId;
    
    try {
        // 사용자 정보 조회
        const userQuery = await pool.query(`
            SELECT company_id, name, email 
            FROM users 
            WHERE user_id = $1
        `, [userId]);
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userQuery.rows[0];
        
        // 권한 확인 - super admin이 아니면 같은 회사만 조회 가능
        if (!['super_admin', 'sys_admin'].includes(adminRole)) {
            if (user.company_id !== adminCompanyId) {
                return res.status(403).json({ error: 'Not authorized to view this user\'s results' });
            }
        }
        
        // 테스트 결과 조회
        const resultsQuery = await pool.query(`
            SELECT 
                tr.*,
                tf.id as feedback_id,
                tf.overall_rating as feedback_rating,
                tf.is_read as feedback_read
            FROM test_results tr
            LEFT JOIN test_feedback tf ON tr.result_id = tf.result_id
            WHERE tr.user_id = $1
            ORDER BY tr.test_date DESC
        `, [userId]);
        
        res.json(resultsQuery.rows);
        
    } catch (error) {
        console.error('Error fetching user test results:', error);
        res.status(500).json({ error: 'Failed to fetch test results' });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { 
    generateAdminToken, 
    authenticateAdmin, 
    requireSuperAdmin,
    requirePermission,
    logAdminActivity,
    adminPermissions
} = require('../middleware/adminAuth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 어드민 로그인
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        if (!username || !password) {
            return res.status(400).json({ 
                error: '아이디와 비밀번호를 입력해주세요.' 
            });
        }
        
        // 어드민 계정 조회
        const result = await pool.query(
            'SELECT * FROM admin WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        const admin = result.rows[0];
        
        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        // 마지막 로그인 시간 업데이트
        await pool.query(
            'UPDATE admin SET last_login = NOW() WHERE id = $1',
            [admin.id]
        );
        
        // 토큰 생성
        const token = generateAdminToken(admin);
        
        // 권한 정보 가져오기
        const permissions = adminPermissions[admin.role] || [];
        
        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                admin_type: admin.admin_type || 'sys_admin',
                permissions,
                lastLogin: admin.last_login
            }
        });
        
    } catch (error) {
        console.error('어드민 로그인 오류:', error);
        res.status(500).json({ 
            error: '로그인 처리 중 오류가 발생했습니다.' 
        });
    }
});

// 대시보드 통계 (시스템 어드민)
router.get('/stats', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM companies WHERE COALESCE(status,'active') <> 'deleted')::int AS total_companies,
                (SELECT COUNT(*) FROM users WHERE role = 'user')::int AS active_users,
                (SELECT COUNT(*) FROM test_results)::int AS tests_completed,
                COALESCE((SELECT ROUND(AVG(overall_score)::numeric, 0) FROM test_results), 0)::int AS avg_score,
                (SELECT COUNT(*) FROM users WHERE role = 'company_admin' AND COALESCE(is_approved,false) = false)::int AS pending_approvals
        `;
        const { rows } = await pool.query(statsQuery);
        const r = rows[0] || {};
        res.json({
            totalCompanies: r.total_companies || 0,
            activeUsers: r.active_users || 0,
            testsCompleted: r.tests_completed || 0,
            avgScore: r.avg_score || 0,
            pendingApprovals: r.pending_approvals || 0
        });
    } catch (error) {
        console.error('시스템 어드민 통계 조회 오류:', error);
        res.status(500).json({ error: '통계를 불러올 수 없습니다.' });
    }
});

// 활동 피드 (시스템 어드민)
router.get('/activities', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const { rows } = await pool.query(`
            SELECT admin_username, action, created_at 
            FROM admin_logs 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        const activities = rows.map(r => ({
            type: 'success',
            action: r.action,
            title: `${r.admin_username || 'system'} ${r.action}`,
            timestamp: r.created_at
        }));
        res.json(activities);
    } catch (error) {
        console.error('시스템 어드민 활동 조회 오류:', error);
        res.status(500).json({ error: '활동을 불러올 수 없습니다.' });
    }
});

// 시스템 메트릭 (시스템 어드민)
router.get('/metrics', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        // 가벼운 메트릭 샘플 (실환경에선 system_metrics 조회)
        const { rows: testCounts } = await pool.query(
            `SELECT DATE(test_date) as d, COUNT(*) as c 
             FROM test_results WHERE test_date >= NOW() - INTERVAL '7 days' 
             GROUP BY DATE(test_date) ORDER BY d DESC LIMIT 7`
        );
        res.json({ testsLast7Days: testCounts.reverse() });
    } catch (error) {
        console.error('시스템 어드민 메트릭 조회 오류:', error);
        res.status(500).json({ error: '메트릭을 불러올 수 없습니다.' });
    }
});

// ========================
// Super Admin: Companies
// ========================

// 기업 목록 조회 (집계 포함)
router.get('/companies', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('view_companies', '기업 목록 조회'),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    c.*,
                    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'user') as user_count,
                    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'company_admin') as admin_count
                FROM companies c
                LEFT JOIN users u ON c.id = u.company_id
                GROUP BY c.id
                ORDER BY c.status ASC, c.name ASC
            `);
            res.json({ companies: result.rows });
        } catch (error) {
            console.error('기업 목록 조회 오류(sys-admin):', error);
            res.status(500).json({ error: '기업 목록을 불러올 수 없습니다.' });
        }
    }
);

// 기업 추가
router.post('/companies', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('create_company', '기업 추가'),
    async (req, res) => {
        const { name, code, domain } = req.body;
        try {
            if (!name || !code) {
                return res.status(400).json({ error: '회사명과 코드는 필수입니다.' });
            }
            const result = await pool.query(
                `INSERT INTO companies (name, code, domain) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [name, code, domain]
            );
            res.status(201).json({ success: true, company: result.rows[0] });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: '이미 존재하는 회사 코드입니다.' });
            }
            console.error('기업 추가 오류(sys-admin):', error);
            res.status(500).json({ error: '기업 추가 중 오류가 발생했습니다.' });
        }
    }
);

// 기업 수정 (이름/도메인/상태)
router.patch('/companies/:id', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('update_company', '기업 정보 수정'),
    async (req, res) => {
        const { id } = req.params;
        const { name, domain, status } = req.body;
        try {
            const fields = [];
            const params = [];
            let idx = 1;
            if (name) { fields.push(`name = $${idx++}`); params.push(name); }
            if (domain !== undefined) { fields.push(`domain = $${idx++}`); params.push(domain || null); }
            if (status) { 
                if (!['active','inactive','deleted'].includes(status)) {
                    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
                }
                fields.push(`status = $${idx++}`); params.push(status);
                if (status === 'deleted') {
                    fields.push(`deleted_at = NOW()`);
                }
            }
            if (!fields.length) {
                return res.status(400).json({ error: '수정할 항목이 없습니다.' });
            }
            const query = `UPDATE companies SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
            params.push(id);
            const result = await pool.query(query, params);
            if (!result.rows.length) return res.status(404).json({ error: '회사를 찾을 수 없습니다.' });
            res.json({ success: true, company: result.rows[0] });
        } catch (error) {
            console.error('기업 수정 오류(sys-admin):', error);
            res.status(500).json({ error: '기업 수정 중 오류가 발생했습니다.' });
        }
    }
);

// 기업 삭제 (소프트 삭제)
router.delete('/companies/:id', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('soft_delete_company', '기업 소프트 삭제'),
    async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                `UPDATE companies 
                 SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND status <> 'deleted'
                 RETURNING *`,
                [id]
            );
            if (!result.rows.length) return res.status(404).json({ error: '이미 삭제되었거나 회사를 찾을 수 없습니다.' });
            res.json({ success: true, company: result.rows[0] });
        } catch (error) {
            console.error('기업 소프트 삭제 오류(sys-admin):', error);
            res.status(500).json({ error: '기업 삭제 중 오류가 발생했습니다.' });
        }
    }
);

// =============================
// Super Admin: Company Admins
// =============================

// 승인 대기 기업 관리자 목록
router.get('/company-admins/pending', 
    authenticateAdmin,
    requireSuperAdmin,
    logAdminActivity('view_pending_company_admins', '승인 대기 기업 관리자 조회'),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT u.id, u.user_id, u.email, u.name, u.company_id, u.created_at, u.is_approved,
                       c.name as company_name
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                WHERE u.role = 'company_admin' AND COALESCE(u.is_approved, false) = false
                ORDER BY u.created_at DESC
            `);
            res.json({ pendingAdmins: result.rows });
        } catch (error) {
            console.error('승인 대기 관리자 조회 오류(sys-admin):', error);
            res.status(500).json({ error: '승인 대기 목록을 불러올 수 없습니다.' });
        }
    }
);

// 기업 관리자 승인
router.post('/company-admins/:userId/approve', 
    authenticateAdmin,
    requireSuperAdmin,
    logAdminActivity('approve_company_admin', '기업 관리자 승인'),
    async (req, res) => {
        const { userId } = req.params;
        try {
            const update = await pool.query(
                `UPDATE users SET is_approved = true, updated_at = NOW()
                 WHERE user_id = $1 AND role = 'company_admin' AND COALESCE(is_approved,false) = false
                 RETURNING user_id, email, name, company_id`,
                [userId]
            );
            if (!update.rows.length) return res.status(404).json({ error: '승인할 관리자를 찾을 수 없습니다.' });
            res.json({ success: true, admin: update.rows[0] });
        } catch (error) {
            console.error('기업 관리자 승인 오류(sys-admin):', error);
            res.status(500).json({ error: '관리자 승인 중 오류가 발생했습니다.' });
        }
    }
);

// 기업 관리자 직권 생성 (즉시 승인)
router.post('/company-admins', 
    authenticateAdmin,
    requireSuperAdmin,
    logAdminActivity('create_company_admin', '기업 관리자 직권 생성'),
    async (req, res) => {
        const { email, name, password, companyId } = req.body;
        try {
            if (!email || !name || !companyId) {
                return res.status(400).json({ error: 'email, name, companyId는 필수입니다.' });
            }
            // 회사 확인
            const company = await pool.query('SELECT id, name FROM companies WHERE id = $1', [companyId]);
            if (!company.rows.length) return res.status(404).json({ error: '회사를 찾을 수 없습니다.' });

            // 이메일 중복 검사
            const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (dup.rows.length) return res.status(400).json({ error: '이미 사용중인 이메일입니다.' });

            // 비밀번호 준비(없으면 임시 생성)
            const pwd = password && password.length >= 8 ? password : `Adm!${Math.random().toString(36).slice(2, 10)}`;
            const bcrypt = require('bcryptjs');
            const hashed = await bcrypt.hash(pwd, 10);

            const userId = `admin_${Date.now()}`;
            const insert = await pool.query(
                `INSERT INTO users (user_id, email, password, name, role, company_id, login_type, is_approved)
                 VALUES ($1, $2, $3, $4, 'company_admin', $5, 'email', true)
                 RETURNING id, user_id, email, name, role, company_id`,
                [userId, email, hashed, name, companyId]
            );
            res.status(201).json({ success: true, admin: insert.rows[0], tempPassword: password ? undefined : pwd });
        } catch (error) {
            console.error('기업 관리자 직권 생성 오류(sys-admin):', error);
            res.status(500).json({ error: '기업 관리자 생성 중 오류가 발생했습니다.' });
        }
    }
);

// 어드민 계정 정보 조회
router.get('/profile', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, last_login, created_at FROM admin WHERE id = $1',
            [req.admin.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: '어드민 계정을 찾을 수 없습니다.' 
            });
        }
        
        const admin = result.rows[0];
        const permissions = adminPermissions[admin.role] || [];
        
        res.json({
            admin: {
                ...admin,
                permissions
            }
        });
        
    } catch (error) {
        console.error('어드민 정보 조회 오류:', error);
        res.status(500).json({ 
            error: '정보 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 어드민 계정 목록 조회 (슈퍼어드민만)
router.get('/list', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('view_admins', '어드민 계정 목록 조회'),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    id, username, role, last_login, created_at,
                    CASE 
                        WHEN last_login IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (NOW() - last_login))/3600 < 24
                        ELSE false
                    END as is_active
                FROM admin
                ORDER BY 
                    CASE role 
                        WHEN 'super_admin' THEN 1 
                        WHEN 'admin' THEN 2 
                    END,
                    created_at DESC
            `);
            
            // 활동 로그 통계 조회
            const logsResult = await pool.query(`
                SELECT 
                    admin_username,
                    COUNT(*) as activity_count,
                    MAX(created_at) as last_activity
                FROM admin_logs
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY admin_username
            `);
            
            const activityMap = {};
            logsResult.rows.forEach(log => {
                activityMap[log.admin_username] = {
                    activityCount: parseInt(log.activity_count),
                    lastActivity: log.last_activity
                };
            });
            
            const admins = result.rows.map(admin => ({
                ...admin,
                activity: activityMap[admin.username] || { activityCount: 0, lastActivity: null }
            }));
            
            res.json({ admins });
            
        } catch (error) {
            console.error('어드민 목록 조회 오류:', error);
            res.status(500).json({ 
                error: '어드민 목록 조회 중 오류가 발생했습니다.' 
            });
        }
    }
);

// 어드민 계정 생성 (슈퍼어드민만)
router.post('/create', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('create_admin', '새 어드민 계정 생성'),
    async (req, res) => {
        const { username, password, role = 'admin' } = req.body;
        
        try {
            if (!username || !password) {
                return res.status(400).json({ 
                    error: '아이디와 비밀번호는 필수입니다.' 
                });
            }
            
            if (!['admin', 'super_admin'].includes(role)) {
                return res.status(400).json({ 
                    error: '유효하지 않은 권한입니다.' 
                });
            }
            
            // 비밀번호 강도 검증
            if (password.length < 8) {
                return res.status(400).json({ 
                    error: '비밀번호는 8자 이상이어야 합니다.' 
                });
            }
            
            // 비밀번호 해시화
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // 어드민 계정 생성
            const result = await pool.query(
                `INSERT INTO admin (username, password, role) 
                VALUES ($1, $2, $3) 
                RETURNING id, username, role, created_at`,
                [username, hashedPassword, role]
            );
            
            res.status(201).json({
                success: true,
                admin: result.rows[0]
            });
            
        } catch (error) {
            if (error.code === '23505') {
                return res.status(400).json({ 
                    error: '이미 존재하는 아이디입니다.' 
                });
            }
            console.error('어드민 생성 오류:', error);
            res.status(500).json({ 
                error: '어드민 계정 생성 중 오류가 발생했습니다.' 
            });
        }
    }
);

// 어드민 계정 수정 (슈퍼어드민만)
router.put('/:adminId', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('update_admin', '어드민 계정 정보 수정'),
    async (req, res) => {
        const { adminId } = req.params;
        const { role, password } = req.body;
        
        try {
            // 자기 자신의 권한은 변경 불가
            if (parseInt(adminId) === req.admin.id && role) {
                return res.status(400).json({ 
                    error: '자신의 권한은 변경할 수 없습니다.' 
                });
            }
            
            let updateQuery = 'UPDATE admin SET updated_at = NOW()';
            const params = [];
            let paramCount = 1;
            
            if (role) {
                if (!['admin', 'super_admin'].includes(role)) {
                    return res.status(400).json({ 
                        error: '유효하지 않은 권한입니다.' 
                    });
                }
                updateQuery += `, role = $${paramCount++}`;
                params.push(role);
            }
            
            if (password) {
                if (password.length < 8) {
                    return res.status(400).json({ 
                        error: '비밀번호는 8자 이상이어야 합니다.' 
                    });
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                updateQuery += `, password = $${paramCount++}`;
                params.push(hashedPassword);
            }
            
            updateQuery += ` WHERE id = $${paramCount} RETURNING id, username, role, updated_at`;
            params.push(adminId);
            
            const result = await pool.query(updateQuery, params);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: '어드민 계정을 찾을 수 없습니다.' 
                });
            }
            
            res.json({
                success: true,
                admin: result.rows[0]
            });
            
        } catch (error) {
            console.error('어드민 수정 오류:', error);
            res.status(500).json({ 
                error: '어드민 계정 수정 중 오류가 발생했습니다.' 
            });
        }
    }
);

// 어드민 계정 삭제 (슈퍼어드민만)
router.delete('/:adminId', 
    authenticateAdmin, 
    requireSuperAdmin,
    logAdminActivity('delete_admin', '어드민 계정 삭제'),
    async (req, res) => {
        const { adminId } = req.params;
        
        try {
            // 자기 자신은 삭제 불가
            if (parseInt(adminId) === req.admin.id) {
                return res.status(400).json({ 
                    error: '자신의 계정은 삭제할 수 없습니다.' 
                });
            }
            
            // 슈퍼어드민이 1명뿐인지 확인
            const superAdminCount = await pool.query(
                "SELECT COUNT(*) FROM admin WHERE role = 'super_admin'"
            );
            
            if (parseInt(superAdminCount.rows[0].count) === 1) {
                const targetAdmin = await pool.query(
                    "SELECT role FROM admin WHERE id = $1",
                    [adminId]
                );
                
                if (targetAdmin.rows[0]?.role === 'super_admin') {
                    return res.status(400).json({ 
                        error: '마지막 슈퍼어드민 계정은 삭제할 수 없습니다.' 
                    });
                }
            }
            
            const result = await pool.query(
                'DELETE FROM admin WHERE id = $1 RETURNING username',
                [adminId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: '어드민 계정을 찾을 수 없습니다.' 
                });
            }
            
            res.json({
                success: true,
                message: `${result.rows[0].username} 계정이 삭제되었습니다.`
            });
            
        } catch (error) {
            console.error('어드민 삭제 오류:', error);
            res.status(500).json({ 
                error: '어드민 계정 삭제 중 오류가 발생했습니다.' 
            });
        }
    }
);

// 어드민 활동 로그 조회 (슈퍼어드민만)
router.get('/logs', 
    authenticateAdmin, 
    requireSuperAdmin,
    async (req, res) => {
        const { page = 1, limit = 50, adminUsername, action, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;
        
        try {
            let query = `
                SELECT * FROM admin_logs
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;
            
            if (adminUsername) {
                query += ` AND admin_username = $${paramCount++}`;
                params.push(adminUsername);
            }
            
            if (action) {
                query += ` AND action = $${paramCount++}`;
                params.push(action);
            }
            
            if (startDate) {
                query += ` AND created_at >= $${paramCount++}`;
                params.push(startDate);
            }
            
            if (endDate) {
                query += ` AND created_at <= $${paramCount++}`;
                params.push(endDate);
            }
            
            query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
            params.push(limit, offset);
            
            const logsResult = await pool.query(query, params);
            
            // 전체 개수 조회
            let countQuery = `
                SELECT COUNT(*) FROM admin_logs
                WHERE 1=1
            `;
            const countParams = params.slice(0, -2); // limit, offset 제외
            
            if (adminUsername) countQuery += ' AND admin_username = $1';
            if (action) countQuery += ` AND action = $${adminUsername ? 2 : 1}`;
            if (startDate) countQuery += ` AND created_at >= $${params.length - 3}`;
            if (endDate) countQuery += ` AND created_at <= $${params.length - 2}`;
            
            const countResult = await pool.query(countQuery, countParams);
            const totalCount = parseInt(countResult.rows[0].count);
            
            res.json({
                logs: logsResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            });
            
        } catch (error) {
            console.error('로그 조회 오류:', error);
            res.status(500).json({ 
                error: '활동 로그 조회 중 오류가 발생했습니다.' 
            });
        }
    }
);

// 비밀번호 변경 (본인만)
router.put('/password', 
    authenticateAdmin,
    logAdminActivity('change_password', '비밀번호 변경'),
    async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        
        try {
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ 
                    error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' 
                });
            }
            
            if (newPassword.length < 8) {
                return res.status(400).json({ 
                    error: '새 비밀번호는 8자 이상이어야 합니다.' 
                });
            }
            
            // 현재 비밀번호 확인
            const adminResult = await pool.query(
                'SELECT password FROM admin WHERE id = $1',
                [req.admin.id]
            );
            
            const isValidPassword = await bcrypt.compare(
                currentPassword, 
                adminResult.rows[0].password
            );
            
            if (!isValidPassword) {
                return res.status(401).json({ 
                    error: '현재 비밀번호가 올바르지 않습니다.' 
                });
            }
            
            // 새 비밀번호 해시화 및 업데이트
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await pool.query(
                'UPDATE admin SET password = $1, updated_at = NOW() WHERE id = $2',
                [hashedPassword, req.admin.id]
            );
            
            res.json({
                success: true,
                message: '비밀번호가 성공적으로 변경되었습니다.'
            });
            
        } catch (error) {
            console.error('비밀번호 변경 오류:', error);
            res.status(500).json({ 
                error: '비밀번호 변경 중 오류가 발생했습니다.' 
            });
        }
    }
);

module.exports = router;

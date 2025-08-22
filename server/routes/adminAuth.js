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
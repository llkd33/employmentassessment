const express = require('express');
const router = express.Router();
const db = require('../../database/database');
const { authenticateAdmin } = require('../middleware/adminAuth');
const { ApiResponse, ErrorHandler } = require('../utils/apiResponse');

// 호환 레이어: utils/apiResponse의 표준 클래스 기반 인터페이스에 맞춤
const apiResponse = (res, data, message, statusCode = 200) => 
    ApiResponse.success(res, data, message, statusCode);

// 방어적 처리: 미들웨어 로딩 문제 시 서버 크래시 방지 및 원인 로그 출력
const ensureAuthenticateAdmin = 
    typeof authenticateAdmin === 'function' 
        ? authenticateAdmin 
        : (req, res, next) => {
            console.error('adminAuth.authenticateAdmin 미들웨어가 로딩되지 않았습니다. 라우트 접근 차단.');
            return res.status(500).json({
                success: false,
                error: '서버 구성 오류: 관리자 인증 미들웨어를 로드하지 못했습니다.'
            });
        };

// 승인 대기 중인 사용자 목록 조회
router.get('/pending', ensureAuthenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        // 승인 대기 중인 사용자 조회
        const query = `
            SELECT user_id, name, email, role, company_id, 
                   approval_requested_at, created_at
            FROM users 
            WHERE approved = FALSE 
            AND role = 'user'
            ORDER BY approval_requested_at DESC NULLS LAST, created_at DESC
            LIMIT $1 OFFSET $2
        `;
        
        const result = await db.pool.query(query, [limit, offset]);
        
        // 전체 개수 조회
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM users 
            WHERE approved = FALSE 
            AND role = 'user'
        `;
        const countResult = await db.pool.query(countQuery);
        const total = parseInt(countResult.rows[0].total);
        
        apiResponse(res, {
            users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        }, '승인 대기 사용자 목록 조회 성공');
    } catch (error) {
        ErrorHandler.handle(error, req, res);
    }
});

// 사용자 승인
router.post('/approve/:userId', ensureAuthenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.admin.id;
        
        // 사용자 존재 확인
        const user = await db.getUserByUserId(userId);
        if (!user) {
            return apiResponse(res, null, '사용자를 찾을 수 없습니다', 404);
        }
        
        if (user.approved) {
            return apiResponse(res, null, '이미 승인된 사용자입니다', 400);
        }
        
        // 사용자 승인 처리
        const query = `
            UPDATE users 
            SET approved = TRUE, 
                approved_at = CURRENT_TIMESTAMP,
                approved_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
            RETURNING *
        `;
        
        const result = await db.pool.query(query, [adminId, userId]);
        
        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'USER_APPROVED',
            target_type: 'user',
            target_id: userId,
            details: {
                user_email: user.email,
                user_name: user.name
            },
            ip_address: req.ip
        });
        
        apiResponse(res, result.rows[0], '사용자 승인 완료');
    } catch (error) {
        ErrorHandler.handle(error, req, res);
    }
});

// 사용자 승인 거부
router.post('/reject/:userId', ensureAuthenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        const adminId = req.admin.id;
        
        // 사용자 존재 확인
        const user = await db.getUserByUserId(userId);
        if (!user) {
            return apiResponse(res, null, '사용자를 찾을 수 없습니다', 404);
        }
        
        // 사용자 삭제
        await db.deleteUser(userId);
        
        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'USER_REJECTED',
            target_type: 'user',
            target_id: userId,
            details: {
                user_email: user.email,
                user_name: user.name,
                reason: reason || '관리자 판단'
            },
            ip_address: req.ip
        });
        
        apiResponse(res, null, '사용자 승인 거부 및 삭제 완료');
    } catch (error) {
        ErrorHandler.handle(error, req, res);
    }
});

// 일괄 승인
router.post('/approve-bulk', ensureAuthenticateAdmin, async (req, res) => {
    try {
        const { userIds } = req.body;
        const adminId = req.admin.id;
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return apiResponse(res, null, '승인할 사용자 ID 목록이 필요합니다', 400);
        }
        
        // 일괄 승인 처리
        const query = `
            UPDATE users 
            SET approved = TRUE, 
                approved_at = CURRENT_TIMESTAMP,
                approved_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ANY($2::varchar[])
            AND approved = FALSE
            RETURNING user_id, email, name
        `;
        
        const result = await db.pool.query(query, [adminId, userIds]);
        
        // 각 사용자에 대한 활동 로그
        for (const user of result.rows) {
            await db.logAdminActivity({
                admin_id: adminId,
                action: 'USER_APPROVED',
                target_type: 'user',
                target_id: user.user_id,
                details: {
                    user_email: user.email,
                    user_name: user.name,
                    bulk_operation: true
                },
                ip_address: req.ip
            });
        }
        
        apiResponse(res, {
            approvedCount: result.rows.length,
            approvedUsers: result.rows
        }, `${result.rows.length}명의 사용자를 승인했습니다`);
    } catch (error) {
        ErrorHandler.handle(error, req, res);
    }
});

module.exports = router;

const jwt = require('jsonwebtoken');

// 어드민 전용 인증 미들웨어
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, admin) => {
        if (err) {
            return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        }
        
        // 어드민 토큰인지 확인
        if (!admin.isAdmin) {
            return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
        }
        
        req.admin = admin;
        next();
    });
};

// 슈퍼어드민 권한 확인 미들웨어
const requireSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== 'super_admin') {
        return res.status(403).json({ 
            error: '슈퍼 관리자 권한이 필요합니다.',
            message: '이 기능은 슈퍼 관리자만 사용할 수 있습니다.'
        });
    }
    next();
};

// 일반 어드민 이상 권한 확인 미들웨어
const requireAdminRole = (req, res, next) => {
    if (!req.admin || !['super_admin', 'admin'].includes(req.admin.role)) {
        return res.status(403).json({ 
            error: '관리자 권한이 필요합니다.' 
        });
    }
    next();
};

// 어드민 활동 로깅 미들웨어
const logAdminActivity = (action, description) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function(data) {
            res.send = originalSend;
            const result = res.send(data);
            
            // 성공적인 요청만 로깅
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const { Pool } = require('pg');
                const pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
                
                const details = {
                    action,
                    description,
                    method: req.method,
                    path: req.path,
                    params: req.params,
                    query: req.query,
                    body: req.body ? Object.keys(req.body) : undefined,
                    adminRole: req.admin?.role
                };
                
                // admin_activity_logs 테이블 생성
                pool.query(`
                    CREATE TABLE IF NOT EXISTS admin_logs (
                        id SERIAL PRIMARY KEY,
                        admin_id INTEGER,
                        admin_username VARCHAR(50),
                        admin_role VARCHAR(20),
                        action VARCHAR(100) NOT NULL,
                        description TEXT,
                        target_type VARCHAR(50),
                        target_id VARCHAR(100),
                        details JSONB,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `).then(() => {
                    // 로그 기록
                    return pool.query(`
                        INSERT INTO admin_logs 
                        (admin_id, admin_username, admin_role, action, description, target_type, target_id, details, ip_address, user_agent)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        req.admin?.id || null,
                        req.admin?.username || 'unknown',
                        req.admin?.role || 'unknown',
                        action,
                        description,
                        req.params.type || null,
                        req.params.id || req.params.userId || null,
                        JSON.stringify(details),
                        req.ip,
                        req.headers['user-agent']
                    ]);
                }).catch(error => {
                    console.error('관리자 활동 로깅 실패:', error);
                });
            }
            
            return result;
        };
        
        next();
    };
};

// JWT 토큰 생성 함수 (어드민용)
const generateAdminToken = (admin) => {
    const payload = {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        isAdmin: true,
        loginTime: new Date().toISOString()
    };
    
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '8h' } // 어드민 토큰은 8시간 유효
    );
};

// 토큰 갱신 함수
const refreshAdminToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '토큰이 필요합니다.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', { ignoreExpiration: true });
        const now = Date.now() / 1000;
        
        // 토큰 만료 1시간 전부터 갱신 가능
        if (decoded.exp - now < 3600 && decoded.isAdmin) {
            const newToken = generateAdminToken(decoded);
            res.setHeader('X-New-Token', newToken);
        }
        
        next();
    } catch (error) {
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
};

// 권한별 접근 가능 기능 정의
const adminPermissions = {
    super_admin: [
        'manage_admins',      // 어드민 계정 관리
        'manage_companies',   // 회사 관리
        'view_all_users',     // 모든 사용자 조회
        'view_all_results',   // 모든 테스트 결과 조회
        'export_all_data',    // 모든 데이터 내보내기
        'system_settings',    // 시스템 설정
        'view_admin_logs',    // 어드민 활동 로그 조회
        'delete_data',        // 데이터 삭제
        'manage_invitations'  // 초대 관리
    ],
    admin: [
        'view_users',         // 사용자 조회
        'view_results',       // 테스트 결과 조회
        'export_data',        // 데이터 내보내기 (제한적)
        'manage_invitations'  // 초대 관리
    ]
};

// 특정 권한 확인 함수
const hasPermission = (role, permission) => {
    return adminPermissions[role]?.includes(permission) || false;
};

// 권한 확인 미들웨어
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: '인증이 필요합니다.' });
        }
        
        if (!hasPermission(req.admin.role, permission)) {
            return res.status(403).json({ 
                error: '권한이 없습니다.',
                message: `이 작업을 수행하려면 '${permission}' 권한이 필요합니다.`,
                yourRole: req.admin.role
            });
        }
        
        next();
    };
};

module.exports = {
    authenticateAdmin,
    requireSuperAdmin,
    requireAdminRole,
    logAdminActivity,
    generateAdminToken,
    refreshAdminToken,
    requirePermission,
    hasPermission,
    adminPermissions
};
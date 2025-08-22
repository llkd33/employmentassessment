const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Railway PostgreSQL 연결 설정
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Production 환경에서 SSL 설정
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    connectionConfig.ssl = {
        rejectUnauthorized: false
    };
    
    if (process.env.DATABASE_URL.includes('sslmode=')) {
        connectionConfig.ssl = true;
    }
}

const pool = new Pool(connectionConfig);

async function addApprovalSystem() {
    console.log('🔄 사용자 승인 시스템 추가 중...');

    try {
        // approved 컬럼이 이미 존재하는지 확인
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'approved'
        `);

        if (columnCheck.rows.length === 0) {
            // approved 컬럼 추가 (기본값: false, 관리자는 true)
            console.log('📋 approved 컬럼 추가 중...');
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN approved BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ approved 컬럼 추가 완료');

            // 기존 사용자들 승인 처리
            console.log('📋 기존 사용자 승인 상태 업데이트 중...');
            
            // 관리자 역할 사용자는 자동 승인
            await pool.query(`
                UPDATE users 
                SET approved = TRUE 
                WHERE role IN ('super_admin', 'company_admin', 'hr_manager')
            `);
            
            // 일반 사용자는 미승인 상태로 유지 (이미 false가 기본값)
            console.log('✅ 기존 사용자 승인 상태 업데이트 완료');
        } else {
            console.log('ℹ️ approved 컬럼이 이미 존재합니다.');
        }

        // approval_requested_at 컬럼 추가 (승인 요청 시간)
        const approvalRequestCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'approval_requested_at'
        `);

        if (approvalRequestCheck.rows.length === 0) {
            console.log('📋 approval_requested_at 컬럼 추가 중...');
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN approval_requested_at TIMESTAMP
            `);
            console.log('✅ approval_requested_at 컬럼 추가 완료');
        }

        // approved_at 컬럼 추가 (승인 완료 시간)
        const approvedAtCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'approved_at'
        `);

        if (approvedAtCheck.rows.length === 0) {
            console.log('📋 approved_at 컬럼 추가 중...');
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN approved_at TIMESTAMP
            `);
            console.log('✅ approved_at 컬럼 추가 완료');
        }

        // approved_by 컬럼 추가 (승인한 관리자)
        const approvedByCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'approved_by'
        `);

        if (approvedByCheck.rows.length === 0) {
            console.log('📋 approved_by 컬럼 추가 중...');
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN approved_by VARCHAR(50) REFERENCES users(user_id)
            `);
            console.log('✅ approved_by 컬럼 추가 완료');
        }

        // 인덱스 추가
        console.log('📋 승인 관련 인덱스 추가 중...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_approval_requested_at ON users(approval_requested_at)`);
        console.log('✅ 인덱스 추가 완료');

        console.log('🎉 사용자 승인 시스템 추가 완료!');

    } catch (error) {
        console.error('❌ 승인 시스템 추가 오류:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
    addApprovalSystem()
        .then(() => {
            console.log('✅ 승인 시스템 추가 성공');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 승인 시스템 추가 실패:', error);
            process.exit(1);
        });
}

module.exports = addApprovalSystem;
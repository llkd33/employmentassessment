const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateAdminEmails() {
    try {
        console.log('🔄 관리자 계정 이메일 형식 업데이트 시작...\n');
        
        // 기존 admin 계정들 조회
        const admins = await pool.query(
            `SELECT id, user_id, email, name FROM users 
            WHERE role IN ('super_admin', 'company_admin') 
            AND (email NOT LIKE '%@%' OR email IS NULL)`
        );
        
        if (admins.rows.length === 0) {
            console.log('✅ 모든 관리자 계정이 이미 이메일 형식입니다.');
            return;
        }
        
        console.log(`📋 업데이트가 필요한 관리자 계정: ${admins.rows.length}개\n`);
        
        // 각 관리자 계정 업데이트
        for (const admin of admins.rows) {
            let newEmail;
            
            // 이메일 형식으로 변환
            if (admin.user_id === 'super_admin' || admin.email === 'superadmin') {
                newEmail = 'superadmin@system.com';
            } else if (admin.email === 'admin' || admin.user_id.startsWith('admin')) {
                // 일반 관리자는 회사별로 다른 이메일
                const timestamp = Date.now();
                newEmail = `admin_${timestamp}@company.com`;
            } else if (admin.email && !admin.email.includes('@')) {
                // 기존 값이 있지만 이메일 형식이 아닌 경우
                newEmail = `${admin.email}@company.com`;
            } else {
                // 이메일이 없는 경우
                const timestamp = Date.now();
                newEmail = `admin_${timestamp}@company.com`;
            }
            
            // 이메일 업데이트
            await pool.query(
                'UPDATE users SET email = $1 WHERE id = $2',
                [newEmail, admin.id]
            );
            
            console.log(`✅ ${admin.name || admin.user_id}: ${admin.email || 'NULL'} → ${newEmail}`);
        }
        
        console.log('\n✅ 모든 관리자 계정 이메일 업데이트 완료!');
        
        // 업데이트된 관리자 목록 출력
        const updatedAdmins = await pool.query(
            `SELECT user_id, email, name, role FROM users 
            WHERE role IN ('super_admin', 'company_admin') 
            ORDER BY role, created_at`
        );
        
        console.log('\n📋 현재 관리자 계정 목록:');
        console.log('================================');
        for (const admin of updatedAdmins.rows) {
            console.log(`${admin.role === 'super_admin' ? '👑' : '👔'} ${admin.name || admin.user_id}`);
            console.log(`   이메일: ${admin.email}`);
            console.log(`   역할: ${admin.role === 'super_admin' ? '슈퍼 관리자' : '회사 관리자'}`);
            console.log('--------------------------------');
        }
        
    } catch (error) {
        console.error('❌ 오류 발생:', error);
    } finally {
        await pool.end();
    }
}

// 스크립트 실행
if (require.main === module) {
    updateAdminEmails();
}

module.exports = updateAdminEmails;
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkAdminAccounts() {
    try {
        console.log('🔍 관리자 계정 확인 중...\n');
        
        // 모든 관리자 계정 조회
        const admins = await pool.query(
            `SELECT user_id, email, name, role, created_at 
            FROM users 
            WHERE role IN ('super_admin', 'company_admin', 'admin') 
            OR user_id IN ('superadmin', 'testadmin', 'admin')
            ORDER BY role, created_at`
        );
        
        if (admins.rows.length === 0) {
            console.log('❌ 관리자 계정이 없습니다.');
            return;
        }
        
        console.log('📋 현재 관리자 계정 목록:');
        console.log('================================');
        for (const admin of admins.rows) {
            const roleIcon = admin.role === 'super_admin' ? '👑' : '👔';
            console.log(`${roleIcon} ${admin.name || admin.user_id}`);
            console.log(`   User ID: ${admin.user_id}`);
            console.log(`   이메일: ${admin.email}`);
            console.log(`   역할: ${admin.role}`);
            console.log(`   생성일: ${admin.created_at}`);
            console.log('--------------------------------');
        }
        
        // 이메일 형식이 아닌 계정 확인
        const invalidEmails = await pool.query(
            `SELECT user_id, email 
            FROM users 
            WHERE role IN ('super_admin', 'company_admin', 'admin')
            AND (email NOT LIKE '%@%' OR email IS NULL)`
        );
        
        if (invalidEmails.rows.length > 0) {
            console.log('\n⚠️  이메일 형식이 아닌 관리자 계정:');
            for (const admin of invalidEmails.rows) {
                console.log(`   - ${admin.user_id}: ${admin.email || 'NULL'}`);
            }
        } else {
            console.log('\n✅ 모든 관리자 계정이 이메일 형식입니다.');
        }
        
    } catch (error) {
        console.error('❌ 오류 발생:', error);
    } finally {
        await pool.end();
    }
}

// 스크립트 실행
checkAdminAccounts();
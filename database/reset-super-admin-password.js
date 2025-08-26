require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetSuperAdminPassword() {
    try {
        // 기본 비밀번호 설정 (실제 운영시 변경 필요)
        const newPassword = 'SuperAdmin123!';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // super@admin.com 계정 비밀번호 재설정
        const result = await pool.query(`
            UPDATE users 
            SET password = $1 
            WHERE email = 'super@admin.com' 
            AND role = 'super_admin'
            RETURNING user_id, name, email
        `, [hashedPassword]);
        
        if (result.rows.length > 0) {
            console.log('✅ Super Admin 비밀번호가 재설정되었습니다!');
            console.log('\n📧 계정 정보:');
            console.log(`   Email: ${result.rows[0].email}`);
            console.log(`   Name: ${result.rows[0].name}`);
            console.log(`   임시 비밀번호: ${newPassword}`);
            console.log('\n⚠️  보안 주의사항:');
            console.log('   1. 로그인 후 즉시 비밀번호를 변경하세요');
            console.log('   2. 강력한 비밀번호를 사용하세요');
            console.log('   3. 이 비밀번호를 안전하게 보관하세요');
        } else {
            console.log('❌ super@admin.com 계정을 찾을 수 없습니다.');
            console.log('\n새 Super Admin 계정을 생성하시겠습니까?');
            
            // 새 계정 생성
            const createResult = await pool.query(`
                INSERT INTO users (
                    user_id, name, email, password, role, 
                    is_email_verified, created_at
                ) VALUES (
                    'super_admin_' || gen_random_uuid(),
                    '슈퍼관리자',
                    'super@admin.com',
                    $1,
                    'super_admin',
                    true,
                    NOW()
                ) 
                ON CONFLICT (email) 
                DO UPDATE SET 
                    password = $1,
                    role = 'super_admin'
                RETURNING user_id, name, email
            `, [hashedPassword]);
            
            if (createResult.rows.length > 0) {
                console.log('\n✅ 새 Super Admin 계정이 생성되었습니다!');
                console.log(`   Email: ${createResult.rows[0].email}`);
                console.log(`   임시 비밀번호: ${newPassword}`);
            }
        }
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    } finally {
        await pool.end();
    }
}

resetSuperAdminPassword();
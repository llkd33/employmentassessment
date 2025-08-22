const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addAdminRole() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 어드민 테이블 및 계정 생성 시작...');
        
        await client.query('BEGIN');
        
        // admin 테이블 생성
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ admin 테이블 생성 완료');
        
        // 인덱스 생성
        await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_username ON admin(username)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_role ON admin(role)`);
        
        console.log('✅ 인덱스 생성 완료');
        
        // 슈퍼어드민 계정 생성
        const superAdminCheck = await client.query(
            "SELECT id FROM admin WHERE username = $1",
            ['superadmin']
        );
        
        if (superAdminCheck.rows.length === 0) {
            const superAdminPassword = await bcrypt.hash('SuperAdmin@2024!', 10);
            await client.query(`
                INSERT INTO admin (username, password, role, created_at)
                VALUES ($1, $2, $3, NOW())
            `, ['superadmin', superAdminPassword, 'super_admin']);
            
            console.log('✅ 슈퍼어드민 계정 생성 완료');
            console.log('   Username: superadmin');
            console.log('   Password: SuperAdmin@2024!');
            console.log('   Role: super_admin');
        } else {
            // 기존 superadmin 계정의 role을 super_admin으로 업데이트
            await client.query(`
                UPDATE admin 
                SET role = 'super_admin' 
                WHERE username = 'superadmin'
            `);
            console.log('ℹ️ 슈퍼어드민 계정이 이미 존재합니다. Role 업데이트 완료.');
        }
        
        // 테스트 어드민 계정 생성
        const testAdminCheck = await client.query(
            "SELECT id FROM admin WHERE username = $1",
            ['testadmin']
        );
        
        if (testAdminCheck.rows.length === 0) {
            const testAdminPassword = await bcrypt.hash('TestAdmin@2024', 10);
            await client.query(`
                INSERT INTO admin (username, password, role, created_at)
                VALUES ($1, $2, $3, NOW())
            `, ['testadmin', testAdminPassword, 'admin']);
            
            console.log('✅ 테스트 어드민 계정 생성 완료');
            console.log('   Username: testadmin');
            console.log('   Password: TestAdmin@2024');
            console.log('   Role: admin');
        } else {
            console.log('ℹ️ 테스트 어드민 계정이 이미 존재합니다.');
        }
        
        await client.query('COMMIT');
        console.log('\n✅ 모든 작업이 성공적으로 완료되었습니다!');
        
        // 현재 어드민 계정 목록 확인
        const adminList = await client.query(`
            SELECT username, role, created_at 
            FROM admin 
            ORDER BY 
                CASE role 
                    WHEN 'super_admin' THEN 1 
                    WHEN 'admin' THEN 2 
                END, 
                created_at
        `);
        
        console.log('\n📋 현재 어드민 계정 목록:');
        console.log('─'.repeat(50));
        adminList.rows.forEach(admin => {
            console.log(`${admin.username.padEnd(15)} | ${admin.role.padEnd(12)} | ${new Date(admin.created_at).toLocaleDateString()}`);
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 마이그레이션 실패:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// 스크립트 실행
if (require.main === module) {
    addAdminRole()
        .then(() => {
            console.log('\n✨ 마이그레이션 완료!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 오류 발생:', error);
            process.exit(1);
        });
}

module.exports = addAdminRole;
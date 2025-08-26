/**
 * 실제 테스트 가능한 사용자 계정 생성 스크립트
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createRealUsers() {
    const client = await pool.connect();
    
    try {
        console.log('🌱 실제 사용자 계정 생성 시작...');
        
        await client.query('BEGIN');
        
        // 1. 회사 확인/생성
        let companyId;
        const companyCheck = await client.query(
            "SELECT id FROM companies WHERE name = 'Sample Company'"
        );
        
        if (companyCheck.rows.length === 0) {
            const companyResult = await client.query(`
                INSERT INTO companies (name, domain, code, is_active, status)
                VALUES ('Sample Company', 'sample.com', 'SAMPLE001', true, 'active')
                RETURNING id
            `);
            companyId = companyResult.rows[0].id;
            console.log('✅ Sample Company 생성 완료');
        } else {
            companyId = companyCheck.rows[0].id;
            console.log('ℹ️ 기존 Sample Company 사용');
        }
        
        // 2. 테스트용 사용자 생성 (실제 로그인 가능)
        const testUsers = [
            { 
                name: '김테스트', 
                email: 'test1@sample.com', 
                password: 'test123',
                department: '개발팀', 
                position: '주니어 개발자' 
            },
            { 
                name: '이테스트', 
                email: 'test2@sample.com', 
                password: 'test123',
                department: '마케팅팀', 
                position: '매니저' 
            },
            { 
                name: '박테스트', 
                email: 'test3@sample.com', 
                password: 'test123',
                department: '영업팀', 
                position: '팀장' 
            }
        ];
        
        for (const user of testUsers) {
            // 사용자가 이미 있는지 확인
            const existingUser = await client.query(
                'SELECT user_id FROM users WHERE email = $1',
                [user.email]
            );
            
            if (existingUser.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                await client.query(`
                    INSERT INTO users (
                        user_id, name, email, password, role, 
                        company_id, department, position, login_type, is_approved
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    userId,
                    user.name,
                    user.email,
                    hashedPassword,
                    'user', // 일반 사용자 role
                    companyId,
                    user.department,
                    user.position,
                    'email',
                    true
                ]);
                
                console.log(`✅ 사용자 생성: ${user.name} (${user.email} / 비밀번호: ${user.password})`);
            } else {
                console.log(`ℹ️ 이미 존재하는 사용자: ${user.name} (${user.email})`);
            }
        }
        
        await client.query('COMMIT');
        
        console.log('\n🎉 실제 사용자 계정 생성 완료!');
        console.log('\n📝 생성된 테스트 계정:');
        console.log('────────────────────────────────────────');
        testUsers.forEach(user => {
            console.log(`이메일: ${user.email}`);
            console.log(`비밀번호: ${user.password}`);
            console.log('────────────────────────────────────────');
        });
        console.log('\n💡 위 계정으로 로그인하여 실제 테스트를 수행할 수 있습니다.');
        console.log('📍 테스트 후 관리자 계정으로 결과를 확인하세요:');
        console.log('  관리자 이메일: admin@test.com');
        console.log('  관리자 비밀번호: admin123');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 사용자 생성 실패:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// 스크립트 실행
createRealUsers().catch(console.error);
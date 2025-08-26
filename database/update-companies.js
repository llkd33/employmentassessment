require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateCompanies() {
    try {
        console.log('회사 ID 업데이트 시작...\n');
        
        // 김테스트를 삼성전자로
        await pool.query(
            "UPDATE users SET company_id = 1 WHERE email = 'test1@sample.com'"
        );
        console.log('김테스트 -> 삼성전자');
        
        // 이테스트를 LG전자로
        await pool.query(
            "UPDATE users SET company_id = 2 WHERE email = 'test2@sample.com'"
        );
        console.log('이테스트 -> LG전자');
        
        // 박테스트를 네이버로
        await pool.query(
            "UPDATE users SET company_id = 3 WHERE email = 'test3@sample.com'"
        );
        console.log('박테스트 -> 네이버');
        
        // 확인
        const result = await pool.query(`
            SELECT u.name, u.email, u.company_id, c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.role = 'user'
        `);
        
        console.log('\n업데이트된 사용자 목록:');
        result.rows.forEach(user => {
            console.log(`  - ${user.name} (${user.email}): ${user.company_name || '회사 없음'}`);
        });
        
        console.log('\n완료!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

updateCompanies();
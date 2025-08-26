require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkData() {
    try {
        console.log('=== 데이터베이스 확인 시작 ===\n');
        
        // 1. 회사 확인
        console.log('1. 회사 데이터 확인:');
        const companies = await pool.query('SELECT id, name, domain, is_active FROM companies');
        console.log(`  - 총 회사 수: ${companies.rows.length}`);
        if (companies.rows.length > 0) {
            console.log('  - 샘플 회사:', companies.rows.slice(0, 3));
        }
        
        // 2. 사용자 확인
        console.log('\n2. 사용자 데이터 확인:');
        const users = await pool.query(`
            SELECT user_id, name, email, role, company_id 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log(`  - 총 사용자 수:`, (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count);
        if (users.rows.length > 0) {
            console.log('  - 최근 사용자:', users.rows);
        }
        
        // 3. 관리자 계정 확인
        console.log('\n3. 관리자 계정 확인:');
        const admins = await pool.query(`
            SELECT user_id, name, email, role, company_id 
            FROM users 
            WHERE role IN ('super_admin', 'sys_admin', 'company_admin', 'hr_manager')
        `);
        console.log(`  - 관리자 수: ${admins.rows.length}`);
        if (admins.rows.length > 0) {
            admins.rows.forEach(admin => {
                console.log(`  - ${admin.role}: ${admin.name} (${admin.email})`);
            });
        }
        
        // 4. 테스트 결과 확인
        console.log('\n4. 테스트 결과 확인:');
        const testResults = await pool.query('SELECT COUNT(*) FROM test_results');
        console.log(`  - 총 테스트 결과 수: ${testResults.rows[0].count}`);
        
        // 5. 최근 테스트 결과
        const recentTests = await pool.query(`
            SELECT tr.result_id, u.name, u.email, tr.test_date, tr.overall_score
            FROM test_results tr
            JOIN users u ON tr.user_id = u.user_id
            ORDER BY tr.test_date DESC
            LIMIT 3
        `);
        if (recentTests.rows.length > 0) {
            console.log('  - 최근 테스트 결과:');
            recentTests.rows.forEach(test => {
                console.log(`    * ${test.name} - ${test.overall_score}점 (${new Date(test.test_date).toLocaleDateString()})`);
            });
        }
        
        // 6. 테스트 피드백 확인
        console.log('\n5. 테스트 피드백 확인:');
        const feedback = await pool.query('SELECT COUNT(*) FROM test_feedback');
        console.log(`  - 총 피드백 수: ${feedback.rows[0].count}`);
        
        console.log('\n=== 확인 완료 ===');
        
    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await pool.end();
    }
}

checkData();
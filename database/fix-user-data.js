require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixUserData() {
    try {
        console.log('=== 사용자 데이터 수정 시작 ===\n');
        
        // 1. 잘못된 company_id를 가진 사용자들 확인
        const invalidUsers = await pool.query(`
            SELECT u.user_id, u.name, u.email, u.company_id 
            FROM users u
            WHERE u.company_id IS NOT NULL 
            AND u.company_id NOT IN (SELECT id FROM companies)
        `);
        
        console.log(`잘못된 company_id를 가진 사용자 수: ${invalidUsers.rows.length}`);
        
        if (invalidUsers.rows.length > 0) {
            // 사용자들을 실제 회사에 배정
            console.log('사용자들을 실제 회사에 재배정합니다...');
            
            // 각 사용자를 회사에 랜덤으로 배정 (1-5번 회사)
            for (let i = 0; i < invalidUsers.rows.length; i++) {
                const user = invalidUsers.rows[i];
                const newCompanyId = (i % 5) + 1; // 1-5번 회사에 순차 배정
                
                await pool.query(
                    'UPDATE users SET company_id = $1 WHERE user_id = $2',
                    [newCompanyId, user.user_id]
                );
                
                console.log(`  - ${user.name} (${user.email}) -> 회사 ID ${newCompanyId}`);
            }
        }
        
        // 2. 샘플 테스트 결과 생성
        console.log('\n샘플 테스트 결과를 생성합니다...');
        
        // 일반 사용자 중 일부에게 테스트 결과 추가
        const regularUsers = await pool.query(`
            SELECT user_id, name FROM users 
            WHERE role = 'user' 
            LIMIT 3
        `);
        
        for (const user of regularUsers.rows) {
            // 테스트 결과가 이미 있는지 확인
            const existing = await pool.query(
                'SELECT * FROM test_results WHERE user_id = $1',
                [user.user_id]
            );
            
            if (existing.rows.length === 0) {
                // 테스트 결과 추가
                const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const testDate = new Date();
                
                const testResult = await pool.query(`
                    INSERT INTO test_results (
                        result_id,
                        session_id,
                        user_id,
                        test_date,
                        overall_score,
                        problem_solving_score,
                        communication_score,
                        leadership_score,
                        creativity_score,
                        teamwork_score,
                        submitted_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING result_id
                `, [
                    resultId,
                    sessionId,
                    user.user_id,
                    testDate,
                    Math.floor(Math.random() * 30) + 70, // 70-100
                    Math.floor(Math.random() * 30) + 70,
                    Math.floor(Math.random() * 30) + 70,
                    Math.floor(Math.random() * 30) + 70,
                    Math.floor(Math.random() * 30) + 70,
                    Math.floor(Math.random() * 30) + 70,
                    testDate
                ]);
                
                console.log(`  - ${user.name}에게 테스트 결과 추가 (ID: ${testResult.rows[0].result_id})`);
            }
        }
        
        // 3. 최종 확인
        console.log('\n=== 수정 후 데이터 확인 ===');
        
        const companies = await pool.query(`
            SELECT c.id, c.name, COUNT(u.user_id) as employee_count
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            GROUP BY c.id, c.name
            ORDER BY c.id
        `);
        
        console.log('\n회사별 직원 수:');
        companies.rows.forEach(company => {
            console.log(`  - ${company.name}: ${company.employee_count}명`);
        });
        
        const testCount = await pool.query('SELECT COUNT(*) FROM test_results');
        console.log(`\n총 테스트 결과 수: ${testCount.rows[0].count}`);
        
        console.log('\n=== 수정 완료 ===');
        
    } catch (error) {
        console.error('Error fixing data:', error);
    } finally {
        await pool.end();
    }
}

fixUserData();
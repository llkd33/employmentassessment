/**
 * 테스트 데이터 시드 스크립트
 * 관리자가 확인할 수 있는 샘플 테스트 결과 데이터를 생성합니다.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seedTestData() {
    const client = await pool.connect();
    
    try {
        console.log('🌱 테스트 데이터 생성 시작...');
        
        await client.query('BEGIN');
        
        // 1. 테스트 회사 생성 (없으면)
        let companyId;
        const companyCheck = await client.query(
            "SELECT id FROM companies WHERE name = 'Test Company'"
        );
        
        if (companyCheck.rows.length === 0) {
            const companyResult = await client.query(`
                INSERT INTO companies (name, domain, code, is_active, status)
                VALUES ('Test Company', 'testcompany.com', 'TEST001', true, 'active')
                RETURNING id
            `);
            companyId = companyResult.rows[0].id;
            console.log('✅ 테스트 회사 생성 완료');
        } else {
            companyId = companyCheck.rows[0].id;
            console.log('ℹ️ 기존 테스트 회사 사용');
        }
        
        // 2. 테스트 사용자들 생성
        const testUsers = [
            { name: '김철수', email: 'kim@testcompany.com', department: '개발팀', position: '주니어 개발자' },
            { name: '이영희', email: 'lee@testcompany.com', department: '마케팅팀', position: '마케팅 매니저' },
            { name: '박민수', email: 'park@testcompany.com', department: '영업팀', position: '영업 사원' },
            { name: '정수진', email: 'jung@testcompany.com', department: '디자인팀', position: 'UI/UX 디자이너' },
            { name: '최현우', email: 'choi@testcompany.com', department: '개발팀', position: '시니어 개발자' }
        ];
        
        const hashedPassword = await bcrypt.hash('test123', 10);
        const userIds = [];
        
        for (const user of testUsers) {
            // 사용자가 이미 있는지 확인
            const existingUser = await client.query(
                'SELECT user_id FROM users WHERE email = $1',
                [user.email]
            );
            
            if (existingUser.rows.length === 0) {
                const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const result = await client.query(`
                    INSERT INTO users (
                        user_id, name, email, password, role, 
                        company_id, department, position, login_type, is_approved
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING user_id
                `, [
                    userId,
                    user.name,
                    user.email,
                    hashedPassword,
                    'user',
                    companyId,
                    user.department,
                    user.position,
                    'email',
                    true
                ]);
                userIds.push(result.rows[0].user_id);
                console.log(`✅ 사용자 생성: ${user.name}`);
            } else {
                userIds.push(existingUser.rows[0].user_id);
                console.log(`ℹ️ 기존 사용자: ${user.name}`);
            }
        }
        
        // 3. 테스트 결과 데이터 생성
        const competencies = ['problem_solving', 'communication', 'leadership', 'creativity', 'teamwork'];
        
        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            
            // 각 사용자당 1-2개의 테스트 결과 생성
            const numTests = Math.floor(Math.random() * 2) + 1;
            
            for (let j = 0; j < numTests; j++) {
                const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // 랜덤 점수 생성 (60-100 범위)
                const scores = {};
                let totalScore = 0;
                
                for (const comp of competencies) {
                    scores[comp] = Math.floor(Math.random() * 41) + 60;
                    totalScore += scores[comp];
                }
                
                const overallScore = Math.floor(totalScore / competencies.length);
                
                // 테스트 날짜 (최근 30일 이내 랜덤)
                const daysAgo = Math.floor(Math.random() * 30);
                const testDate = new Date();
                testDate.setDate(testDate.getDate() - daysAgo);
                
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                await client.query(`
                    INSERT INTO test_results (
                        result_id, session_id, user_id, test_date, submitted_at,
                        overall_score, problem_solving_score, communication_score,
                        leadership_score, creativity_score, teamwork_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    resultId,
                    sessionId,
                    userId,
                    testDate,
                    testDate, // submitted_at을 test_date와 같게 설정
                    overallScore,
                    scores.problem_solving,
                    scores.communication,
                    scores.leadership,
                    scores.creativity,
                    scores.teamwork
                ]);
                
                console.log(`✅ 테스트 결과 생성: ${testUsers[i].name} - ${overallScore}점`);
                
                // 피드백 생성은 일단 스킵 (테이블 구조 확인 필요)
            }
        }
        
        await client.query('COMMIT');
        
        console.log('\n🎉 테스트 데이터 생성 완료!');
        console.log('📊 생성된 데이터:');
        console.log(`  - 회사: 1개`);
        console.log(`  - 사용자: ${userIds.length}명`);
        console.log(`  - 테스트 결과: 약 ${userIds.length * 1.5}개`);
        console.log('\n💡 관리자 계정으로 로그인하여 확인하세요:');
        console.log('  이메일: admin@test.com');
        console.log('  비밀번호: admin123');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 테스트 데이터 생성 실패:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// 스크립트 실행
seedTestData().catch(console.error);
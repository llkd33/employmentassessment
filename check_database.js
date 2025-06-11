require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🗄️  Railway 데이터베이스 연결 중...');

        const client = await pool.connect();
        console.log('✅ Railway 데이터베이스 연결 성공!');

        // 모든 사용자 목록 조회
        console.log('\n📋 현재 데이터베이스의 모든 사용자:');
        console.log('='.repeat(80));

        const usersQuery = `
            SELECT 
                user_id,
                name,
                email,
                login_type,
                created_at,
                updated_at
            FROM users 
            ORDER BY created_at DESC
        `;

        const usersResult = await client.query(usersQuery);

        if (usersResult.rows.length === 0) {
            console.log('❌ 데이터베이스에 사용자가 없습니다!');
        } else {
            usersResult.rows.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user.user_id}`);
                console.log(`   이름: ${user.name}`);
                console.log(`   이메일: ${user.email}`);
                console.log(`   로그인 타입: ${user.login_type}`);
                console.log(`   가입일: ${user.created_at}`);
                console.log(`   수정일: ${user.updated_at || '없음'}`);
                console.log('-'.repeat(50));
            });
        }

        // 테스트 결과 개수 확인
        console.log('\n📊 데이터베이스 통계:');
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN login_type = 'email' THEN 1 END) as email_users,
                COUNT(CASE WHEN login_type = 'kakao' THEN 1 END) as kakao_users,
                COUNT(CASE WHEN login_type = 'anonymous' THEN 1 END) as anonymous_users
            FROM users
        `;

        const statsResult = await client.query(statsQuery);
        const stats = statsResult.rows[0];

        console.log(`총 사용자 수: ${stats.total_users}명`);
        console.log(`이메일 가입: ${stats.email_users}명`);
        console.log(`카카오 가입: ${stats.kakao_users}명`);
        console.log(`익명 사용자: ${stats.anonymous_users}명`);

        // 테스트 결과 개수 확인
        const testResultsQuery = `
            SELECT COUNT(*) as total_results
            FROM test_results
        `;

        const testResult = await client.query(testResultsQuery);
        console.log(`테스트 결과: ${testResult.rows[0].total_results}개`);

        // 최근 가입자 5명
        console.log('\n🕐 최근 가입자 5명:');
        const recentQuery = `
            SELECT name, email, login_type, created_at
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `;

        const recentResult = await client.query(recentQuery);
        recentResult.rows.forEach((user, index) => {
            const date = new Date(user.created_at).toLocaleString('ko-KR');
            console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.login_type} - ${date}`);
        });

        client.release();
        console.log('\n✅ 데이터베이스 조회 완료!');

    } catch (error) {
        console.error('❌ 데이터베이스 조회 오류:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

checkDatabase(); 
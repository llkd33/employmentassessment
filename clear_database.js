require('dotenv').config();
const { Pool } = require('pg');

async function clearDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🗄️  데이터베이스 연결 중...');

        // 데이터베이스 연결 테스트
        const client = await pool.connect();
        console.log('✅ 데이터베이스 연결 성공!');

        console.log('\n🧹 데이터베이스 정리 시작...');

        // 외래 키 제약 조건 때문에 순서가 중요합니다
        const queries = [
            'DELETE FROM test_answers',
            'DELETE FROM test_results',
            'DELETE FROM users'
        ];

        for (const query of queries) {
            console.log(`실행 중: ${query}`);
            const result = await client.query(query);
            console.log(`✅ 삭제된 행 수: ${result.rowCount}`);
        }

        // ID 시퀀스 초기화 (선택사항)
        console.log('\n🔄 ID 시퀀스 초기화 중...');
        await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE test_results_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE test_answers_id_seq RESTART WITH 1');
        console.log('✅ ID 시퀀스 초기화 완료');

        // 정리 결과 확인
        console.log('\n📊 정리 결과:');
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        const testCount = await client.query('SELECT COUNT(*) FROM test_results');
        const answerCount = await client.query('SELECT COUNT(*) FROM test_answers');

        console.log(`사용자: ${userCount.rows[0].count}개`);
        console.log(`테스트 결과: ${testCount.rows[0].count}개`);
        console.log(`테스트 답변: ${answerCount.rows[0].count}개`);

        client.release();
        console.log('\n🎉 데이터베이스 정리 완료!');

    } catch (error) {
        console.error('❌ 데이터베이스 정리 오류:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

// 안전 확인
console.log('⚠️  경고: 이 작업은 모든 데이터를 삭제합니다!');
console.log('계속하려면 5초 후 자동 실행됩니다...');

setTimeout(() => {
    clearDatabase();
}, 5000); 
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// PostgreSQL 연결 풀 설정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateSchema() {
    console.log('🔄 데이터베이스 스키마 마이그레이션 시작...');

    try {
        // 기존 제약 조건 제거 및 새로운 제약 조건 추가
        console.log('📋 login_type 제약 조건 업데이트 중...');

        // 기존 CHECK 제약 조건 제거
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_login_type_check
        `);

        // 새로운 CHECK 제약 조건 추가 (anonymous, temp 포함)
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_login_type_check 
            CHECK (login_type IN ('email', 'kakao', 'anonymous', 'temp'))
        `);

        console.log('✅ login_type 제약 조건 업데이트 완료');

        // 답변 제약 조건 업데이트
        console.log('📋 답변 옵션 제약 조건 업데이트 중...');

        // 기존 답변 CHECK 제약 조건 제거
        await pool.query(`
            ALTER TABLE test_answers 
            DROP CONSTRAINT IF EXISTS test_answers_answer_check
        `);

        // 새로운 답변 CHECK 제약 조건 추가
        await pool.query(`
            ALTER TABLE test_answers 
            ADD CONSTRAINT test_answers_answer_check 
            CHECK (answer IN ('매우 아니다', '아니다', '보통', '그렇다', '매우 그렇다', '전혀 그렇지 않다', '대체로 그렇지 않다', '보통이다', '대체로 그렇다'))
        `);

        console.log('✅ 답변 옵션 제약 조건 업데이트 완료');

        console.log('🎉 스키마 마이그레이션 완료!');

    } catch (error) {
        console.error('❌ 마이그레이션 오류:', error.message);
        throw error;
    }
}

// 스크립트가 직접 실행될 때만 마이그레이션 실행
if (require.main === module) {
    migrateSchema()
        .then(() => {
            console.log('✅ 마이그레이션 성공');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 마이그레이션 실패:', error);
            process.exit(1);
        });
}

module.exports = migrateSchema; 
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL 연결 풀 설정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeSchema() {
    console.log('🔍 데이터베이스 스키마 초기화 시작...');

    try {
        // 테이블 존재 여부 확인
        const tablesCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'test_results', 'test_answers')
        `);

        if (tablesCheck.rows.length === 3) {
            console.log('✅ 모든 테이블이 이미 존재합니다.');
            return;
        }

        console.log('📋 테이블 생성 중...');

        // 사용자 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                login_type VARCHAR(20) NOT NULL CHECK (login_type IN ('email', 'kakao')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 테스트 결과 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_results (
                id SERIAL PRIMARY KEY,
                result_id VARCHAR(50) UNIQUE NOT NULL,
                session_id VARCHAR(100) UNIQUE NOT NULL,
                user_id VARCHAR(50) REFERENCES users(user_id),
                overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
                problem_solving_score INTEGER NOT NULL CHECK (problem_solving_score >= 0 AND problem_solving_score <= 100),
                communication_score INTEGER NOT NULL CHECK (communication_score >= 0 AND communication_score <= 100),
                leadership_score INTEGER NOT NULL CHECK (leadership_score >= 0 AND leadership_score <= 100),
                creativity_score INTEGER NOT NULL CHECK (creativity_score >= 0 AND creativity_score <= 100),
                teamwork_score INTEGER NOT NULL CHECK (teamwork_score >= 0 AND teamwork_score <= 100),
                test_date TIMESTAMP NOT NULL,
                submitted_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 테스트 답변 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_answers (
                id SERIAL PRIMARY KEY,
                result_id VARCHAR(50) REFERENCES test_results(result_id),
                question_id INTEGER NOT NULL CHECK (question_id >= 1 AND question_id <= 75),
                answer VARCHAR(50) NOT NULL CHECK (answer IN ('전혀 그렇지 않다', '대체로 그렇지 않다', '보통이다', '대체로 그렇다', '매우 그렇다')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(result_id, question_id)
            )
        `);

        // 인덱스 생성
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(session_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_results_test_date ON test_results(test_date)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_answers_result_id ON test_answers(result_id)`);

        // 업데이트 함수 생성
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

        // 트리거 생성
        await pool.query(`
            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

        console.log('✅ 데이터베이스 스키마 생성 완료!');
        console.log('📊 생성된 테이블: users, test_results, test_answers');

    } catch (error) {
        console.error('❌ 스키마 생성 오류:', error.message);
        throw error;
    }
}

module.exports = initializeSchema; 
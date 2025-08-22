const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Railway PostgreSQL 연결 설정
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Production 환경에서 SSL 설정
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    connectionConfig.ssl = {
        rejectUnauthorized: false
    };
    
    if (process.env.DATABASE_URL.includes('sslmode=')) {
        connectionConfig.ssl = true;
    }
}

const pool = new Pool(connectionConfig);

async function initializeSchema() {
    console.log('🔍 데이터베이스 스키마 초기화 시작...');

    // 연결 사전 점검: 현재 사용자/DB/버전 정보 출력 (문제 진단에 도움)
    try {
        const preflight = await pool.query('SELECT current_user, current_database(), version()');
        const row = preflight.rows[0];
        console.log(`👤 current_user: ${row.current_user}`);
        console.log(`🗃️  current_database: ${row.current_database}`);
        console.log(`🧬 server_version: ${row.version.split('\n')[0]}`);
    } catch (preErr) {
        console.error('❌ 초기 연결/권한 확인 실패:', preErr.message);
        if (preErr.code) console.error('   - error.code:', preErr.code);
        if (preErr.detail) console.error('   - error.detail:', preErr.detail);
        if (preErr.hint) console.error('   - error.hint:', preErr.hint);
        // 연결 자체가 불가하면 스키마 생성도 진행할 수 없으므로 throw
        throw preErr;
    }

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
                login_type VARCHAR(20) NOT NULL CHECK (login_type IN ('email', 'kakao', 'anonymous', 'temp')),
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
                answer VARCHAR(50) NOT NULL CHECK (answer IN ('매우 아니다', '아니다', '보통', '그렇다', '매우 그렇다')),
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
        if (error.code) console.error('   - error.code:', error.code);
        if (error.detail) console.error('   - error.detail:', error.detail);
        if (error.hint) console.error('   - error.hint:', error.hint);
        throw error;
    }
}

module.exports = initializeSchema; 

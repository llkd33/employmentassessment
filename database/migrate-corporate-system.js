const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateCorporateSystem() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🏢 기업 시스템 마이그레이션 시작...');
        
        // 1. users 테이블에 추가 컬럼
        console.log('📝 users 테이블 업데이트 중...');
        
        // department 컬럼 추가
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS department VARCHAR(100)
        `);
        
        // position 컬럼 추가
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS position VARCHAR(100)
        `);
        
        // employee_number 컬럼 추가
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50)
        `);
        
        // is_active 컬럼 추가
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
        `);
        
        // role 컬럼 체크 제약 조건 업데이트
        // 먼저 기존 제약 조건 제거
        await client.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_role_check
        `);
        
        // 새로운 제약 조건 추가
        await client.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('super_admin', 'company_admin', 'hr_manager', 'employee', 'user'))
        `);
        
        console.log('✅ users 테이블 업데이트 완료');
        
        // 2. 기업 가입 신청 테이블
        console.log('📝 corporate_registrations 테이블 생성 중...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS corporate_registrations (
                id SERIAL PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                business_number VARCHAR(50) UNIQUE NOT NULL,
                ceo_name VARCHAR(100),
                industry VARCHAR(100),
                address TEXT,
                contact_name VARCHAR(100) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50),
                admin_name VARCHAR(100) NOT NULL,
                admin_email VARCHAR(255) NOT NULL,
                admin_password VARCHAR(255) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' 
                    CHECK (status IN ('pending', 'approved', 'rejected')),
                rejection_reason TEXT,
                approved_by VARCHAR(50),
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ corporate_registrations 테이블 생성 완료');
        
        // 3. 기업 코드 테이블
        console.log('📝 corporate_codes 테이블 생성 중...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS corporate_codes (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                code VARCHAR(50) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                issued_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                usage_count INTEGER DEFAULT 0,
                max_usage INTEGER DEFAULT NULL,
                description TEXT
            )
        `);
        console.log('✅ corporate_codes 테이블 생성 완료');
        
        // 4. 기업-사용자 연결 로그 테이블
        console.log('📝 company_user_logs 테이블 생성 중...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS company_user_logs (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
                action VARCHAR(50) NOT NULL CHECK (action IN ('joined', 'left', 'deactivated', 'reactivated', 'role_changed')),
                details JSONB,
                performed_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ company_user_logs 테이블 생성 완료');
        
        // 5. companies 테이블에 추가 컬럼
        console.log('📝 companies 테이블 업데이트 중...');
        
        // business_number 컬럼 추가
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS business_number VARCHAR(50) UNIQUE
        `);
        
        // ceo_name 컬럼 추가
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS ceo_name VARCHAR(100)
        `);
        
        // industry 컬럼 추가
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS industry VARCHAR(100)
        `);
        
        // address 컬럼 추가
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS address TEXT
        `);
        
        // is_active 컬럼 추가
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
        `);
        
        // employee_count 컬럼 추가
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0
        `);
        
        console.log('✅ companies 테이블 업데이트 완료');
        
        // 6. 인덱스 생성
        console.log('📝 인덱스 생성 중...');
        
        // corporate_registrations 인덱스
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_corporate_registrations_status 
            ON corporate_registrations(status)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_corporate_registrations_business_number 
            ON corporate_registrations(business_number)
        `);
        
        // corporate_codes 인덱스
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_corporate_codes_company_id 
            ON corporate_codes(company_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_corporate_codes_code 
            ON corporate_codes(code)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_corporate_codes_is_active 
            ON corporate_codes(is_active)
        `);
        
        // company_user_logs 인덱스
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_company_user_logs_company_id 
            ON company_user_logs(company_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_company_user_logs_user_id 
            ON company_user_logs(user_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_company_user_logs_action 
            ON company_user_logs(action)
        `);
        
        // users 테이블 추가 인덱스
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_is_active 
            ON users(is_active)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_employee_number 
            ON users(employee_number)
        `);
        
        console.log('✅ 인덱스 생성 완료');
        
        // 7. 트리거 함수 (updated_at 자동 갱신)
        console.log('📝 트리거 설정 중...');
        
        // corporate_registrations 트리거
        await client.query(`
            CREATE TRIGGER update_corporate_registrations_updated_at 
            BEFORE UPDATE ON corporate_registrations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
        
        // companies 트리거
        await client.query(`
            DROP TRIGGER IF EXISTS update_companies_updated_at ON companies
        `);
        await client.query(`
            CREATE TRIGGER update_companies_updated_at 
            BEFORE UPDATE ON companies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
        
        console.log('✅ 트리거 설정 완료');
        
        // 8. 기본 데이터 설정
        console.log('📝 기본 데이터 설정 중...');
        
        // 기존 사용자들의 role을 employee로 업데이트 (admin 제외)
        await client.query(`
            UPDATE users 
            SET role = 'employee' 
            WHERE role = 'user' OR role IS NULL
        `);
        
        console.log('✅ 기본 데이터 설정 완료');
        
        await client.query('COMMIT');
        console.log('\n🎉 기업 시스템 마이그레이션 성공적으로 완료되었습니다!');
        
        // 마이그레이션 결과 출력
        const tableInfo = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        console.log('\n📊 현재 데이터베이스 테이블:');
        console.log('─'.repeat(50));
        tableInfo.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 마이그레이션 실패:', error.message);
        console.error('상세 오류:', error);
        throw error;
    } finally {
        client.release();
    }
}

// 롤백 함수
async function rollbackCorporateSystem() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🔄 기업 시스템 마이그레이션 롤백 시작...');
        
        // 역순으로 롤백
        // 1. 트리거 제거
        await client.query('DROP TRIGGER IF EXISTS update_corporate_registrations_updated_at ON corporate_registrations');
        
        // 2. 테이블 삭제
        await client.query('DROP TABLE IF EXISTS company_user_logs CASCADE');
        await client.query('DROP TABLE IF EXISTS corporate_codes CASCADE');
        await client.query('DROP TABLE IF EXISTS corporate_registrations CASCADE');
        
        // 3. companies 테이블 컬럼 제거
        await client.query('ALTER TABLE companies DROP COLUMN IF EXISTS business_number');
        await client.query('ALTER TABLE companies DROP COLUMN IF EXISTS ceo_name');
        await client.query('ALTER TABLE companies DROP COLUMN IF EXISTS industry');
        await client.query('ALTER TABLE companies DROP COLUMN IF EXISTS address');
        await client.query('ALTER TABLE companies DROP COLUMN IF EXISTS is_active');
        await client.query('ALTER TABLE companies DROP COLUMN IF EXISTS employee_count');
        
        // 4. users 테이블 컬럼 제거
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS department');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS position');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS employee_number');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS is_active');
        
        // 5. role 제약 조건 원복
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        await client.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('super_admin', 'company_admin', 'user'))
        `);
        
        await client.query('COMMIT');
        console.log('✅ 롤백 완료!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 롤백 실패:', error);
        throw error;
    } finally {
        client.release();
    }
}

// 실행
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'rollback') {
        rollbackCorporateSystem()
            .then(() => {
                console.log('롤백이 성공적으로 완료되었습니다.');
                process.exit(0);
            })
            .catch((error) => {
                console.error('롤백 중 오류 발생:', error);
                process.exit(1);
            });
    } else {
        migrateCorporateSystem()
            .then(() => {
                console.log('\n✨ 마이그레이션이 성공적으로 완료되었습니다!');
                console.log('📌 다음 단계: 기업 가입 API 구현');
                process.exit(0);
            })
            .catch((error) => {
                console.error('마이그레이션 중 오류 발생:', error);
                process.exit(1);
            });
    }
}

module.exports = { migrateCorporateSystem, rollbackCorporateSystem };
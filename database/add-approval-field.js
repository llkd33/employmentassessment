const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addApprovalField() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 관리자 승인 필드 추가 시작...');
    
    // 1. users 테이블에 is_approved 컬럼 추가
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false
    `);
    console.log('✓ users 테이블에 is_approved 컬럼 추가 완료');
    
    // 2. 슈퍼 관리자와 일반 사용자는 자동 승인
    await client.query(`
      UPDATE users 
      SET is_approved = true 
      WHERE role IN ('super_admin', 'user', 'test_admin')
    `);
    console.log('✓ 슈퍼 관리자와 일반 사용자 자동 승인 완료');
    
    // 3. 승인 대기 상태인 관리자 확인
    const pendingAdmins = await client.query(`
      SELECT email, name, company_id 
      FROM users 
      WHERE role = 'company_admin' AND is_approved = false
    `);
    
    if (pendingAdmins.rows.length > 0) {
      console.log('\n📋 승인 대기 중인 기업 관리자:');
      pendingAdmins.rows.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
    }
    
    // 4. 인덱스 추가
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved)
    `);
    console.log('✓ 인덱스 생성 완료');
    
    await client.query('COMMIT');
    console.log('\n✅ 승인 필드 추가 완료!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 실행
if (require.main === module) {
  addApprovalField()
    .then(() => {
      console.log('마이그레이션이 성공적으로 완료되었습니다.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('마이그레이션 중 오류 발생:', error);
      process.exit(1);
    });
}

module.exports = { addApprovalField };
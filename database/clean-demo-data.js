const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function cleanDemoData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 기존 데모 데이터 정리 중...');
    
    // 테스트 답변 삭제
    await client.query('DELETE FROM test_answers');
    console.log('✓ 테스트 답변 삭제 완료');
    
    // 테스트 결과 삭제
    await client.query('DELETE FROM test_results');
    console.log('✓ 테스트 결과 삭제 완료');
    
    // 관리자 활동 로그 삭제
    await client.query('DELETE FROM admin_activity_logs');
    console.log('✓ 관리자 활동 로그 삭제 완료');
    
    // 사용자 삭제 (슈퍼 관리자 제외)
    await client.query(`DELETE FROM users WHERE email NOT IN ('super@admin.com', 'test@admin.com')`);
    console.log('✓ 사용자 데이터 삭제 완료 (슈퍼 관리자 제외)');
    
    await client.query('COMMIT');
    console.log('\n✅ 데이터 정리 완료!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 데이터 정리 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 실행
if (require.main === module) {
  cleanDemoData()
    .then(() => {
      console.log('데이터가 성공적으로 정리되었습니다.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('데이터 정리 중 오류 발생:', error);
      process.exit(1);
    });
}

module.exports = { cleanDemoData };
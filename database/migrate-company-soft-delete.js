const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateCompanySoftDelete() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // status 컬럼 추가: active/inactive/deleted
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='companies' AND column_name='status'
        ) THEN
          ALTER TABLE companies 
          ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' 
          CHECK (status IN ('active','inactive','deleted'));
        END IF;
      END $$;
    `);

    // deleted_at 컬럼 추가
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='companies' AND column_name='deleted_at'
        ) THEN
          ALTER TABLE companies ADD COLUMN deleted_at TIMESTAMP NULL;
        END IF;
      END $$;
    `);

    // 상태 인덱스 (필요 시 필터링 성능)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status)`);

    await client.query('COMMIT');
    console.log('✅ companies 소프트삭제 필드 마이그레이션 완료');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ companies 소프트삭제 마이그레이션 실패:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateCompanySoftDelete()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateCompanySoftDelete;


const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateAdminTypes() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting admin type migration...');
        
        // Start transaction
        await client.query('BEGIN');
        
        // 1. Check if admin_type column exists
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'admin' AND column_name = 'admin_type'
        `);
        
        if (checkColumn.rows.length === 0) {
            // Add admin_type column
            console.log('📝 Adding admin_type column to admin table...');
            await client.query(`
                ALTER TABLE admin 
                ADD COLUMN IF NOT EXISTS admin_type VARCHAR(50) DEFAULT 'sys_admin'
            `);
            
            // Add index for admin_type
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_admin_type 
                ON admin(admin_type)
            `);
        }
        
        // 2. Update existing admins based on role
        console.log('🔄 Updating existing admin types...');
        
        // Set super_admin for role='admin' or username='admin'
        await client.query(`
            UPDATE admin 
            SET admin_type = 'super_admin' 
            WHERE role = 'admin' OR username = 'admin'
        `);
        
        // Set sys_admin for all others
        await client.query(`
            UPDATE admin 
            SET admin_type = 'sys_admin' 
            WHERE admin_type IS NULL OR admin_type = ''
        `);
        
        // 3. Create default super admin if not exists
        const checkSuperAdmin = await client.query(`
            SELECT * FROM admin WHERE admin_type = 'super_admin' LIMIT 1
        `);
        
        if (checkSuperAdmin.rows.length === 0) {
            console.log('📝 Creating default super admin account...');
            const hashedPassword = await bcrypt.hash('super123!', 10);
            
            await client.query(`
                INSERT INTO admin (username, password, role, admin_type, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (username) DO UPDATE 
                SET admin_type = 'super_admin', role = 'admin'
            `, ['superadmin', hashedPassword, 'admin', 'super_admin']);
            
            console.log('✅ Default super admin created:');
            console.log('   Username: superadmin');
            console.log('   Password: super123!');
            console.log('   Type: super_admin');
        }
        
        // 4. Create default sys admin if not exists
        const checkSysAdmin = await client.query(`
            SELECT * FROM admin WHERE admin_type = 'sys_admin' LIMIT 1
        `);
        
        if (checkSysAdmin.rows.length === 0) {
            console.log('📝 Creating default system admin account...');
            const hashedPassword = await bcrypt.hash('sys123!', 10);
            
            await client.query(`
                INSERT INTO admin (username, password, role, admin_type, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (username) DO UPDATE 
                SET admin_type = 'sys_admin', role = 'moderator'
            `, ['sysadmin', hashedPassword, 'moderator', 'sys_admin']);
            
            console.log('✅ Default system admin created:');
            console.log('   Username: sysadmin');
            console.log('   Password: sys123!');
            console.log('   Type: sys_admin');
        }
        
        // 5. Add constraints
        console.log('📝 Adding constraints...');
        await client.query(`
            ALTER TABLE admin 
            ADD CONSTRAINT check_admin_type 
            CHECK (admin_type IN ('super_admin', 'sys_admin'))
        `);
        
        // 6. Display migration results
        const adminStats = await client.query(`
            SELECT 
                admin_type,
                COUNT(*) as count
            FROM admin
            GROUP BY admin_type
        `);
        
        console.log('\n📊 Migration Results:');
        adminStats.rows.forEach(row => {
            console.log(`   ${row.admin_type}: ${row.count} admins`);
        });
        
        // Commit transaction
        await client.query('COMMIT');
        console.log('\n✅ Admin type migration completed successfully!');
        
    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        
        // Check if it's a duplicate constraint error
        if (error.code === '23505') {
            console.log('ℹ️  Admin accounts may already exist. This is normal.');
        } else if (error.code === '42P07') {
            console.log('ℹ️  Constraint already exists. This is normal.');
        } else {
            throw error;
        }
    } finally {
        client.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateAdminTypes()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = migrateAdminTypes;
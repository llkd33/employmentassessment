require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSuperAdmin() {
    try {
        // Check for super admin users
        const result = await pool.query(`
            SELECT user_id, name, email, role 
            FROM users 
            WHERE role = 'super_admin'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Super Admin accounts found:');
            result.rows.forEach(admin => {
                console.log(`   - ${admin.name} (${admin.email}) - Role: ${admin.role}`);
            });
        } else {
            console.log('❌ No Super Admin accounts found.');
            console.log('\n📝 To create a super admin, run:');
            console.log('   node database/create-super-admin.js');
        }
        
        // Show all available admin roles
        const admins = await pool.query(`
            SELECT DISTINCT role, COUNT(*) as count
            FROM users
            WHERE role IN ('super_admin', 'company_admin', 'hr_manager', 'sys_admin')
            GROUP BY role
        `);
        
        console.log('\n📊 Admin Role Summary:');
        admins.rows.forEach(role => {
            console.log(`   - ${role.role}: ${role.count} users`);
        });
        
    } catch (error) {
        console.error('Error checking super admin:', error);
    } finally {
        await pool.end();
    }
}

checkSuperAdmin();
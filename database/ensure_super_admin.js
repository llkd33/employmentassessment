const bcrypt = require('bcryptjs');
const db = require('./database');

async function ensureSuperAdmin() {
    console.log('🚀 Ensuring super admin account exists...');

    try {
        const adminEmail = 'admin@example.com';
        const adminPassword = 'super_secret_password_123';

        const existingAdmin = await db.getUserByEmail(adminEmail);

        if (existingAdmin) {
            if (existingAdmin.role !== 'super_admin') {
                console.log(`⚠️ Found user ${adminEmail} but role is not super_admin. Updating role...`);
                await db.updateUserRole(existingAdmin.user_id, 'super_admin');
                console.log('✅ Role updated to super_admin.');
            } else {
                console.log(`✅ Super admin account (${adminEmail}) already exists and is correct.`);
            }
        } else {
            console.log(`📋 Super admin account not found. Creating new one...`);
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const userId = 'superadmin-' + Date.now();

            const adminData = {
                user_id: userId,
                name: 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                login_type: 'email',
                role: 'super_admin'
            };

            await db.createUser(adminData);
            console.log('🎉 New super admin account created successfully!');
            console.log('   - Email:', adminEmail);
            console.log('   - Password:', adminPassword);
        }
    } catch (error) {
        console.error('❌ Error while ensuring super admin exists:', error);
    }
}

module.exports = ensureSuperAdmin;

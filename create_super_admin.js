require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database/database');

async function createSuperAdmin() {
    console.log('🚀 슈퍼 관리자 계정 생성을 시작합니다...');

    try {
        const adminEmail = 'admin@example.com';
        const adminPassword = 'super_secret_password_123';

        // 1. Check if admin already exists
        const existingAdmin = await db.getUserByEmail(adminEmail);
        if (existingAdmin) {
            console.log(`✅ 슈퍼 관리자 계정(${adminEmail})이 이미 존재합니다.`);
            // Optional: Check if role is correct
            if (existingAdmin.role !== 'super_admin') {
                console.log('⚠️  기존 계정의 역할이 super_admin이 아닙니다. 역할을 업데이트합니다.');
                // updateUserRole function needs to be implemented or verified
                // For now, we will just log this.
                console.log('updateUserRole 함수를 구현하여 역할을 업데이트할 수 있습니다.');
            }
            return;
        }

        // 2. Create new super admin user
        console.log('📋 새로운 슈퍼 관리자 계정을 생성합니다...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const userId = 'superadmin-' + Date.now();

        const adminData = {
            user_id: userId,
            name: 'Super Admin',
            email: adminEmail,
            password: hashedPassword,
            login_type: 'email',
            role: 'super_admin' // Set the role here
        };

        const newUser = await db.createUser(adminData);

        console.log('🎉 슈퍼 관리자 계정이 성공적으로 생성되었습니다!');
        console.log('===========================================');
        console.log(`   이메일 (ID): ${newUser.email}`);
        console.log(`   초기 비밀번호: ${adminPassword}`);
        console.log('===========================================');
        console.log('🚨 보안을 위해 이 스크립트를 실행한 후 즉시 비밀번호를 변경해주세요.');

    } catch (error) {
        console.error('❌ 슈퍼 관리자 생성 중 오류가 발생했습니다:', error);
    } finally {
        if (db.pool) {
            await db.pool.end();
            console.log('🔌 데이터베이스 연결이 종료되었습니다.');
        }
    }
}

createSuperAdmin();

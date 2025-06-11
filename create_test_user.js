require('dotenv').config();
const bcrypt = require('bcrypt');
const Database = require('./server/database');

async function createTestUser() {
    const db = new Database();

    try {
        console.log('🔍 데이터베이스 연결 중...');

        // 테스트 계정 정보
        const testUsers = [
            {
                user_id: '1749584003018',
                name: '김민희',
                email: 'minheekim@test.com',
                password: 'test123',
                login_type: 'email'
            },
            {
                user_id: 'test_user_001',
                name: '테스트 사용자',
                email: 'test@test.com',
                password: 'test123',
                login_type: 'email'
            },
            {
                user_id: 'demo_user_001',
                name: '데모 사용자',
                email: 'demo@example.com',
                password: 'demo123',
                login_type: 'email'
            }
        ];

        for (const userData of testUsers) {
            // 기존 사용자 확인
            const existingUser = await db.getUserByEmail(userData.email);

            if (existingUser) {
                console.log(`✅ 사용자 ${userData.email}이 이미 존재합니다.`);
                continue;
            }

            // 비밀번호 해시화
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // 사용자 생성
            const newUserData = {
                ...userData,
                password: hashedPassword
            };

            await db.createUser(newUserData);
            console.log(`✅ 테스트 사용자 생성 완료: ${userData.name} (${userData.email})`);
        }

        // 사용자 목록 확인
        console.log('\n📋 현재 데이터베이스의 사용자 목록:');
        const stats = await db.getTestStats();
        console.log(`총 사용자 수: ${stats.totalUsers}명`);

        process.exit(0);

    } catch (error) {
        console.error('❌ 사용자 생성 오류:', error);
        process.exit(1);
    }
}

createTestUser(); 
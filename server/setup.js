const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function setupEnvironment() {
    console.log('🚀 신입사원 역량테스트 시스템 설정을 시작합니다!\n');

    try {
        // 1. 환경 선택
        console.log('📋 배포 환경을 선택하세요:');
        console.log('1. 로컬 개발 (Local Development)');
        console.log('2. Supabase');
        console.log('3. Railway');
        console.log('4. Heroku');
        console.log('5. 기타 (Other)\n');

        const envChoice = await askQuestion('선택 (1-5): ');

        // 2. 데이터베이스 URL 입력
        let databaseUrl = '';

        switch (envChoice) {
            case '1':
                databaseUrl = 'postgresql://postgres:password@localhost:5432/employee_assessment';
                console.log('💡 로컬 PostgreSQL 설정이 필요합니다.');
                break;
            case '2':
                console.log('📌 Supabase 설정:');
                console.log('   1. https://supabase.com 에서 프로젝트 생성');
                console.log('   2. Settings > Database에서 Connection string 복사');
                databaseUrl = await askQuestion('Database URL을 입력하세요: ');
                break;
            case '3':
                console.log('🚂 Railway 설정:');
                console.log('   1. https://railway.app 에서 PostgreSQL 생성');
                console.log('   2. Variables 탭에서 DATABASE_URL 복사');
                databaseUrl = await askQuestion('Database URL을 입력하세요: ');
                break;
            case '4':
                console.log('🟣 Heroku 설정:');
                console.log('   heroku config:get DATABASE_URL 명령어로 확인');
                databaseUrl = await askQuestion('Database URL을 입력하세요: ');
                break;
            case '5':
                databaseUrl = await askQuestion('Database URL을 입력하세요: ');
                break;
            default:
                console.log('❌ 잘못된 선택입니다.');
                process.exit(1);
        }

        // 3. 기타 설정
        const nodeEnv = await askQuestion('NODE_ENV (development/production) [development]: ') || 'development';
        const port = await askQuestion('PORT [3000]: ') || '3000';
        const sessionSecret = await askQuestion('SESSION_SECRET (비밀키) [random-generated]: ') || generateRandomSecret();

        // 4. .env 파일 생성
        const envContent = `# 신입사원 역량테스트 시스템 환경설정
# 생성일: ${new Date().toISOString()}

# 데이터베이스 설정
DATABASE_URL=${databaseUrl}

# 서버 설정
NODE_ENV=${nodeEnv}
PORT=${port}

# 보안 설정
SESSION_SECRET=${sessionSecret}

# CORS 설정 (필요시 수정)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:${port}

# 카카오 API (필요시 추가)
# KAKAO_APP_KEY=your-kakao-app-key
`;

        fs.writeFileSync('.env', envContent);
        console.log('\n✅ .env 파일이 생성되었습니다!');

        // 5. 의존성 설치 확인
        const installDeps = await askQuestion('\n의존성을 설치하시겠습니까? (y/n) [y]: ') || 'y';

        if (installDeps.toLowerCase() === 'y') {
            console.log('📦 의존성을 설치하는 중...');
            const { spawn } = require('child_process');

            const npmInstall = spawn('npm', ['install'], { stdio: 'inherit' });

            npmInstall.on('close', async (code) => {
                if (code === 0) {
                    console.log('✅ 의존성 설치 완료!');

                    // 6. 데이터베이스 연결 테스트
                    const testDb = await askQuestion('\n데이터베이스 연결을 테스트하시겠습니까? (y/n) [y]: ') || 'y';

                    if (testDb.toLowerCase() === 'y') {
                        console.log('🔌 데이터베이스 연결을 테스트하는 중...');
                        try {
                            const { spawn: testSpawn } = require('child_process');
                            const testProcess = testSpawn('npm', ['run', 'test-db'], { stdio: 'inherit' });

                            testProcess.on('close', (testCode) => {
                                if (testCode === 0) {
                                    console.log('\n🎉 설정이 완료되었습니다!');
                                    showNextSteps(envChoice);
                                } else {
                                    console.log('\n⚠️  데이터베이스 연결에 실패했습니다.');
                                    console.log('DATABASE_URL을 확인해주세요.');
                                }
                                rl.close();
                            });
                        } catch (error) {
                            console.error('데이터베이스 테스트 중 오류:', error.message);
                            rl.close();
                        }
                    } else {
                        console.log('\n🎉 설정이 완료되었습니다!');
                        showNextSteps(envChoice);
                        rl.close();
                    }
                } else {
                    console.log('❌ 의존성 설치에 실패했습니다.');
                    rl.close();
                }
            });
        } else {
            console.log('\n🎉 환경 설정이 완료되었습니다!');
            console.log('수동으로 의존성을 설치하세요: npm install');
            showNextSteps(envChoice);
            rl.close();
        }

    } catch (error) {
        console.error('❌ 설정 중 오류가 발생했습니다:', error.message);
        rl.close();
    }
}

function generateRandomSecret() {
    return require('crypto').randomBytes(32).toString('hex');
}

function showNextSteps(envChoice) {
    console.log('\n📝 다음 단계:');

    if (envChoice === '1') {
        console.log('1. PostgreSQL 서버를 시작하세요');
        console.log('2. 데이터베이스를 생성하세요: createdb employee_assessment');
    }

    console.log('3. 데이터베이스 스키마 생성: database-schema.sql 실행');
    console.log('4. 기존 데이터 마이그레이션: npm run init-db');
    console.log('5. 서버 시작: npm start');
    console.log('\n📖 자세한 내용은 deployment-guide.md를 참고하세요!');
}

// 인터럽트 처리
process.on('SIGINT', () => {
    console.log('\n\n설정이 취소되었습니다.');
    rl.close();
    process.exit(0);
});

// 메인 실행
if (require.main === module) {
    setupEnvironment();
}

module.exports = { setupEnvironment }; 
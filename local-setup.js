#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🚀 신입사원 역량검사 시스템 로컬 설정을 시작합니다...\n');

// 1. .env 파일 생성
function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, 'env.example');

    if (fs.existsSync(envPath)) {
        console.log('✅ .env 파일이 이미 존재합니다.');
        return;
    }

    if (fs.existsSync(envExamplePath)) {
        const envContent = fs.readFileSync(envExamplePath, 'utf8');

        // 기본값으로 설정
        const defaultEnv = envContent
            .replace('username:password@localhost:5432/employee_assessment',
                'postgres:postgres@localhost:5432/employee_assessment')
            .replace('your_super_secret_jwt_key_here_change_this_in_production',
                `secret_key_${Date.now()}_${Math.random().toString(36).substring(7)}`)
            .replace('your_kakao_javascript_key_here', '');

        fs.writeFileSync(envPath, defaultEnv);
        console.log('✅ .env 파일이 생성되었습니다.');
    } else {
        console.log('❌ env.example 파일을 찾을 수 없습니다.');
    }
}

// 2. 의존성 설치 확인
function checkDependencies() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
            console.log('📦 의존성을 설치하는 중...');
            exec('npm install', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ 의존성 설치 실패:', error);
                    reject(error);
                } else {
                    console.log('✅ 의존성 설치 완료');
                    resolve();
                }
            });
        } else {
            console.log('✅ 의존성이 이미 설치되어 있습니다.');
            resolve();
        }
    });
}

// 3. 데이터베이스 연결 테스트
function testDatabaseConnection() {
    return new Promise((resolve, reject) => {
        console.log('🔍 데이터베이스 연결을 테스트하는 중...');
        exec('npm run test-db', (error, stdout, stderr) => {
            if (error) {
                console.log('⚠️  데이터베이스 연결 실패 - PostgreSQL 설정을 확인하세요');
                console.log('   1. PostgreSQL이 설치되어 있는지 확인하세요');
                console.log('   2. PostgreSQL 서비스가 실행 중인지 확인하세요');
                console.log('   3. employee_assessment 데이터베이스를 생성하세요:');
                console.log('      createdb employee_assessment');
                console.log('   4. .env 파일의 DATABASE_URL을 확인하세요\n');
                resolve(false);
            } else {
                console.log('✅ 데이터베이스 연결 성공');
                resolve(true);
            }
        });
    });
}

// 4. 데이터베이스 초기화
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🗄️  데이터베이스를 초기화하는 중...');
        exec('npm run init-db', (error, stdout, stderr) => {
            if (error) {
                console.log('⚠️  데이터베이스 초기화 실패:', stderr);
                resolve(false);
            } else {
                console.log('✅ 데이터베이스 초기화 완료');
                resolve(true);
            }
        });
    });
}

// 메인 실행 함수
async function main() {
    try {
        // 1. .env 파일 생성
        createEnvFile();

        // 2. 의존성 설치
        await checkDependencies();

        // 3. 데이터베이스 연결 테스트
        const dbConnected = await testDatabaseConnection();

        // 4. 데이터베이스 초기화 (연결 성공 시에만)
        if (dbConnected) {
            await initializeDatabase();
        }

        console.log('\n🎉 로컬 설정이 완료되었습니다!');
        console.log('\n🚀 서버를 시작하려면 다음 명령을 실행하세요:');
        console.log('   npm start');
        console.log('\n📱 브라우저에서 다음 주소로 접속하세요:');
        console.log('   http://localhost:5000');

        if (!dbConnected) {
            console.log('\n⚠️  데이터베이스 설정이 필요합니다:');
            console.log('   1. PostgreSQL 설치 및 실행');
            console.log('   2. 데이터베이스 생성: createdb employee_assessment');
            console.log('   3. .env 파일의 DATABASE_URL 수정');
            console.log('   4. 다시 npm run setup 실행');
        }

    } catch (error) {
        console.error('❌ 설정 중 오류가 발생했습니다:', error);
        process.exit(1);
    }
}

// 스크립트 실행
main(); 
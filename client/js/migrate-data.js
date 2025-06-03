const fs = require('fs');
const path = require('path');
const db = require('./database');

// JSON 데이터 읽기 함수
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`파일을 읽을 수 없습니다: ${filePath}`);
        return null;
    }
}

// 데이터 마이그레이션 함수
async function migrateData() {
    console.log('🚀 데이터 마이그레이션을 시작합니다...');

    try {
        // 1. 사용자 데이터 마이그레이션
        const usersPath = path.join(__dirname, 'data', 'users.json');
        const usersData = readJsonFile(usersPath);

        if (usersData && usersData.length > 0) {
            console.log(`📝 ${usersData.length}명의 사용자를 마이그레이션 중...`);

            for (const user of usersData) {
                try {
                    // 기존 사용자가 있는지 확인
                    const existingUser = await db.getUserByEmail(user.email);
                    if (!existingUser) {
                        await db.createUser({
                            user_id: user.id,
                            name: user.name,
                            email: user.email,
                            login_type: user.loginType || 'email'
                        });
                        console.log(`  ✅ 사용자 생성: ${user.email}`);
                    } else {
                        console.log(`  ⚠️  이미 존재하는 사용자: ${user.email}`);
                    }
                } catch (error) {
                    console.error(`  ❌ 사용자 생성 실패 (${user.email}):`, error.message);
                }
            }
        } else {
            console.log('📝 마이그레이션할 사용자 데이터가 없습니다.');
        }

        // 2. 테스트 결과 데이터 마이그레이션
        const resultsPath = path.join(__dirname, 'data', 'test-results.json');
        const resultsData = readJsonFile(resultsPath);

        if (resultsData && resultsData.length > 0) {
            console.log(`📊 ${resultsData.length}개의 테스트 결과를 마이그레이션 중...`);

            for (const result of resultsData) {
                try {
                    // 기존 테스트 결과가 있는지 확인 (세션 ID로)
                    if (result.sessionId) {
                        const existingResult = await db.getTestResultBySessionId(result.sessionId);
                        if (existingResult) {
                            console.log(`  ⚠️  이미 존재하는 테스트 결과: ${result.sessionId}`);
                            continue;
                        }
                    }

                    // 답변 배열 변환
                    const answers = [];
                    if (result.answers && typeof result.answers === 'object') {
                        // answers가 객체인 경우 (questionId: answer 형태)
                        for (const [questionId, answer] of Object.entries(result.answers)) {
                            answers.push({
                                id: parseInt(questionId),
                                answer: answer
                            });
                        }
                    } else if (Array.isArray(result.answers)) {
                        // answers가 배열인 경우
                        answers.push(...result.answers);
                    }

                    const testData = {
                        result_id: result.id,
                        session_id: result.sessionId || `migrated_${result.id}`,
                        user_id: result.userId || 'anonymous',
                        overall_score: result.overallScore,
                        problem_solving_score: result.competencyScores?.problemSolving || 0,
                        communication_score: result.competencyScores?.communication || 0,
                        leadership_score: result.competencyScores?.leadership || 0,
                        creativity_score: result.competencyScores?.creativity || 0,
                        teamwork_score: result.competencyScores?.teamwork || 0,
                        test_date: result.testDate || result.submittedAt || new Date().toISOString(),
                        submitted_at: result.submittedAt || result.testDate || new Date().toISOString(),
                        answers: answers
                    };

                    await db.createTestResult(testData);
                    console.log(`  ✅ 테스트 결과 생성: ${testData.session_id} (점수: ${testData.overall_score})`);
                } catch (error) {
                    console.error(`  ❌ 테스트 결과 생성 실패 (${result.id}):`, error.message);
                }
            }
        } else {
            console.log('📊 마이그레이션할 테스트 결과 데이터가 없습니다.');
        }

        // 3. 마이그레이션 결과 확인
        const stats = await db.getTestStats();
        console.log('\n📈 마이그레이션 완료 통계:');
        console.log(`  👥 총 사용자 수: ${stats.totalUsers}명`);
        console.log(`  📝 총 테스트 수: ${stats.totalTests}개`);
        console.log(`  📊 평균 점수: ${stats.averageScore}점`);

        console.log('\n✅ 데이터 마이그레이션이 완료되었습니다!');

    } catch (error) {
        console.error('❌ 마이그레이션 중 오류 발생:', error);
    }
}

// JSON 백업 생성
async function createBackup() {
    console.log('💾 현재 데이터베이스 백업을 생성합니다...');

    try {
        const users = await db.getAllUsers();
        const testResults = await db.getAllTestResults(1000); // 최대 1000개

        // 백업 디렉토리 생성
        const backupDir = path.join(__dirname, 'backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        // 현재 날짜로 백업 파일명 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // 사용자 백업
        fs.writeFileSync(
            path.join(backupDir, `users-${timestamp}.json`),
            JSON.stringify(users, null, 2)
        );

        // 테스트 결과 백업
        fs.writeFileSync(
            path.join(backupDir, `test-results-${timestamp}.json`),
            JSON.stringify(testResults, null, 2)
        );

        console.log(`✅ 백업 완료: backup/ 디렉토리에 저장되었습니다.`);
    } catch (error) {
        console.error('❌ 백업 생성 실패:', error);
    }
}

// 스크립트 실행
async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'migrate':
            await migrateData();
            break;
        case 'backup':
            await createBackup();
            break;
        case 'both':
            await createBackup();
            await migrateData();
            break;
        default:
            console.log('사용법:');
            console.log('  node migrate-data.js migrate  - JSON 데이터를 DB로 마이그레이션');
            console.log('  node migrate-data.js backup   - DB 데이터를 JSON으로 백업');
            console.log('  node migrate-data.js both     - 백업 후 마이그레이션');
            break;
    }

    // 데이터베이스 연결 종료
    await db.close();
    process.exit(0);
}

// 오류 처리
process.on('unhandledRejection', (error) => {
    console.error('처리되지 않은 Promise 거부:', error);
    process.exit(1);
});

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = { migrateData, createBackup }; 
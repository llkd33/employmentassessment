// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
    // 로그인 상태 확인
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        alert('로그인이 필요한 페이지입니다.');
        window.location.href = '/';
        return;
    }
});

// 테스트 제출 함수 (더미 데이터 생성)
function submitTest() {
    console.log('더미 테스트 결과 생성 중...');

    // 더 현실적인 더미 결과 생성
    const dummyResult = {
        answers: {},
        completedAt: new Date().toISOString(),
        totalQuestions: 75,
        answeredQuestions: 75
    };

    // 각 역량별로 다른 경향의 답변 생성
    const competencyTendencies = {
        leadership: { min: 1, max: 4, bias: 2.5 },      // 리더십: 중간~높음
        communication: { min: 2, max: 4, bias: 3 },     // 커뮤니케이션: 높음
        creativity: { min: 0, max: 3, bias: 2 },        // 창의성: 중간
        problemSolving: { min: 1, max: 4, bias: 3.2 },  // 문제해결: 높음
        teamwork: { min: 2, max: 4, bias: 3.5 }         // 협업: 매우 높음
    };

    // 역량별 문항 범위
    const ranges = {
        leadership: { start: 1, end: 15 },
        communication: { start: 16, end: 30 },
        creativity: { start: 31, end: 45 },
        problemSolving: { start: 46, end: 60 },
        teamwork: { start: 61, end: 75 }
    };

    // 각 역량별로 답변 생성
    Object.keys(ranges).forEach(competency => {
        const range = ranges[competency];
        const tendency = competencyTendencies[competency];

        for (let questionId = range.start; questionId <= range.end; questionId++) {
            // 정규분포를 시뮬레이션한 가중 랜덤
            let answer;
            const random = Math.random();

            if (random < 0.1) {
                answer = tendency.min;
            } else if (random < 0.3) {
                answer = Math.min(tendency.max, Math.ceil(tendency.bias - 1));
            } else if (random < 0.7) {
                answer = Math.min(tendency.max, Math.round(tendency.bias));
            } else if (random < 0.9) {
                answer = Math.min(tendency.max, Math.ceil(tendency.bias));
            } else {
                answer = tendency.max;
            }

            dummyResult.answers[questionId] = Math.max(tendency.min, Math.min(tendency.max, answer));
        }
    });

    console.log('생성된 더미 답변:', dummyResult.answers);
    console.log('역량별 예상 점수:');

    // 예상 점수 미리 계산해서 로그 출력
    Object.keys(ranges).forEach(competency => {
        const range = ranges[competency];
        let total = 0;
        for (let i = range.start; i <= range.end; i++) {
            total += [0, 25, 50, 75, 100][dummyResult.answers[i]];
        }
        console.log(`${competency}: ${Math.round(total / 15)}점`);
    });

    localStorage.setItem('testResult', JSON.stringify(dummyResult));
    window.location.href = '/result.html';
} 
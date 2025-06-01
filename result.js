// 역량별 평가 기준
const competencyMapping = {
    'leadership': 'leadership',
    'communication': 'communication',
    'creativity': 'creativity',
    'problemSolving': 'problemSolving',
    'teamwork': 'teamwork'
};

// 5점 척도 점수 매핑
const scoreMapping = {
    0: 0,   // 매우 아니다
    1: 25,  // 아니다
    2: 50,  // 보통
    3: 75,  // 그렇다
    4: 100  // 매우 그렇다
};

// 역량별 문항 범위 (1-based index)
const competencyRanges = {
    leadership: { start: 1, end: 15 },      // 1-15번
    communication: { start: 16, end: 30 },   // 16-30번  
    creativity: { start: 31, end: 45 },      // 31-45번
    problemSolving: { start: 46, end: 60 },  // 46-60번
    teamwork: { start: 61, end: 75 }         // 61-75번
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
    initializeResultPage();
});

// 결과 페이지 초기화
function initializeResultPage() {
    // 로그인 상태 확인
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        alert('로그인이 필요한 페이지입니다.');
        window.location.href = '/';
        return;
    }

    // 테스트 결과 확인
    const testResult = localStorage.getItem('testResult');
    if (!testResult) {
        alert('테스트 결과를 찾을 수 없습니다. 테스트를 먼저 진행해주세요.');
        window.location.href = '/';
        return;
    }

    // 결과 계산 및 표시
    calculateAndDisplayResults(JSON.parse(testResult));
}

// 결과 계산 및 표시
function calculateAndDisplayResults(testResult) {
    console.log('테스트 결과 데이터:', testResult);
    console.log('답변 데이터:', testResult.answers);

    // 역량별 점수 계산
    const competencyScores = {};

    // 각 역량별로 점수 계산
    Object.keys(competencyRanges).forEach(competency => {
        const range = competencyRanges[competency];
        let totalScore = 0;
        let questionCount = 0;

        console.log(`\n=== ${competency} 역량 계산 ===`);
        console.log(`문항 범위: ${range.start} - ${range.end}`);

        // 해당 역량의 문항들 점수 합계
        for (let questionId = range.start; questionId <= range.end; questionId++) {
            const answerValue = testResult.answers[questionId];
            if (answerValue !== undefined) {
                const score = scoreMapping[answerValue] || 0;
                totalScore += score;
                questionCount++;
                console.log(`문항 ${questionId}: 답변=${answerValue}, 점수=${score}`);
            } else {
                console.log(`문항 ${questionId}: 답변 없음`);
            }
        }

        // 평균 점수 계산 (0-100점)
        competencyScores[competency] = questionCount > 0 ?
            Math.round(totalScore / questionCount) : 0;

        console.log(`${competency} 총점: ${totalScore}, 문항수: ${questionCount}, 평균: ${competencyScores[competency]}`);
    });

    console.log('\n최종 역량별 점수:', competencyScores);

    // 종합 점수 계산 (모든 역량 평균)
    const competencyValues = Object.values(competencyScores);
    const overallScore = competencyValues.length > 0 ?
        Math.round(competencyValues.reduce((sum, score) => sum + score, 0) / competencyValues.length) : 0;

    console.log('종합 점수:', overallScore);

    // 결과 표시
    displayOverallScore(overallScore);
    displayCompetencyScores(competencyScores);
    displayTestInfo(testResult);

    // 자동 저장
    autoSaveResult(testResult, competencyScores, overallScore);

    // 애니메이션 효과
    animateResults();
}

// 자동 저장 함수
function autoSaveResult(testResult, competencyScores, overallScore) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo) {
        console.error('사용자 정보가 없어 저장할 수 없습니다.');
        return;
    }

    const resultData = {
        userInfo: userInfo,
        testResult: testResult,
        competencyScores: competencyScores,
        overallScore: overallScore,
        savedAt: new Date().toISOString(),
        testDate: testResult.completedAt || new Date().toISOString()
    };

    // 기존 저장된 결과들 가져오기
    let savedResults = JSON.parse(localStorage.getItem('savedResults')) || [];

    // 새 결과 추가
    savedResults.push(resultData);

    // 최대 10개까지만 보관 (오래된 것부터 삭제)
    if (savedResults.length > 10) {
        savedResults = savedResults.slice(-10);
    }

    // 저장
    localStorage.setItem('savedResults', JSON.stringify(savedResults));

    console.log('결과가 자동 저장되었습니다:', resultData);
}

// 종합 점수 표시
function displayOverallScore(score) {
    document.getElementById('overallScore').textContent = score;
}

// 역량별 점수 표시
function displayCompetencyScores(scores) {
    Object.entries(scores).forEach(([competency, score]) => {
        // 점수 숫자 표시 업데이트
        const scoreElement = document.querySelector(`.competency-score[data-competency="${competency}"]`);
        if (scoreElement) {
            scoreElement.textContent = score;
        }

        // 프로그레스 바 너비 업데이트
        const fillElement = document.querySelector(`.competency-fill[data-competency="${competency}"]`);
        if (fillElement) {
            fillElement.style.width = `${score}%`;
        }

        console.log(`${competency}: ${score}점, 프로그레스 바 너비: ${score}%`);
    });
}

// 테스트 정보 표시
function displayTestInfo(testResult) {
    // 완료 시간 표시
    const completedTime = new Date(testResult.completedAt);
    document.getElementById('completedTime').textContent =
        completedTime.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    // 응답 문항 수 표시
    const answeredCount = Object.keys(testResult.answers).length;
    document.getElementById('answeredQuestions').textContent = `${answeredCount} / 75`;
}

// 결과 애니메이션
function animateResults() {
    // 프로그레스 바 애니메이션
    setTimeout(() => {
        const progressBars = document.querySelectorAll('.competency-fill');
        progressBars.forEach(bar => {
            const targetWidth = bar.style.width || '0%';
            bar.style.width = '0%';
            bar.style.transition = 'width 1.5s ease-out';
            setTimeout(() => {
                bar.style.width = targetWidth;
            }, 100);
        });
    }, 500);

    // 카드 애니메이션
    const cards = document.querySelectorAll('.competency-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
}

// 홈으로 이동
function goHome() {
    window.location.href = '/';
}

// 마이페이지로 이동
function goToMyPage() {
    window.location.href = '/mypage.html';
}

// 로그아웃
function handleLogout() {
    if (confirm('로그아웃하시겠습니까?')) {
        localStorage.removeItem('userInfo');
        window.location.href = '/';
    }
} 
// 마이페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('마이페이지 로딩 시작');

    // 로그인 상태 확인
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        alert('로그인이 필요한 페이지입니다.');
        window.location.href = '/';
        return;
    }

    try {
        const user = JSON.parse(userInfo);
        loadUserProfile(user);
        updateTestScore();
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        localStorage.removeItem('userInfo');
        alert('사용자 정보에 오류가 있습니다. 다시 로그인해주세요.');
        window.location.href = '/';
    }

    // 페이지 애니메이션
    animatePageLoad();

    console.log('마이페이지 로딩 완료 - HTML 그래프 사용');
});

// 사용자 프로필 정보 로드
function loadUserProfile(user) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const joinDate = document.getElementById('joinDate');

    if (userName) {
        userName.textContent = user.name || user.nickname || '사용자';
    }

    if (userEmail) {
        userEmail.textContent = user.email || 'example@email.com';
    }

    if (joinDate && user.joinDate) {
        const joinDateObj = new Date(user.joinDate);
        const year = joinDateObj.getFullYear();
        const month = String(joinDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(joinDateObj.getDate()).padStart(2, '0');
        joinDate.textContent = `가입일: ${year}.${month}.${day}`;
    }
}

// 테스트 점수 업데이트
function updateTestScore() {
    // 저장된 결과들 가져오기
    const savedResults = JSON.parse(localStorage.getItem('savedResults')) || [];
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo) {
        console.error('사용자 정보가 없습니다.');
        return;
    }

    // 현재 사용자의 결과만 필터링하고 유효한 데이터만 선택
    const userResults = savedResults.filter(result => {
        // 기본 유효성 검사
        if (!result.userInfo || result.userInfo.email !== userInfo.email) {
            return false;
        }

        // 점수가 유효한지 확인 (0-100 범위)
        if (!result.overallScore || result.overallScore < 0 || result.overallScore > 100) {
            return false;
        }

        // 날짜가 유효한지 확인
        const dateString = result.testDate || result.savedAt;
        if (!dateString) {
            return false;
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return false;
        }

        // 역량별 점수가 존재하는지 확인
        if (!result.competencyScores || Object.keys(result.competencyScores).length === 0) {
            return false;
        }

        return true;
    });

    // 유효한 결과만 다시 저장 (더미 데이터 정리)
    if (userResults.length !== savedResults.filter(r => r.userInfo && r.userInfo.email === userInfo.email).length) {
        const otherUsersResults = savedResults.filter(result =>
            !result.userInfo || result.userInfo.email !== userInfo.email
        );
        const cleanedResults = [...otherUsersResults, ...userResults];
        localStorage.setItem('savedResults', JSON.stringify(cleanedResults));
        console.log('더미 데이터 정리 완료. 유효한 결과:', userResults.length, '개');
    }

    console.log('사용자 테스트 결과:', userResults);

    // 최신 결과 표시
    const overallScore = document.getElementById('overallScore');
    if (userResults.length > 0) {
        const latestResult = userResults[userResults.length - 1];
        if (overallScore) {
            overallScore.textContent = `${latestResult.overallScore}점`;
        }

        // 차트 업데이트
        updateTrendChart(userResults);
    } else {
        // 테스트 결과가 없는 경우
        if (overallScore) {
            overallScore.textContent = '-';
        }

        // 빈 차트 표시
        updateTrendChart([]);
    }
}

// 결과 추이 차트 업데이트
function updateTrendChart(userResults) {
    const chartContainer = document.querySelector('.chart-area');
    if (!chartContainer) return;

    const svg = chartContainer.querySelector('.line-chart');
    if (!svg) return;

    // 기존 차트 내용 제거
    svg.innerHTML = '';

    if (userResults.length === 0) {
        // 결과가 없을 때
        svg.innerHTML = `
            <text x="300" y="150" text-anchor="middle" fill="#64748b" font-size="20" font-weight="500">
                아직 테스트 결과가 없습니다
            </text>
            <text x="300" y="180" text-anchor="middle" fill="#94a3b8" font-size="16">
                테스트를 진행하면 결과가 여기에 표시됩니다
            </text>
        `;

        // 차트 설명 업데이트
        const chartNote = document.querySelector('.chart-note p');
        if (chartNote) {
            chartNote.textContent = `💡 테스트를 진행하면 결과가 여기에 표시됩니다.`;
        }
        return;
    }

    // 격자선 추가
    const gridLines = `
        <g class="grid-lines">
            <line x1="50" y1="80" x2="550" y2="80" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="120" x2="550" y2="120" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="160" x2="550" y2="160" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="200" x2="550" y2="200" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="240" x2="550" y2="240" stroke="#e2e8f0" stroke-width="1" />
        </g>
    `;
    svg.innerHTML += gridLines;

    // 최대 5개 결과만 표시
    const displayResults = userResults.slice(-5);
    const pointCount = displayResults.length;

    // 날짜 유효성 검사 및 월.일 추출 함수
    function getValidDate(result) {
        let date;

        // testDate 또는 savedAt 사용
        const dateString = result.testDate || result.savedAt;

        if (dateString) {
            date = new Date(dateString);
            // 유효한 날짜인지 확인
            if (!isNaN(date.getTime())) {
                const month = date.getMonth() + 1; // 1-12월
                const day = date.getDate(); // 1-31일
                return `${month}.${day}`;
            }
        }

        // 유효하지 않으면 현재 날짜 반환
        const now = new Date();
        return `${now.getMonth() + 1}.${now.getDate()}`;
    }

    // y좌표 계산 함수 (0-100점을 차트 높이에 맞게 변환)
    function calculateY(score) {
        // 차트 영역: 70~230 (더 여유있는 범위)
        // 100점 = y:70, 0점 = y:230
        const minY = 70;  // 최상단 (100점 위치)
        const maxY = 230; // 최하단 (0점 위치)
        const range = maxY - minY;

        // 점수를 y좌표로 변환 (점수가 높을수록 y값이 작아짐)
        return maxY - (score / 100) * range;
    }

    if (pointCount === 1) {
        // 결과가 1개인 경우 - 점만 표시
        const result = displayResults[0];
        const date = getValidDate(result);
        const x = 300; // 중앙
        const y = calculateY(result.overallScore);

        svg.innerHTML += `
            <circle cx="${x}" cy="${y}" r="6" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
            <text x="${x}" y="${y - 15}" text-anchor="middle" fill="#1e293b" font-size="18" font-weight="700">${result.overallScore}점</text>
            <text x="${x}" y="275" text-anchor="middle" fill="#64748b" font-size="16" font-weight="700">${date}</text>
        `;
    } else {
        // 여러 결과가 있는 경우 - 선과 점 표시
        const points = [];
        let svgContent = '';

        displayResults.forEach((result, index) => {
            const date = getValidDate(result);
            const x = 100 + (index * (400 / (pointCount - 1))); // 균등 분배
            const y = calculateY(result.overallScore);

            points.push(`${x},${y}`);

            // 점 추가
            svgContent += `
                <circle cx="${x}" cy="${y}" r="6" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
                <text x="${x}" y="${y - 15}" text-anchor="middle" fill="#1e293b" font-size="18" font-weight="700">${result.overallScore}점</text>
                <text x="${x}" y="275" text-anchor="middle" fill="#64748b" font-size="16" font-weight="700">${date}</text>
            `;
        });

        // 연결선 추가
        if (points.length > 1) {
            svgContent = `
                <polyline points="${points.join(' ')}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" />
            ` + svgContent;
        }

        svg.innerHTML += svgContent;
    }

    // 차트 설명 업데이트 - 1회, 2회 등 정확한 표현 사용
    const chartNote = document.querySelector('.chart-note p');
    if (chartNote) {
        const testCount = userResults.length;
        if (testCount === 1) {
            chartNote.textContent = `💡 현재까지 1회의 테스트를 완료했습니다.`;
        } else {
            chartNote.textContent = `💡 현재까지 ${testCount}회의 테스트를 완료했습니다.`;
        }
    }
}

// 홈으로 이동
function goHome() {
    window.location.href = '/';
}

// 로고 클릭 시 홈으로 이동
function goToHome() {
    window.location.href = './index.html';
}

// 로그아웃 처리
function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('userInfo');
        showNotification('로그아웃되었습니다.', 'info');

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }
}

// 알림 표시 함수
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        font-weight: 500;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1000;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 페이지 로드 애니메이션
function animatePageLoad() {
    const sections = document.querySelectorAll('.profile-section, .test-results-section');
    const header = document.querySelector('.header');

    // 초기 상태 설정
    header.style.opacity = '0';
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
    });

    // 애니메이션 적용
    setTimeout(() => {
        header.style.transition = 'opacity 0.5s ease';
        header.style.opacity = '1';

        sections.forEach((section, index) => {
            setTimeout(() => {
                section.style.transition = 'all 0.5s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }, 100);
}

// 계정 탈퇴 처리
function handleAccountDelete() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const userName = userInfo ? (userInfo.name || userInfo.nickname || '사용자') : '사용자';
    const userEmail = userInfo ? userInfo.email : '';

    if (confirm(`정말로 탈퇴하시겠습니까?\n\n${userName}님의 모든 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`)) {
        if (confirm('마지막 확인입니다.\n정말로 탈퇴하시겠습니까?')) {
            console.log(`=== ${userName}(${userEmail}) 계정 삭제 시작 ===`);

            // 1. 현재 로그인 정보 삭제
            localStorage.removeItem('userInfo');
            localStorage.removeItem('rememberLogin'); // 자동 로그인 정보도 삭제
            console.log('✓ 로그인 정보 삭제 완료');

            // 2. 등록된 사용자 목록에서 제거
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            console.log('삭제 전 등록된 사용자 수:', registeredUsers.length);

            const updatedUsers = registeredUsers.filter(user => {
                if (user.email === userEmail) {
                    console.log('삭제할 계정 발견:', user.email, user.name || user.nickname);
                    return false; // 삭제
                }
                return true; // 유지
            });

            localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
            console.log('✓ 계정 데이터베이스에서 삭제 완료');
            console.log('삭제 후 등록된 사용자 수:', updatedUsers.length);

            // 3. 해당 사용자의 모든 테스트 결과 삭제
            const savedResults = JSON.parse(localStorage.getItem('savedResults') || '[]');
            console.log('삭제 전 전체 테스트 결과 수:', savedResults.length);

            const filteredResults = savedResults.filter(result => {
                if (result.userInfo && result.userInfo.email === userEmail) {
                    console.log('삭제할 테스트 결과:', result.savedAt, '점수:', result.overallScore);
                    return false; // 삭제
                }
                return true; // 다른 사용자 결과는 유지
            });

            localStorage.setItem('savedResults', JSON.stringify(filteredResults));
            console.log('✓ 사용자 테스트 결과 삭제 완료');
            console.log('삭제 후 전체 테스트 결과 수:', filteredResults.length);

            // 4. 기타 임시 데이터 정리
            localStorage.removeItem('testResult'); // 임시 테스트 결과 삭제
            console.log('✓ 임시 데이터 정리 완료');

            console.log('=== 계정 삭제 완료 ===');

            alert(`${userName}님의 탈퇴가 완료되었습니다.`);

            // 5. 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    }
}

// 저장된 데이터 정리 함수 (개발자 도구에서 호출 가능)
window.cleanTestData = function () {
    const savedResults = JSON.parse(localStorage.getItem('savedResults')) || [];
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo) {
        console.log('로그인된 사용자가 없습니다.');
        return;
    }

    console.log('정리 전 전체 결과:', savedResults.length, '개');

    // 현재 사용자의 유효한 결과만 필터링
    const validResults = savedResults.filter(result => {
        if (!result.userInfo || result.userInfo.email !== userInfo.email) {
            return true; // 다른 사용자 데이터는 유지
        }

        // 현재 사용자 데이터 유효성 검사
        if (!result.overallScore || result.overallScore < 0 || result.overallScore > 100) {
            console.log('무효한 점수 데이터 제거:', result.overallScore);
            return false;
        }

        const dateString = result.testDate || result.savedAt;
        if (!dateString) {
            console.log('날짜 없는 데이터 제거');
            return false;
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.log('무효한 날짜 데이터 제거:', dateString);
            return false;
        }

        if (!result.competencyScores || Object.keys(result.competencyScores).length === 0) {
            console.log('역량 점수 없는 데이터 제거');
            return false;
        }

        return true;
    });

    localStorage.setItem('savedResults', JSON.stringify(validResults));
    console.log('정리 후 전체 결과:', validResults.length, '개');

    // 페이지 새로고침
    location.reload();
};

// 모든 테스트 데이터 삭제 함수 (개발자 도구에서 호출 가능)
window.clearAllTestData = function () {
    if (confirm('모든 테스트 데이터를 삭제하시겠습니까?')) {
        localStorage.removeItem('savedResults');
        console.log('모든 테스트 데이터가 삭제되었습니다.');
        location.reload();
    }
};

// 계정 상태 확인 함수 (개발자 도구에서 호출 가능)
window.checkAccountStatus = function (email) {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const savedResults = JSON.parse(localStorage.getItem('savedResults') || '[]');

    if (!email) {
        console.log('사용법: checkAccountStatus("email@example.com")');
        return;
    }

    console.log(`=== ${email} 계정 상태 확인 ===`);

    // 등록된 사용자 목록에서 확인
    const user = registeredUsers.find(u => u.email === email);
    if (user) {
        console.log('✅ 계정 상태: 활성');
        console.log('계정 정보:', user);
    } else {
        console.log('❌ 계정 상태: 삭제됨 또는 미등록');
    }

    // 테스트 결과 확인
    const userResults = savedResults.filter(r => r.userInfo && r.userInfo.email === email);
    console.log(`테스트 결과: ${userResults.length}개`);

    if (userResults.length > 0) {
        userResults.forEach((result, index) => {
            console.log(`테스트 ${index + 1}:`, result.overallScore + '점', new Date(result.savedAt).toLocaleString());
        });
    }

    return {
        accountExists: !!user,
        accountInfo: user,
        testResultsCount: userResults.length,
        testResults: userResults
    };
};

// 모든 계정 목록 확인 함수 (개발자 도구에서 호출 가능)
window.listAllAccounts = function () {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const savedResults = JSON.parse(localStorage.getItem('savedResults') || '[]');

    console.log('=== 전체 계정 목록 ===');
    console.log(`총 등록 계정 수: ${registeredUsers.length}`);
    console.log(`총 테스트 결과 수: ${savedResults.length}`);

    registeredUsers.forEach((user, index) => {
        const userResults = savedResults.filter(r => r.userInfo && r.userInfo.email === user.email);
        console.log(`${index + 1}. ${user.name || user.nickname} (${user.email}) - 테스트 ${userResults.length}회`);
    });

    return registeredUsers;
}; 
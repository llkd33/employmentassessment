// 종합 점수 구간별 유형 데이터
const scoreTypeData = {
    rookie: {
        icon: "🐣",
        name: "새싹 인재 유형",
        description: "아직 배워갈 점이 무궁무진한, 성장 잠재력이 가득한 신입사원!",
        message: "지금은 새싹 단계지만, 꾸준히 물 주고 햇볕 쬐어주면 금방 무럭무럭 자랄 거예요! 교육 내용을 다시 살펴보며 하나씩 내 것으로 만들어가 봐요! 화이팅! 🌱"
    },
    growing: {
        icon: "🌱",
        name: "성장 기대 인재 유형",
        description: "기본적인 틀은 갖췄고, 조금만 더 노력하면 훨씬 더 멋진 모습으로 성장할 인재!",
        message: "기본기가 탄탄하네요! 여기에 교육 내용을 더해서 실력을 갈고 닦으면, 회사에 꼭 필요한 인재가 될 수 있을 거예요! 앞으로의 성장이 정말 기대돼요! ✨"
    },
    prepared: {
        icon: "🌳",
        name: "준비된 인재 유형",
        description: "교육 내용을 잘 소화했고, 실무에 바로 투입되어도 문제 없을 준비된 신입사원!",
        message: "와우! 교육 내용을 정말 잘 이해했네요! 탄탄한 준비를 바탕으로 이제 실무에서 마음껏 능력을 펼쳐봐요! 당신의 활약을 응원합니다! 🚀"
    },
    core: {
        icon: "⭐",
        name: "핵심 인재 유형",
        description: "뛰어난 이해도와 잠재력을 갖춘, 앞으로 회사를 이끌어갈 핵심 인재 후보!",
        message: "정말 멋집니다! 탁월한 역량을 바탕으로 회사의 미래를 함께 만들어가요! 동료들에게도 좋은 영향을 주는 리더가 되실 거라 확신합니다! 💫"
    }
};

// 점수에 따른 유형 판별
function getScoreType(score) {
    if (score >= 0 && score <= 40) {
        return scoreTypeData.rookie;
    } else if (score >= 41 && score <= 60) {
        return scoreTypeData.growing;
    } else if (score >= 61 && score <= 80) {
        return scoreTypeData.prepared;
    } else if (score >= 81 && score <= 100) {
        return scoreTypeData.core;
    }

    // 기본값
    return scoreTypeData.rookie;
}

// 점수 구간별 유형 정보 표시
function displayScoreType(score) {
    const scoreTypeSection = document.getElementById('scoreTypeSection');
    const scoreTypeIcon = document.getElementById('scoreTypeIcon');
    const scoreTypeName = document.getElementById('scoreTypeName');
    const scoreTypeDescription = document.getElementById('scoreTypeDescription');
    const scoreTypeMessage = document.getElementById('scoreTypeMessage');

    if (!scoreTypeSection) return;

    const scoreType = getScoreType(score);

    scoreTypeIcon.textContent = scoreType.icon;
    scoreTypeName.textContent = scoreType.name;
    scoreTypeDescription.textContent = scoreType.description;
    scoreTypeMessage.textContent = scoreType.message;

    // 애니메이션과 함께 표시
    scoreTypeSection.style.display = 'block';
}

// 마이페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('마이페이지 로딩 시작');

    // 기존 사용자들의 가입일 정보 마이그레이션
    migrateUserJoinDates();

    // 로그인 상태 확인
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        alert('로그인이 필요한 페이지입니다.');
        window.location.href = '/';
        return;
    }

    try {
        const user = JSON.parse(userInfo);
        console.log('현재 사용자 정보:', user);

        // 저장된 결과 확인
        const savedResults = JSON.parse(localStorage.getItem('savedResults')) || [];
        console.log('저장된 모든 결과:', savedResults);
        console.log('현재 사용자의 결과:', savedResults.filter(r => r.userInfo && r.userInfo.email === user.email));

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

// 기존 사용자들의 가입일 정보 마이그레이션
function migrateUserJoinDates() {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let hasUpdates = false;

    console.log('=== 가입일 마이그레이션 시작 ===');
    console.log('전체 등록된 사용자 수:', registeredUsers.length);

    registeredUsers.forEach((user, index) => {
        if (!user.joinDate) {
            // 가입일이 없는 경우 최근 며칠 내 날짜로 설정 (새 서비스이므로)
            // 현재 날짜에서 0~7일 전 중 랜덤으로 설정
            const daysAgo = Math.floor(Math.random() * 8); // 0~7일 전
            const joinDate = new Date();
            joinDate.setDate(joinDate.getDate() - daysAgo);
            joinDate.setHours(Math.floor(Math.random() * 24)); // 랜덤 시간
            joinDate.setMinutes(Math.floor(Math.random() * 60)); // 랜덤 분

            user.joinDate = joinDate.toISOString();
            hasUpdates = true;

            const displayDate = joinDate.toLocaleDateString('ko-KR');
            console.log(`가입일 추가: ${user.email || user.name || '익명'} -> ${displayDate}`);
        } else {
            console.log(`가입일 존재: ${user.email || user.name || '익명'} -> ${new Date(user.joinDate).toLocaleDateString('ko-KR')}`);
        }
    });

    if (hasUpdates) {
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        console.log('✅ 가입일 정보 마이그레이션 완료');
    } else {
        console.log('✅ 모든 사용자의 가입일 정보가 이미 존재합니다.');
    }

    console.log('=== 가입일 마이그레이션 완료 ===');
}

// 사용자 프로필 정보 로드
function loadUserProfile(user) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const joinDate = document.getElementById('joinDate');

    if (userName) {
        userName.textContent = user.name || user.nickname || '사용자';
    }

    if (userEmail) {
        // 이메일 로그인 계정만 이메일 표시, 카카오 로그인은 숨김
        if (user.loginType === 'email') {
            userEmail.textContent = user.email || 'example@email.com';
            userEmail.style.display = 'block';
        } else {
            // 카카오 로그인이나 다른 로그인 타입의 경우 이메일 숨김
            userEmail.style.display = 'none';
        }
    }

    if (joinDate) {
        console.log('=== 가입일 표시 로직 시작 ===');

        // 실제 등록된 사용자 정보에서 가입일 가져오기
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        let actualUser = null;

        console.log('현재 사용자 정보:', user);
        console.log('전체 등록된 사용자 수:', registeredUsers.length);

        // 이메일과 ID로 실제 사용자 찾기 (더 정확한 매칭)
        if (user.email) {
            actualUser = registeredUsers.find(u => u.email === user.email);
            console.log('이메일로 사용자 검색:', user.email, '결과:', actualUser ? '찾음' : '없음');
        }
        if (!actualUser && user.id) {
            actualUser = registeredUsers.find(u => u.id === user.id || u.id === user.id.toString());
            console.log('ID로 사용자 검색:', user.id, '결과:', actualUser ? '찾음' : '없음');
        }
        if (!actualUser && user.name) {
            actualUser = registeredUsers.find(u => u.name === user.name);
            console.log('이름으로 사용자 검색:', user.name, '결과:', actualUser ? '찾음' : '없음');
        }
        if (!actualUser && user.nickname) {
            actualUser = registeredUsers.find(u => u.nickname === user.nickname);
            console.log('닉네임으로 사용자 검색:', user.nickname, '결과:', actualUser ? '찾음' : '없음');
        }

        console.log('최종 찾은 사용자:', actualUser);

        if (actualUser && actualUser.joinDate) {
            try {
                const joinDateObj = new Date(actualUser.joinDate);

                // 유효한 날짜인지 확인
                if (!isNaN(joinDateObj.getTime())) {
                    const year = joinDateObj.getFullYear();
                    const month = String(joinDateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(joinDateObj.getDate()).padStart(2, '0');
                    joinDate.textContent = `가입일: ${year}.${month}.${day}`;
                    console.log('✅ 가입일 표시 성공:', year + '.' + month + '.' + day, '(원본:', actualUser.joinDate + ')');
                } else {
                    console.log('❌ 유효하지 않은 가입일:', actualUser.joinDate);
                    joinDate.textContent = `가입일: 정보 없음`;
                }
            } catch (error) {
                console.error('❌ 가입일 파싱 오류:', error, '원본 데이터:', actualUser.joinDate);
                joinDate.textContent = `가입일: 정보 없음`;
            }
        } else {
            console.log('❌ 가입일 정보를 찾을 수 없습니다.');

            // 사용자 정보가 없다면 현재 사용자 정보를 registeredUsers에 추가
            if (!actualUser) {
                console.log('⚠️ 등록된 사용자 목록에 현재 사용자가 없습니다. 추가합니다.');

                // 현재 날짜를 가입일로 설정
                const currentDate = new Date();
                const newUser = {
                    ...user,
                    joinDate: currentDate.toISOString()
                };

                registeredUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                joinDate.textContent = `가입일: ${year}.${month}.${day}`;

                console.log('✅ 새 사용자 추가 및 가입일 표시:', year + '.' + month + '.' + day);
            } else {
                joinDate.textContent = `가입일: 정보 없음`;
            }
        }

        console.log('=== 가입일 표시 로직 완료 ===');
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

    console.log('=== 테스트 점수 업데이트 시작 ===');
    console.log('전체 저장된 결과:', savedResults.length, '개');
    console.log('현재 사용자 이메일:', userInfo.email);

    // 현재 사용자의 결과만 필터링하고 유효한 데이터만 선택
    const userResults = savedResults.filter(result => {
        // 기본 유효성 검사
        if (!result.userInfo || result.userInfo.email !== userInfo.email) {
            return false;
        }

        console.log('사용자 결과 발견:', {
            overallScore: result.overallScore,
            testDate: result.testDate,
            savedAt: result.savedAt,
            competencyScores: result.competencyScores
        });

        // 점수가 유효한지 확인 (0-100 범위)
        if (result.overallScore === undefined || result.overallScore < 0 || result.overallScore > 100) {
            console.log('무효한 점수로 제외:', result.overallScore);
            return false;
        }

        // 날짜가 유효한지 확인
        const dateString = result.testDate || result.savedAt;
        if (!dateString) {
            console.log('날짜가 없어서 제외');
            return false;
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.log('무효한 날짜로 제외:', dateString);
            return false;
        }

        // 역량별 점수가 존재하는지 확인
        if (!result.competencyScores || Object.keys(result.competencyScores).length === 0) {
            console.log('역량별 점수가 없어서 제외');
            return false;
        }

        return true;
    });

    console.log('필터링된 사용자 결과:', userResults.length, '개');

    // 유효한 결과만 다시 저장 (더미 데이터 정리)
    if (userResults.length !== savedResults.filter(r => r.userInfo && r.userInfo.email === userInfo.email).length) {
        const otherUsersResults = savedResults.filter(result =>
            !result.userInfo || result.userInfo.email !== userInfo.email
        );
        const cleanedResults = [...otherUsersResults, ...userResults];
        localStorage.setItem('savedResults', JSON.stringify(cleanedResults));
        console.log('더미 데이터 정리 완료. 유효한 결과:', userResults.length, '개');
    }

    // 최신 결과 표시
    const overallScore = document.getElementById('overallScore');
    if (userResults.length > 0) {
        // 날짜순으로 정렬해서 가장 최근 결과 가져오기
        userResults.sort((a, b) => {
            const dateA = new Date(a.testDate || a.savedAt);
            const dateB = new Date(b.testDate || b.savedAt);
            return dateB - dateA; // 최신순
        });

        const latestResult = userResults[0]; // 가장 최근 결과
        console.log('가장 최근 결과:', latestResult);

        if (overallScore) {
            overallScore.textContent = `${latestResult.overallScore}점`;
        }

        // 점수 구간별 유형 정보 표시
        displayScoreType(latestResult.overallScore);

        // 차트 업데이트 (시간순으로 다시 정렬)
        userResults.sort((a, b) => {
            const dateA = new Date(a.testDate || a.savedAt);
            const dateB = new Date(b.testDate || b.savedAt);
            return dateA - dateB; // 오래된 순
        });

        updateTrendChart(userResults);
    } else {
        console.log('표시할 테스트 결과가 없음');
        // 테스트 결과가 없는 경우
        if (overallScore) {
            overallScore.textContent = '-';
        }

        // 유형 정보 숨기기
        const scoreTypeSection = document.getElementById('scoreTypeSection');
        if (scoreTypeSection) {
            scoreTypeSection.style.display = 'none';
        }

        // 빈 차트 표시
        updateTrendChart([]);
    }

    console.log('=== 테스트 점수 업데이트 완료 ===');
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

    // 최대 5개 결과만 표시 (차트가 너무 복잡해지지 않도록)
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
    const userId = userInfo ? userInfo.id : '';
    const loginType = userInfo ? userInfo.loginType : '';

    if (confirm(`정말로 탈퇴하시겠습니까?\n\n${userName}님의 모든 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`)) {
        if (confirm('마지막 확인입니다.\n정말로 탈퇴하시겠습니까?')) {
            console.log(`=== ${userName}(${userEmail}, ${loginType}) 계정 삭제 시작 ===`);

            // 탈퇴 진행 중임을 사용자에게 알림
            showNotification('계정 탈퇴를 진행중입니다...', 'info', 5000);

            // 1. 먼저 서버 데이터베이스에서 계정 삭제
            deleteAccountFromDatabase(userInfo)
                .then((result) => {
                    console.log('✅ 데이터베이스에서 계정 삭제 완료:', result);

                    // 서버 응답 확인
                    if (result && result.success) {
                        // 데이터베이스 삭제 성공 시 로컬 데이터도 삭제
                        deleteLocalAccountData(userInfo);
                    } else {
                        console.error('❌ 서버에서 삭제 실패 응답:', result);
                        showNotification('계정 삭제에 실패했습니다. 다시 시도해주세요.', 'error');
                    }
                })
                .catch((error) => {
                    console.error('❌ 데이터베이스 삭제 실패:', error);
                    showNotification(`계정 삭제 실패: ${error.message}`, 'error');
                });
        }
    }
}

// 서버 데이터베이스에서 계정 삭제
async function deleteAccountFromDatabase(userInfo) {
    console.log('🗄️ 서버 데이터베이스 계정 삭제 시작...');
    console.log('📋 삭제할 사용자 정보:', {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        loginType: userInfo.loginType
    });

    const authToken = localStorage.getItem('authToken');
    console.log('🔑 인증 토큰 상태:', authToken ? '존재함' : '없음');

    if (!authToken) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
    }

    console.log('📡 서버로 DELETE 요청 전송 중...');

    const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    });

    console.log('📨 서버 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
        console.log('❌ 서버 응답 실패');
        const errorData = await response.json().catch(() => ({ message: '서버 오류' }));
        console.log('❌ 오류 데이터:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData.message || '서버 오류'}`);
    }

    const result = await response.json();
    console.log('✅ 서버 응답 성공:', result);
    return result;
}

// 로컬 저장소에서 계정 데이터 삭제
function deleteLocalAccountData(userInfo) {
    const userName = userInfo.name || userInfo.nickname || '사용자';
    const userEmail = userInfo.email;
    const userId = userInfo.id;
    const loginType = userInfo.loginType;

    // 1. 현재 로그인 정보 삭제
    localStorage.removeItem('userInfo');
    localStorage.removeItem('rememberLogin');
    localStorage.removeItem('authToken');
    localStorage.removeItem('tempKakaoInfo');
    console.log('✓ 로그인 정보 삭제 완료');

    // 2. 등록된 사용자 목록에서 제거
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    console.log('삭제 전 등록된 사용자 수:', registeredUsers.length);

    const updatedUsers = registeredUsers.filter(user => {
        const isTarget = (user.email === userEmail) ||
            (user.id === userId) ||
            (user.id === userId.toString()) ||
            (loginType === 'kakao' && user.loginType === 'kakao' &&
                (user.email === userEmail || user.id === userId));

        if (isTarget) {
            console.log('삭제할 계정 발견:', {
                email: user.email,
                id: user.id,
                name: user.name || user.nickname,
                loginType: user.loginType
            });
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
        if (result.userInfo) {
            const isTarget = (result.userInfo.email === userEmail) ||
                (result.userInfo.id === userId) ||
                (result.userInfo.id === userId.toString());

            if (isTarget) {
                console.log('삭제할 테스트 결과:', {
                    date: result.savedAt,
                    score: result.overallScore,
                    email: result.userInfo.email,
                    id: result.userInfo.id
                });
                return false; // 삭제
            }
        }
        return true; // 다른 사용자 결과는 유지
    });

    localStorage.setItem('savedResults', JSON.stringify(filteredResults));
    console.log('✓ 사용자 테스트 결과 삭제 완료');
    console.log('삭제 후 전체 테스트 결과 수:', filteredResults.length);

    // 4. 기타 임시 데이터 정리
    localStorage.removeItem('testResult');
    console.log('✓ 임시 데이터 정리 완료');

    // 5. 카카오 로그아웃 및 연결 해제 처리
    if (loginType === 'kakao' && window.Kakao && window.Kakao.Auth) {
        console.log('카카오 완전 초기화 처리 중...');
        try {
            if (window.Kakao.Auth.getAccessToken()) {
                console.log('카카오 액세스 토큰 발견, 연결 해제 시도...');

                window.Kakao.API.request({
                    url: '/v1/user/unlink',
                    success: function (response) {
                        console.log('✓ 카카오 연결 해제 완료:', response);
                        performCompleteKakaoCleanup();
                    },
                    fail: function (error) {
                        console.log('카카오 연결 해제 실패, 강제 정리 진행:', error);
                        performCompleteKakaoCleanup();
                    }
                });
            } else {
                console.log('카카오 액세스 토큰 없음, 직접 정리 진행');
                performCompleteKakaoCleanup();
            }

            function performCompleteKakaoCleanup() {
                try {
                    window.Kakao.Auth.logout(() => {
                        console.log('✓ 카카오 로그아웃 완료');
                    });

                    window.Kakao.Auth.setAccessToken(null);

                    // localStorage에서 카카오 관련 데이터 제거
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('kakao') || key.includes('Kakao') || key.includes('KAKAO'))) {
                            keysToRemove.push(key);
                        }
                    }

                    keysToRemove.forEach(key => {
                        localStorage.removeItem(key);
                        console.log('✓ 카카오 관련 저장 데이터 제거:', key);
                    });

                    // sessionStorage에서도 카카오 관련 데이터 제거
                    const sessionKeysToRemove = [];
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && (key.includes('kakao') || key.includes('Kakao') || key.includes('KAKAO'))) {
                            sessionKeysToRemove.push(key);
                        }
                    }

                    sessionKeysToRemove.forEach(key => {
                        sessionStorage.removeItem(key);
                        console.log('✓ 카카오 관련 세션 데이터 제거:', key);
                    });

                    localStorage.removeItem('tempKakaoInfo');
                    localStorage.removeItem('kakao_auth_state');
                    sessionStorage.removeItem('kakao_auth_state');

                    console.log('✓ 카카오 완전 초기화 완료');
                } catch (cleanupError) {
                    console.log('카카오 정리 중 오류 (무시됨):', cleanupError);
                }
            }

        } catch (error) {
            console.log('카카오 처리 중 오류 (무시됨):', error);
        }
    }

    console.log('=== 계정 삭제 완료 ===');

    showNotification(`${userName}님의 탈퇴가 완료되었습니다.`, 'success');

    // 6. 메인 페이지로 이동
    setTimeout(() => {
        window.location.href = '/';
    }, 1500);
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

// 가입일 정보 확인 함수 (개발자 도구에서 호출 가능)
window.checkJoinDates = function () {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    console.log('=== 전체 사용자 가입일 정보 ===');
    console.log(`총 사용자 수: ${registeredUsers.length}`);

    registeredUsers.forEach((user, index) => {
        const joinDate = user.joinDate ? new Date(user.joinDate).toLocaleDateString('ko-KR') : '정보 없음';
        console.log(`${index + 1}. ${user.name || user.nickname} (${user.email})`);
        console.log(`   가입일: ${joinDate}`);
        console.log(`   로그인 타입: ${user.loginType || 'email'}`);
        console.log(`   원본 joinDate: ${user.joinDate}`);
        console.log('');
    });

    return registeredUsers;
};

// 특정 사용자의 가입일 수정 함수 (개발자 도구에서 호출 가능)
window.updateUserJoinDate = function (email, dateString) {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const user = registeredUsers.find(u => u.email === email);

    if (!user) {
        console.log(`사용자를 찾을 수 없습니다: ${email}`);
        return false;
    }

    const oldDate = user.joinDate;
    user.joinDate = new Date(dateString).toISOString();

    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

    console.log(`${email}의 가입일 수정 완료:`);
    console.log(`이전: ${oldDate ? new Date(oldDate).toLocaleDateString('ko-KR') : '정보 없음'}`);
    console.log(`변경: ${new Date(user.joinDate).toLocaleDateString('ko-KR')}`);

    return true;
};

// 현재 로그인 사용자의 가입일 확인 함수 (개발자 도구에서 호출 가능)
window.checkCurrentUserJoinDate = function () {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    if (!userInfo.email) {
        console.log('현재 로그인된 사용자가 없습니다.');
        return;
    }

    const actualUser = registeredUsers.find(u => u.email === userInfo.email);

    console.log('=== 현재 로그인 사용자 가입일 정보 ===');
    console.log('로그인 정보:', userInfo);
    console.log('실제 등록 정보:', actualUser);

    if (actualUser && actualUser.joinDate) {
        const joinDate = new Date(actualUser.joinDate);
        console.log(`가입일: ${joinDate.toLocaleDateString('ko-KR')}`);
        console.log(`원본 데이터: ${actualUser.joinDate}`);
    } else {
        console.log('가입일 정보를 찾을 수 없습니다.');
    }

    return { userInfo, actualUser };
};

// 모든 사용자의 가입일을 최근 날짜로 재설정하는 함수 (개발자 도구에서 호출 가능)
window.resetAllJoinDatesToRecent = function () {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    if (registeredUsers.length === 0) {
        console.log('등록된 사용자가 없습니다.');
        return;
    }

    console.log('=== 모든 사용자 가입일 재설정 ===');
    console.log(`${registeredUsers.length}명의 사용자 가입일을 최근 날짜로 재설정합니다.`);

    registeredUsers.forEach((user, index) => {
        const oldDate = user.joinDate;

        // 현재 날짜에서 0~3일 전 중 랜덤으로 설정
        const daysAgo = Math.floor(Math.random() * 4); // 0, 1, 2, 3일 전
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - daysAgo);
        joinDate.setHours(Math.floor(Math.random() * 24)); // 랜덤 시간
        joinDate.setMinutes(Math.floor(Math.random() * 60)); // 랜덤 분

        user.joinDate = joinDate.toISOString();

        const oldDisplay = oldDate ? new Date(oldDate).toLocaleDateString('ko-KR') : '정보 없음';
        const newDisplay = joinDate.toLocaleDateString('ko-KR');

        console.log(`${index + 1}. ${user.name || user.nickname} (${user.email})`);
        console.log(`   이전: ${oldDisplay} → 변경: ${newDisplay}`);
    });

    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

    console.log('');
    console.log('✅ 모든 사용자의 가입일이 최근 날짜로 재설정되었습니다.');
    console.log('마이페이지를 새로고침하면 변경된 가입일을 확인할 수 있습니다.');

    return registeredUsers;
};

// 결과 상세보기 페이지로 이동
function goToDetailResult() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) {
        alert('로그인이 필요합니다.');
        return;
    }

    // 테스트 결과가 있는지 확인
    const savedResults = JSON.parse(localStorage.getItem('savedResults')) || [];
    const userResults = savedResults.filter(result =>
        result.userInfo && result.userInfo.email === userInfo.email
    );

    if (userResults.length === 0) {
        alert('표시할 테스트 결과가 없습니다. 먼저 테스트를 진행해주세요.');
        return;
    }

    // 결과 페이지로 이동 (가장 최근 결과 표시)
    userResults.sort((a, b) => {
        const dateA = new Date(a.testDate || a.savedAt);
        const dateB = new Date(b.testDate || b.savedAt);
        return dateB - dateA; // 최신순
    });

    // 최신 결과를 임시 저장소에 저장하고 결과 페이지로 이동
    const latestResult = userResults[0];
    localStorage.setItem('tempViewResult', JSON.stringify(latestResult));

    // 결과 페이지로 이동
    window.location.href = '/result.html';
} 
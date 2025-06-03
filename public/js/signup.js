// 카카오 SDK 로드 및 초기화를 안전하게 처리
function initKakaoSDK() {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        // 환경에 따른 API 키 사용
        const KAKAO_API_KEY = window.location.hostname === 'localhost'
            ? '14b0fdae82d6ff12f726e0a852c17710'  // 개발용
            : '14b0fdae82d6ff12f726e0a852c17710'; // 프로덕션용 (실제 배포시 변경 필요)

        window.Kakao.init(KAKAO_API_KEY);
        console.log('카카오 SDK 초기화 완료');
    } else if (!window.Kakao) {
        console.log('카카오 SDK 로딩 중...');
        setTimeout(initKakaoSDK, 1000);
    }
}

// 페이지 로드 후 SDK 초기화
window.addEventListener('load', function () {
    initKakaoSDK();
    checkTempKakaoInfo();
});

// 카카오 SDK 초기화 확인
if (window.Kakao && !window.Kakao.isInitialized()) {
    console.log('카카오 SDK가 초기화되지 않았습니다. 키를 확인해주세요.');
} else if (window.Kakao) {
    console.log('카카오 SDK 초기화 상태:', window.Kakao.isInitialized());
}

// 임시 카카오 정보 확인 및 처리
function checkTempKakaoInfo() {
    const tempKakaoInfo = localStorage.getItem('tempKakaoInfo');

    if (tempKakaoInfo) {
        try {
            const kakaoData = JSON.parse(tempKakaoInfo);
            console.log('임시 카카오 정보 발견:', kakaoData);

            // 카카오 회원가입 모달 표시
            showKakaoSignupModal(kakaoData);

        } catch (error) {
            console.error('임시 카카오 정보 파싱 오류:', error);
            localStorage.removeItem('tempKakaoInfo');
        }
    }
}

// 카카오 회원가입 모달 표시
function showKakaoSignupModal(kakaoData) {
    const modal = document.createElement('div');
    modal.className = 'kakao-signup-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>카카오 계정 연동</h2>
                <div class="kakao-info">
                    <p><strong>닉네임:</strong> ${kakaoData.nickname}</p>
                    <p><strong>이메일:</strong> ${kakaoData.email || '제공되지 않음'}</p>
                </div>
                <div class="agreement-section">
                    <label class="agreement-item">
                        <input type="checkbox" id="termsAgree" required>
                        <span>이용약관에 동의합니다.</span>
                    </label>
                    <label class="agreement-item">
                        <input type="checkbox" id="privacyAgree" required>
                        <span>개인정보 처리방침에 동의합니다.</span>
                    </label>
                </div>
                <div class="modal-buttons">
                    <button onclick="cancelKakaoSignup()" class="btn-cancel">취소</button>
                    <button onclick="completeKakaoSignup()" class="btn-confirm">가입 완료</button>
                </div>
            </div>
        </div>
    `;

    // 모달 스타일
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
    `;

    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
        .modal-content h2 {
            margin: 0 0 1.5rem 0;
            color: #1e293b;
            text-align: center;
        }
        .kakao-info {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .kakao-info p {
            margin: 0.5rem 0;
            color: #475569;
        }
        .agreement-section {
            margin-bottom: 1.5rem;
        }
        .agreement-item {
            display: flex;
            align-items: center;
            margin-bottom: 0.8rem;
            cursor: pointer;
        }
        .agreement-item input {
            margin-right: 0.5rem;
        }
        .modal-buttons {
            display: flex;
            gap: 0.5rem;
        }
        .btn-cancel, .btn-confirm {
            flex: 1;
            padding: 0.8rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }
        .btn-cancel {
            background: #f1f5f9;
            color: #475569;
        }
        .btn-cancel:hover {
            background: #e2e8f0;
        }
        .btn-confirm {
            background: #3b82f6;
            color: white;
        }
        .btn-confirm:hover {
            background: #2563eb;
        }
        .btn-confirm:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // 동의 체크박스 상태 확인
    const checkAgreements = () => {
        const termsAgree = document.getElementById('termsAgree').checked;
        const privacyAgree = document.getElementById('privacyAgree').checked;
        const confirmBtn = modal.querySelector('.btn-confirm');

        confirmBtn.disabled = !(termsAgree && privacyAgree);
    };

    document.getElementById('termsAgree').addEventListener('change', checkAgreements);
    document.getElementById('privacyAgree').addEventListener('change', checkAgreements);

    checkAgreements(); // 초기 상태 설정
}

// 카카오 회원가입 취소
function cancelKakaoSignup() {
    localStorage.removeItem('tempKakaoInfo');

    // 모달 제거
    const modal = document.querySelector('.kakao-signup-modal');
    if (modal) {
        modal.remove();
    }

    alert('카카오 회원가입이 취소되었습니다.');
    window.location.href = '/login.html';
}

// 카카오 회원가입 완료
function completeKakaoSignup() {
    const tempKakaoInfo = localStorage.getItem('tempKakaoInfo');

    if (!tempKakaoInfo) {
        alert('카카오 정보를 찾을 수 없습니다.');
        return;
    }

    try {
        const kakaoData = JSON.parse(tempKakaoInfo);

        // 기존 사용자 목록 가져오기
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

        // 새 카카오 사용자 추가
        const newUser = {
            id: kakaoData.userId,
            name: kakaoData.nickname,
            email: kakaoData.email,
            loginType: 'kakao',
            joinDate: new Date().toISOString()
        };

        registeredUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

        // 로그인 정보 설정
        const userInfo = {
            id: newUser.id,
            name: newUser.name,
            nickname: newUser.name,
            email: newUser.email,
            loginType: 'kakao',
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        // 임시 정보 삭제
        localStorage.removeItem('tempKakaoInfo');

        // 모달 제거
        const modal = document.querySelector('.kakao-signup-modal');
        if (modal) {
            modal.remove();
        }

        console.log('카카오 회원가입 완료:', newUser);
        alert(`${kakaoData.nickname}님, 카카오 회원가입이 완료되었습니다!`);

        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);

    } catch (error) {
        console.error('카카오 회원가입 처리 오류:', error);
        alert('회원가입 처리 중 오류가 발생했습니다.');
    }
}

// 카카오 로그인 함수 (체크리스트 방식)
function kakaoSignup() {
    // 카카오 SDK 확인
    if (!window.Kakao || !window.Kakao.isInitialized()) {
        alert('카카오 SDK가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }

    console.log('=== 카카오 회원가입 시작 - 기존 세션 정리 ===');

    // 기존 카카오 세션 완전 정리
    try {
        // 1) 토큰 강제 제거
        if (window.Kakao.Auth.getAccessToken()) {
            console.log('기존 카카오 토큰 발견, 제거');
            window.Kakao.Auth.setAccessToken(null);
        }

        // 2) 브라우저 저장소에서 카카오 관련 데이터 제거
        const keysToRemove = [];

        // localStorage에서 카카오 관련 키 찾기
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('kakao') || key.includes('Kakao') || key.includes('KAKAO'))) {
                keysToRemove.push(key);
            }
        }

        // 찾은 카카오 관련 키들 제거
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('✓ 기존 카카오 저장 데이터 제거:', key);
        });

        // 3) sessionStorage에서도 카카오 관련 데이터 제거
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('kakao') || key.includes('Kakao') || key.includes('KAKAO'))) {
                sessionKeysToRemove.push(key);
            }
        }

        sessionKeysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
            console.log('✓ 기존 카카오 세션 데이터 제거:', key);
        });

        // 4) 추가 임시 정보 제거
        localStorage.removeItem('tempKakaoInfo');
        localStorage.removeItem('kakao_auth_state');
        sessionStorage.removeItem('kakao_auth_state');

        console.log('✓ 기존 카카오 데이터 정리 완료');

    } catch (error) {
        console.log('기존 카카오 데이터 정리 중 오류 (무시됨):', error);
    }

    // 짧은 지연 후 새로운 카카오 로그인 시작
    setTimeout(() => {
        console.log('=== 새로운 카카오 회원가입 진행 ===');

        // 표준 카카오 로그인 방식
        window.Kakao.Auth.login({
            success: function (authObj) {
                console.log('새로운 카카오 로그인 성공:', authObj);
                getUserInfo();
            },
            fail: function (err) {
                console.error('카카오 로그인 실패:', err);
                alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
            }
        });
    }, 500); // 500ms 지연으로 정리 작업 완료 대기
}

// 사용자 정보 요청 함수
function getUserInfo() {
    window.Kakao.API.request({
        url: '/v2/user/me',
        success: function (res) {
            console.log('사용자 정보:', res);

            const userId = res.id;
            const nickname = res.kakao_account?.profile?.nickname || '사용자';
            const email = res.kakao_account?.email || '';

            // 회원가입/로그인 처리
            handleKakaoLogin(userId, nickname, email);
        },
        fail: function (error) {
            console.error('사용자 정보 요청 실패:', error);
            alert('사용자 정보를 가져오는데 실패했습니다.');
        }
    });
}

// 카카오 로그인 성공 후 처리 함수
function handleKakaoLogin(userId, nickname, email) {
    console.log('=== 카카오 회원가입 처리 시작 ===');
    console.log('카카오 사용자 정보:', { userId, nickname, email });

    // 기존 사용자 목록 가져오기
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    // 이메일과 카카오 ID 둘 다로 중복 체크
    let existingUser = null;

    // 1. 이메일로 기존 사용자 찾기 (모든 로그인 타입 포함)
    const userByEmail = registeredUsers.find(u => u.email === email);

    // 2. 카카오 ID로 기존 사용자 찾기
    const userByKakaoId = registeredUsers.find(u => u.id === userId.toString() && u.loginType === 'kakao');

    if (userByEmail) {
        console.log('이메일로 기존 사용자 발견:', userByEmail);
        if (userByEmail.loginType === 'kakao') {
            // 기존 카카오 계정 - 이미 가입되어 있으므로 로그인 페이지로 유도
            existingUser = userByEmail;
        } else {
            // 이메일 계정이 이미 존재
            alert(`${email}은 이미 이메일로 가입된 계정입니다. 이메일 로그인을 이용해주세요.`);
            window.location.href = '/login.html';
            return;
        }
    }

    if (userByKakaoId && !existingUser) {
        console.log('카카오 ID로 기존 사용자 발견:', userByKakaoId);
        existingUser = userByKakaoId;
    }

    if (existingUser) {
        // 기존 사용자가 있으면 로그인 페이지로 유도
        console.log('기존 카카오 사용자 발견 - 로그인 페이지로 유도');
        alert(`${existingUser.name || nickname}님은 이미 가입된 회원입니다.\n로그인 페이지로 이동합니다.`);

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        return;
    }

    // 완전히 새로운 사용자 - 회원가입 진행
    console.log('새로운 카카오 사용자 - 회원가입 진행');

    // 임시 카카오 정보 저장
    const tempKakaoInfo = {
        userId: userId.toString(),
        nickname: nickname,
        email: email,
        loginType: 'kakao'
    };

    localStorage.setItem('tempKakaoInfo', JSON.stringify(tempKakaoInfo));

    // 회원가입 모달 표시
    showKakaoSignupModal(tempKakaoInfo);
}

// 카카오 로그아웃 함수 (필요시 사용)
function kakaoLogout() {
    if (window.Kakao.Auth.getAccessToken()) {
        window.Kakao.API.request({
            url: '/v1/user/unlink',
            success: function (response) {
                console.log('카카오 로그아웃 성공:', response);
                localStorage.removeItem('userInfo');
                alert('로그아웃되었습니다.');
                window.location.reload();
            },
            fail: function (error) {
                console.error('카카오 로그아웃 실패:', error);
            }
        });
    }
}

// 상승하는 점 그래프 그리기 함수
document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('lineChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 캔버스 크기 설정
    canvas.width = 600;
    canvas.height = 400;

    // 상승 데이터 포인트 (월별 성장률)
    const dataPoints = [
        { month: '1월', value: 20 },
        { month: '2월', value: 35 },
        { month: '3월', value: 45 },
        { month: '4월', value: 60 },
        { month: '5월', value: 75 },
        { month: '6월', value: 85 },
        { month: '7월', value: 92 }
    ];

    const padding = 80;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = 100;

    // 배경 그라디언트
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#f0f9ff');
    bgGradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 격자선 그리기
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    // 수평 격자선
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();

        // Y축 라벨
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - (i * 20)}%`, padding - 10, y + 4);
    }

    // 수직 격자선
    for (let i = 0; i < dataPoints.length; i++) {
        const x = padding + (chartWidth / (dataPoints.length - 1)) * i;
        ctx.strokeStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + chartHeight);
        ctx.stroke();

        // X축 라벨
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dataPoints[i].month, x, padding + chartHeight + 25);
    }

    // 면적 그라디언트 생성 (선 아래 영역)
    const areaGradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    areaGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    areaGradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

    // 면적 채우기
    ctx.fillStyle = areaGradient;
    ctx.beginPath();

    // 시작점 (왼쪽 아래)
    const startX = padding;
    const startY = padding + chartHeight - (dataPoints[0].value / maxValue) * chartHeight;
    ctx.moveTo(startX, padding + chartHeight);
    ctx.lineTo(startX, startY);

    // 곡선으로 데이터 포인트 연결
    for (let i = 0; i < dataPoints.length; i++) {
        const x = padding + (chartWidth / (dataPoints.length - 1)) * i;
        const y = padding + chartHeight - (dataPoints[i].value / maxValue) * chartHeight;

        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            // 부드러운 곡선을 위한 베지어 곡선
            const prevX = padding + (chartWidth / (dataPoints.length - 1)) * (i - 1);
            const cpX = prevX + (x - prevX) / 2;
            const prevY = padding + chartHeight - (dataPoints[i - 1].value / maxValue) * chartHeight;

            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
    }

    // 면적 닫기 (오른쪽 아래로)
    const endX = padding + chartWidth;
    ctx.lineTo(endX, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // 선 그리기
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < dataPoints.length; i++) {
        const x = padding + (chartWidth / (dataPoints.length - 1)) * i;
        const y = padding + chartHeight - (dataPoints[i].value / maxValue) * chartHeight;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            // 부드러운 곡선
            const prevX = padding + (chartWidth / (dataPoints.length - 1)) * (i - 1);
            const cpX = prevX + (x - prevX) / 2;
            const prevY = padding + chartHeight - (dataPoints[i - 1].value / maxValue) * chartHeight;

            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
    }
    ctx.stroke();

    // 데이터 포인트 (원) 그리기
    for (let i = 0; i < dataPoints.length; i++) {
        const x = padding + (chartWidth / (dataPoints.length - 1)) * i;
        const y = padding + chartHeight - (dataPoints[i].value / maxValue) * chartHeight;

        // 외부 원 (그림자 효과)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        // 메인 원
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // 내부 하이라이트
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        // 값 표시 (선택사항)
        if (i % 2 === 0 || i === dataPoints.length - 1) { // 격간격으로 또는 마지막 포인트
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${dataPoints[i].value}%`, x, y - 15);
        }
    }

    // 제목 추가
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('성장 지수 추이', canvas.width / 2, 30);

    // 부제목
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial';
    ctx.fillText('지속적인 성장을 통한 역량 향상', canvas.width / 2, 50);
});

// 홈으로 이동하는 함수
function goHome() {
    window.location.href = 'index.html';
}

// 일반 회원가입 페이지로 이동
function goToRegularSignup() {
    window.location.href = 'signup-form.html';
}

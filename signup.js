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
window.addEventListener('load', initKakaoSDK);

// 카카오 SDK 초기화 확인
if (window.Kakao && !window.Kakao.isInitialized()) {
    console.log('카카오 SDK가 초기화되지 않았습니다. 키를 확인해주세요.');
} else if (window.Kakao) {
    console.log('카카오 SDK 초기화 상태:', window.Kakao.isInitialized());
}

// 카카오 로그인 함수 (체크리스트 방식)
function kakaoSignup() {
    // 카카오 SDK 확인
    if (!window.Kakao || !window.Kakao.isInitialized()) {
        alert('카카오 SDK가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }

    // 표준 카카오 로그인 방식
    window.Kakao.Auth.login({
        success: function (authObj) {
            console.log('카카오 로그인 성공:', authObj);
            getUserInfo();
        },
        fail: function (err) {
            console.error('카카오 로그인 실패:', err);
            alert('카카오 로그인에 실패했습니다.');
        }
    });
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
    console.log('로그인 처리 시작:', { userId, nickname, email });

    // 여기서 서버로 사용자 정보를 전송하고 회원가입/로그인 처리를 합니다
    // 실제 구현에서는 서버 API를 호출해야 합니다

    // 로컬 스토리지에 사용자 정보 임시 저장
    const userInfo = {
        id: userId,
        nickname: nickname,
        email: email,
        loginType: 'kakao',
        loginTime: new Date().toISOString()
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));

    // 로그인 성공 알림
    alert(`${nickname}님, 환영합니다!\n카카오 로그인이 완료되었습니다.`);

    // 메인 페이지로 이동
    window.location.href = 'index.html';
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

// 그래프 그리기 함수 (6각형 역량검사 차트로 변경)
document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('lineChart');
    const ctx = canvas.getContext('2d');

    // 캔버스 크기 설정
    canvas.width = 600;
    canvas.height = 400;

    // 6각형 역량검사 데이터
    const skills = [
        { name: '리더십', value: 75 },
        { name: '커뮤니케이션', value: 85 },
        { name: '창의성', value: 70 },
        { name: '문제해결', value: 90 },
        { name: '협업', value: 80 },
        { name: '전문성', value: 88 }
    ];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 120;
    const levels = 5; // 5단계 격자

    // 배경 설정
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 6각형 격자 그리기
    for (let level = 1; level <= levels; level++) {
        const radius = (maxRadius / levels) * level;

        ctx.strokeStyle = level === levels ? '#d1d5db' : '#e5e7eb';
        ctx.lineWidth = level === levels ? 2 : 1;
        ctx.beginPath();

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2; // -90도부터 시작
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    // 축선 그리기
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * maxRadius;
        const y = centerY + Math.sin(angle) * maxRadius;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    // 역량 데이터 그리기
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const dataPoints = [];
    skills.forEach((skill, index) => {
        const angle = (Math.PI / 3) * index - Math.PI / 2;
        const radius = (maxRadius * skill.value) / 100;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        dataPoints.push({ x, y });

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 데이터 포인트 그리기
    dataPoints.forEach(point => {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // 흰색 테두리
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // 역량 라벨 그리기
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    skills.forEach((skill, index) => {
        const angle = (Math.PI / 3) * index - Math.PI / 2;
        const labelRadius = maxRadius + 35;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;

        // 텍스트 정렬 조정
        if (x < centerX - 10) {
            ctx.textAlign = 'right';
        } else if (x > centerX + 10) {
            ctx.textAlign = 'left';
        } else {
            ctx.textAlign = 'center';
        }

        ctx.fillText(skill.name, x, y + 5);

        // 점수 표시
        ctx.font = '12px Arial';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`${skill.value}%`, x, y + 20);
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#374151';
    });

    // 중앙 제목
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('역량 프로필', centerX, 30);

    // 범례 (점수 범위)
    ctx.font = '11px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'left';
    ctx.fillText('0%', centerX - maxRadius + 5, centerY + 5);
    ctx.fillText('100%', centerX + maxRadius - 25, centerY + 5);
});

// 홈으로 이동하는 함수
function goHome() {
    window.location.href = 'index.html';
}

// 일반 회원가입 페이지로 이동
function goToRegularSignup() {
    window.location.href = 'signup-form.html';
}

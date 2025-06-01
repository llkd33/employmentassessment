// 로그인 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('로그인 페이지 JavaScript 로드 완료');
    initKakaoSDKForLogin();
    animatePageLoad();

    // 테스트용: 현재 저장된 사용자 목록 확인
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    console.log('현재 등록된 사용자:', users);
});

// 카카오 SDK 초기화 (로그인 페이지용)
function initKakaoSDKForLogin() {
    if (window.Kakao) {
        if (!window.Kakao.isInitialized()) {
            // 환경에 따른 API 키 사용
            const KAKAO_API_KEY = window.location.hostname === 'localhost'
                ? '14b0fdae82d6ff12f726e0a852c17710'  // 개발용
                : '14b0fdae82d6ff12f726e0a852c17710'; // 프로덕션용 (실제 배포시 변경 필요)

            window.Kakao.init(KAKAO_API_KEY);
            console.log('카카오 SDK 초기화 완료:', window.Kakao.isInitialized());
        }
    } else {
        console.error('카카오 SDK가 로드되지 않았습니다.');
        setTimeout(initKakaoSDKForLogin, 1000);
    }
}

// 일반 로그인 폼 제출 처리
function handleLoginSubmit(event) {
    console.log('로그인 폼 제출됨!');
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberCheckbox = document.getElementById('remember');
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    console.log('입력값:', { email, password, remember });

    // 기본 유효성 검사
    if (!email || !password) {
        showNotification('이메일과 비밀번호를 모두 입력해주세요.', 'error');
        return;
    }

    // 이메일 형식 검사
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showNotification('올바른 이메일 형식을 입력해주세요.', 'error');
        return;
    }

    // 로딩 상태 표시
    const submitBtn = document.querySelector('.login-btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '로그인 중...';
    submitBtn.disabled = true;

    // 실제 서버 연동이 없으므로 localStorage에서 사용자 확인
    setTimeout(() => {
        // 등록된 사용자 목록 가져오기
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

        // 디버깅용 콘솔 로그
        console.log('등록된 사용자 목록:', registeredUsers);
        console.log('입력한 이메일:', email);
        console.log('입력한 비밀번호:', password);

        // 이메일로 사용자 찾기
        const userByEmail = registeredUsers.find(u => u.email === email);
        console.log('찾은 사용자:', userByEmail);

        if (!userByEmail) {
            // 이메일이 없는 경우
            console.log('❌ 등록되지 않은 이메일');
            showNotification('등록되지 않은 이메일입니다. 회원가입을 진행해주세요.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        // 비밀번호 확인
        console.log('저장된 비밀번호:', userByEmail.password);
        if (userByEmail.password !== password) {
            // 비밀번호가 틀린 경우
            console.log('❌ 비밀번호 불일치');
            showNotification('비밀번호가 올바르지 않습니다.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        // 로그인 성공
        console.log('✅ 로그인 성공!');
        const userInfo = {
            id: userByEmail.id,
            name: userByEmail.name,
            nickname: userByEmail.nickname,
            email: userByEmail.email,
            loginType: userByEmail.loginType || 'email',
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('저장된 userInfo:', userInfo);

        if (remember) {
            localStorage.setItem('rememberLogin', 'true');
        }

        showNotification(`${userByEmail.name}님, 환영합니다!`, 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }, 300);
}

// 카카오 로그인 함수
function kakaoLogin() {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
        showNotification('카카오 SDK가 초기화되지 않았습니다. 페이지를 새로고침해주세요.', 'error');
        return;
    }

    window.Kakao.Auth.login({
        success: function (authObj) {
            console.log('카카오 로그인 성공:', authObj);
            getUserInfoFromKakao();
        },
        fail: function (err) {
            console.error('카카오 로그인 실패:', err);
            showNotification('카카오 로그인에 실패했습니다.', 'error');
        }
    });
}

// 카카오에서 사용자 정보 가져오기
function getUserInfoFromKakao() {
    window.Kakao.API.request({
        url: '/v2/user/me',
        success: function (res) {
            console.log('카카오 사용자 정보:', res);

            const userId = res.id;
            const nickname = res.kakao_account?.profile?.nickname || '사용자';
            const email = res.kakao_account?.email || '';

            // 카카오 로그인 성공 처리
            handleKakaoLoginSuccess(userId, nickname, email);
        },
        fail: function (error) {
            console.error('사용자 정보 요청 실패:', error);
            showNotification('사용자 정보를 가져오는데 실패했습니다.', 'error');
        }
    });
}

// 카카오 로그인 성공 후 처리
function handleKakaoLoginSuccess(userId, nickname, email) {
    // 기존 사용자 목록 가져오기
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    // 카카오 사용자 확인 또는 새로 추가
    let user = registeredUsers.find(u => u.email === email && u.loginType === 'kakao');

    if (!user) {
        // 새 카카오 사용자 추가
        user = {
            id: userId.toString(),
            name: nickname,
            email: email,
            loginType: 'kakao',
            joinDate: new Date().toISOString()
        };
        registeredUsers.push(user);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }

    const userInfo = {
        id: user.id,
        name: user.name,
        nickname: user.name,
        email: user.email,
        loginType: 'kakao',
        loginTime: new Date().toISOString()
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));

    showNotification(`${nickname}님, 환영합니다!`, 'success');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// 홈으로 이동
function goHome() {
    window.location.href = 'index.html';
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
        transition: transform 0.2s ease;
        z-index: 1000;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 200);
    }, 2000);
}

// 페이지 로드 애니메이션
function animatePageLoad() {
    const container = document.querySelector('.login-container');
    const header = document.querySelector('.header');

    // 초기 상태 설정
    header.style.opacity = '0';
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';

    // 애니메이션 적용
    setTimeout(() => {
        header.style.transition = 'opacity 0.3s ease';
        header.style.opacity = '1';

        container.style.transition = 'all 0.3s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 50);
}

// 엔터 키로 로그인 처리
document.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        const form = document.querySelector('.login-form');
        if (document.activeElement.tagName === 'INPUT' && form.contains(document.activeElement)) {
            handleLoginSubmit(event);
        }
    }
});

// 로그인 상태 유지 확인
window.addEventListener('load', function () {
    const rememberLogin = localStorage.getItem('rememberLogin');
    const userInfo = localStorage.getItem('userInfo');

    if (rememberLogin && userInfo) {
        try {
            const user = JSON.parse(userInfo);
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

            // 해당 사용자가 실제로 등록된 사용자인지 확인
            const existingUser = registeredUsers.find(u => u.email === user.email);

            if (existingUser) {
                // 사용자가 존재하면 자동 로그인
                showNotification('이미 로그인된 상태입니다.', 'info');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                // 사용자가 존재하지 않으면 로그인 정보 삭제 (탈퇴된 계정)
                console.log('탈퇴된 계정의 로그인 정보 삭제:', user.email);
                localStorage.removeItem('userInfo');
                localStorage.removeItem('rememberLogin');
                showNotification('계정이 삭제되어 로그아웃되었습니다.', 'info');
            }
        } catch (error) {
            // 잘못된 userInfo 형식인 경우 삭제
            console.error('userInfo 파싱 오류:', error);
            localStorage.removeItem('userInfo');
            localStorage.removeItem('rememberLogin');
        }
    }
}); 
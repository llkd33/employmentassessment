// 카카오 SDK 초기화 함수
function initKakaoSDK() {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        // common.js의 APP_CONFIG에서 카카오 API 키 가져오기
        const KAKAO_API_KEY = APP_CONFIG.KAKAO_API_KEY;

        try {
            window.Kakao.init(KAKAO_API_KEY);
            console.log('카카오 SDK 초기화 완료:', window.Kakao.isInitialized());
        } catch (error) {
            console.error('카카오 SDK 초기화 실패:', error);
        }
    } else if (!window.Kakao) {
        console.log('카카오 SDK 로딩 중...');
        setTimeout(initKakaoSDK, 1000);
    } else {
        console.log('카카오 SDK 이미 초기화됨:', window.Kakao.isInitialized());
    }
}

// 로그인 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('로그인 페이지 JavaScript 로드 완료');

    // 카카오 SDK가 로드될 때까지 기다린 후 초기화
    if (window.Kakao) {
        initKakaoSDK();
    } else {
        // 카카오 SDK 스크립트가 완전히 로드될 때까지 기다림
        window.addEventListener('load', function () {
            setTimeout(initKakaoSDK, 500);
        });
    }

    animatePageLoad(['.header', '.login-container']);

    // 테스트용: 현재 저장된 사용자 목록 확인
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    console.log('현재 등록된 사용자:', users);
});

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

    console.log('=== 카카오 로그인 처리 시작 ===');
    console.log('카카오 사용자 정보:', { userId, nickname, email });

    // 이메일과 카카오 ID 둘 다로 중복 체크
    let existingUser = null;

    // 1. 이메일로 기존 사용자 찾기 (모든 로그인 타입 포함)
    const userByEmail = registeredUsers.find(u => u.email === email);

    // 2. 카카오 ID로 기존 사용자 찾기
    const userByKakaoId = registeredUsers.find(u => u.id === userId.toString() && u.loginType === 'kakao');

    if (userByEmail) {
        console.log('이메일로 기존 사용자 발견:', userByEmail);
        if (userByEmail.loginType === 'kakao') {
            // 기존 카카오 계정
            existingUser = userByEmail;
        } else {
            // 이메일 계정이 이미 존재
            showNotification(`${email}은 이미 이메일로 가입된 계정입니다.`, 'error');
            return;
        }
    }

    if (userByKakaoId && !existingUser) {
        console.log('카카오 ID로 기존 사용자 발견:', userByKakaoId);
        existingUser = userByKakaoId;
    }

    if (!existingUser) {
        // 완전히 새로운 사용자 - 회원가입 과정 필요
        console.log('새로운 카카오 사용자 - 회원가입 페이지로 이동');

        // 임시 카카오 정보 저장
        const tempKakaoInfo = {
            userId: userId.toString(),
            nickname: nickname,
            email: email,
            loginType: 'kakao'
        };

        localStorage.setItem('tempKakaoInfo', JSON.stringify(tempKakaoInfo));
        showNotification('카카오 계정 연동을 위한 회원가입이 필요합니다.', 'info');

        setTimeout(() => {
            window.location.href = '/signup.html';
        }, 2000);
        return;
    }

    // 기존 사용자 로그인 처리
    console.log('기존 카카오 사용자 로그인:', existingUser);

    // 기존 사용자의 name이 있으면 사용하고, 없으면 카카오 nickname 사용
    const displayName = existingUser.name || nickname;

    const userInfo = {
        id: existingUser.id,
        name: displayName,
        nickname: nickname, // 카카오에서 받은 실제 nickname 사용
        email: existingUser.email,
        loginType: 'kakao',
        loginTime: new Date().toISOString()
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    console.log('카카오 로그인 완료:', userInfo);

    showNotification(`${displayName}님, 환영합니다!`, 'success');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
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
function animatePageLoad(elements) {
    elements.forEach(element => {
        const container = document.querySelector(element);
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
    });
} 
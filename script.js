// 설정 정보
const CONFIG = {
    KAKAO_API_KEY: window.location.hostname === 'localhost'
        ? '14b0fdae82d6ff12f726e0a852c17710'  // 개발용
        : '14b0fdae82d6ff12f726e0a852c17710'  // 프로덕션용 (실제 배포시 변경 필요)
};

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function () {
    // 공통 헤더 생성
    createCommonHeader();

    // 기존 사용자 목록 확인
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    // 데모 계정이 없으면 추가
    if (!registeredUsers.find(u => u.email === 'demo@example.com')) {
        const demoUser = {
            id: 'demo_user',
            name: '데모 사용자',
            nickname: '데모',
            email: 'demo@example.com',
            password: 'demo123',
            loginType: 'email',
            joinDate: new Date().toISOString()
        };
        registeredUsers.push(demoUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }

    // 테스트 계정이 없으면 추가
    if (!registeredUsers.find(u => u.email === 'test@test.com')) {
        const testUser = {
            id: 'test_user',
            name: '테스트',
            nickname: '테스트',
            email: 'test@test.com',
            password: 'test123',
            loginType: 'email',
            joinDate: new Date().toISOString()
        };
        registeredUsers.push(testUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }

    // test123@test.com 계정이 없으면 추가
    if (!registeredUsers.find(u => u.email === 'test123@test.com')) {
        const test123User = {
            id: 'test123_user',
            name: '테스트',
            nickname: '테스트123',
            email: 'test123@test.com',
            password: 'test123',
            loginType: 'email',
            joinDate: new Date().toISOString()
        };
        registeredUsers.push(test123User);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }

    checkLoginStatus();

    // 기존 계정들의 이름 정보 업데이트
    updateExistingUsersInfo();

    // 로그인 버튼 이벤트
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', function () {
            handleLogin();
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', function () {
            handleSignup();
        });
    }

    // 페이지 로드 애니메이션
    animatePageLoad();

    // 윈도우 크기 변화 감지
    handleResponsiveHeader();
    window.addEventListener('resize', handleResponsiveHeader);
});

// 반응형 헤더 처리 함수
function handleResponsiveHeader() {
    const width = window.innerWidth;
    const userGreeting = document.querySelector('.user-greeting');
    const mypageBtn = document.querySelector('.mypage-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const authNav = document.querySelector('.auth-nav');

    // CSS 미디어 쿼리가 처리하도록 하고, JavaScript는 제거
    // 미디어 쿼리가 이미 @media 규칙으로 처리하고 있음
}

// 로그인 상태 확인 함수
function checkLoginStatus() {
    const userInfo = localStorage.getItem('userInfo');

    if (userInfo) {
        const user = JSON.parse(userInfo);

        // 사용자 정보 즉시 업데이트 (이메일 대신 이름 표시를 위해)
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const matchedUser = registeredUsers.find(u => u.email === user.email);

        if (matchedUser && matchedUser.name && (!user.name || user.name !== matchedUser.name)) {
            user.name = matchedUser.name;
            user.nickname = matchedUser.nickname || matchedUser.name;
            localStorage.setItem('userInfo', JSON.stringify(user));
        }

        updateUIForLoggedInUser(user);
    }
}

// 로그인된 사용자용 UI 업데이트 (메인페이지 전용)
function updateUIForLoggedInUser(user) {
    const currentPage = window.location.pathname;
    const isMainPage = currentPage === '/' || currentPage.includes('index.html');

    // 메인페이지가 아니면 헤더 사용자 정보만 업데이트
    if (!isMainPage) {
        updateHeaderUserInfo(user);
        return;
    }

    // 메인페이지 전용 로직
    const authNav = document.querySelector('.auth-nav');

    if (authNav) {
        // 표시할 이름 결정 - name을 최우선으로
        let displayName = '사용자';

        if (user.name && user.name !== user.email) {
            displayName = user.name;
        } else if (user.nickname && user.nickname !== user.email && user.nickname !== user.email.split('@')[0]) {
            displayName = user.nickname;
        } else if (user.email && user.email.includes('@')) {
            displayName = user.email.split('@')[0];
        }

        // 문자 수 제한 (8자)
        if (displayName.length > 8) {
            displayName = displayName.substring(0, 8);
        }

        // CSS 클래스를 정확히 맞춰서 HTML 생성
        authNav.innerHTML = `
            <span class="user-info user-greeting">안녕하세요, ${displayName}님!</span>
            <button class="auth-btn mypage-btn" onclick="goToMyPage()">마이페이지</button>
            <button class="auth-btn logout-btn" onclick="handleLogout()">로그아웃</button>
        `;

        // UI 업데이트 후 즉시 반응형 처리 적용
        setTimeout(() => {
            handleResponsiveHeader();
        }, 50);
    }
}

// 로그아웃 처리 함수
function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('userInfo');
        showNotification('로그아웃되었습니다.', 'info');

        // 페이지 새로고침하여 UI 업데이트
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// 테스트 시작 함수
function startTest() {
    // 로그인 확인
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        alert('로그인이 필요합니다. 로그인 후 테스트를 진행해주세요.');
        window.location.href = '/login.html';
        return;
    }

    // 버튼 애니메이션
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.style.transform = 'scale(0.95)';

        setTimeout(() => {
            startBtn.style.transform = 'scale(1)';

            // 확인 메시지
            if (confirm('신입사원 역량테스트를 시작하시겠습니까?\n\n소요시간: 약 60분\n문항 수: 75문항')) {
                // 테스트 페이지로 이동
                window.location.href = '/test.html';
            }
        }, 100);
    } else {
        // 버튼이 없는 경우 직접 이동
        if (confirm('신입사원 역량테스트를 시작하시겠습니까?\n\n소요시간: 약 60분\n문항 수: 75문항')) {
            window.location.href = '/test.html';
        }
    }
}

// 로그인 처리 함수
function handleLogin() {
    console.log('로그인 버튼 클릭');
    // 로그인 페이지로 이동
    window.location.href = 'login.html';
}

// 회원가입 처리 함수
function handleSignup() {
    console.log('회원가입 버튼 클릭');
    // 회원가입 페이지로 이동
    window.location.href = '/signup.html';
}

// 알림 표시 함수
function showNotification(message, type = 'info') {
    // 알림 요소 생성
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // 스타일 적용
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background-color: ${type === 'success' ? '#5cb85c' : '#5bc0de'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1000;
    `;

    // 문서에 추가
    document.body.appendChild(notification);

    // 애니메이션
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // 3초 후 제거
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 페이지 로드 애니메이션
function animatePageLoad() {
    const testContainer = document.querySelector('.test-container');
    const header = document.querySelector('.header');

    // 초기 상태 설정
    testContainer.style.opacity = '0';
    testContainer.style.transform = 'translateY(20px)';
    header.style.opacity = '0';

    // 애니메이션 적용
    setTimeout(() => {
        header.style.transition = 'opacity 0.5s ease';
        header.style.opacity = '1';

        testContainer.style.transition = 'all 0.5s ease';
        testContainer.style.opacity = '1';
        testContainer.style.transform = 'translateY(0)';
    }, 100);
}

// 이미지 로드 에러 처리
window.addEventListener('load', function () {
    const logoImg = document.querySelector('.logo img');
    const testImg = document.querySelector('.test-image img');

    // 로고 이미지 에러 처리
    if (logoImg) {
        logoImg.addEventListener('error', function () {
            this.style.display = 'none';
            const logoText = document.createElement('h2');
            logoText.textContent = 'COMPANY';
            logoText.style.cssText = 'color: #4a90e2; font-weight: 700; margin: 0;';
            this.parentElement.appendChild(logoText);
        });
    }

    // 테스트 이미지 에러 처리
    if (testImg) {
        testImg.addEventListener('error', function () {
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
                width: 100%;
                height: 250px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
                font-weight: 600;
            `;
            placeholder.textContent = '역량테스트';
            this.parentElement.appendChild(placeholder);
        });
    }
});

// 마이페이지로 이동하는 함수
function goToMyPage() {
    window.location.href = '/mypage.html';
}

// 홈으로 이동하는 함수
function goHome() {
    window.location.href = '/';
}

// 기존 사용자 정보 업데이트
function updateExistingUsersInfo() {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let updated = false;

    // test123@test.com 계정 - 이름을 "테스트"로 확실히 설정
    const test123User = registeredUsers.find(u => u.email === 'test123@test.com');
    if (test123User) {
        test123User.name = '테스트';
        test123User.nickname = '테스트123';
        updated = true;
    }

    // test@test.com 계정 - 이름을 "테스트"로 확실히 설정
    const testUser = registeredUsers.find(u => u.email === 'test@test.com');
    if (testUser) {
        testUser.name = '테스트';
        testUser.nickname = '테스트';
        updated = true;
    }

    // 데모 계정 업데이트
    const demoUser = registeredUsers.find(u => u.email === 'demo@example.com');
    if (demoUser) {
        demoUser.name = '데모 사용자';
        demoUser.nickname = '데모';
        updated = true;
    }

    if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }

    // 현재 로그인된 사용자 정보도 즉시 업데이트
    const currentUserInfo = localStorage.getItem('userInfo');
    if (currentUserInfo) {
        const currentUser = JSON.parse(currentUserInfo);

        // 현재 사용자가 등록된 사용자 목록에서 찾아서 최신 정보로 업데이트
        const matchedUser = registeredUsers.find(u => u.email === currentUser.email);
        if (matchedUser && matchedUser.name) {
            // 최신 정보로 업데이트
            currentUser.name = matchedUser.name;
            currentUser.nickname = matchedUser.nickname || matchedUser.name;
            localStorage.setItem('userInfo', JSON.stringify(currentUser));

            // 즉시 UI 업데이트
            const currentPage = window.location.pathname;
            const isMainPage = currentPage === '/' || currentPage.includes('index.html');

            if (isMainPage) {
                updateUIForLoggedInUser(currentUser);
            } else {
                updateHeaderUserInfo(currentUser);
            }
        }
    }
}

// 공통 헤더 생성 함수
function createCommonHeader() {
    const header = document.querySelector('.header .header-container');
    if (!header) return;

    // 현재 페이지 확인
    const currentPage = window.location.pathname;
    const isMainPage = currentPage === '/' || currentPage.includes('index.html');
    const isLoginPage = currentPage.includes('login.html');
    const isSignupPage = currentPage.includes('signup.html') || currentPage.includes('signup-form.html');

    // 뒤로가기 버튼 (원래대로 복원)
    const homeBtn = isMainPage ?
        '<div class="home-btn-container"><!-- 빈 공간 유지용 --></div>' :
        '<div class="home-btn-container"><button class="home-btn" onclick="goHome()">←</button></div>';

    // 로고 (항상 동일하고 완전 중앙)
    const logo = '<div class="logo"><img src="images/logo.png" alt="회사 로고" /></div>';

    // Auth 버튼들
    let authButtons = '';
    if (isMainPage) {
        // 메인페이지: 로그인된 상태에 따라 동적으로 변경됨 (기존 로직 유지)
        authButtons = '<nav class="auth-nav"><button class="auth-btn login-btn">로그인</button><button class="auth-btn signup-btn">회원가입</button></nav>';
    } else if (isLoginPage) {
        authButtons = '<nav class="auth-nav"><button class="auth-btn signup-btn" onclick="window.location.href=\'signup.html\'">회원가입</button></nav>';
    } else if (isSignupPage) {
        authButtons = '<nav class="auth-nav"><button class="auth-btn login-btn" onclick="window.location.href=\'login.html\'">로그인</button></nav>';
    } else {
        // 다른 페이지 (test, result, mypage): 로그인된 사용자 정보 표시
        authButtons = '<nav class="auth-nav"><span class="user-info user-greeting">안녕하세요, 사용자님!</span><button class="auth-btn mypage-btn" onclick="goToMyPage()">마이페이지</button><button class="auth-btn logout-btn" onclick="handleLogout()">로그아웃</button></nav>';
    }

    // 헤더 내용 설정
    header.innerHTML = homeBtn + logo + authButtons;

    // 메인페이지가 아니면서 로그인된 사용자가 있는 경우 사용자 정보 업데이트
    if (!isMainPage && !isLoginPage && !isSignupPage) {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const user = JSON.parse(userInfo);
            updateHeaderUserInfo(user);
        }
    }
}

// 헤더의 사용자 정보만 업데이트하는 함수
function updateHeaderUserInfo(user) {
    const userGreeting = document.querySelector('.user-greeting');
    if (userGreeting) {
        let displayName = '사용자';

        // 이름 우선순위: name > nickname > 이메일의 @ 앞부분
        if (user.name && user.name !== user.email) {
            displayName = user.name;
        } else if (user.nickname && user.nickname !== user.email && user.nickname !== user.email.split('@')[0]) {
            displayName = user.nickname;
        } else if (user.email && user.email.includes('@')) {
            // 이메일 계정의 경우 @ 앞부분만 표시
            displayName = user.email.split('@')[0];
        }

        // 문자 수 제한 (8자)
        if (displayName.length > 8) {
            displayName = displayName.substring(0, 8);
        }

        userGreeting.textContent = `안녕하세요, ${displayName}님!`;
    }
} 
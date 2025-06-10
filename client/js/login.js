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

    // PostgreSQL 데이터베이스 사용 - localStorage 기반 시스템에서 서버 API 기반으로 전환 완료
    console.log('🗄️ PostgreSQL 데이터베이스 기반 로그인 시스템 사용 중');
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

    // 서버 API 호출로 로그인 처리 - PostgreSQL 데이터베이스 사용
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
        .then(response => {
            console.log('API 응답 상태:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 로그인 성공
                console.log('✅ PostgreSQL 로그인 성공!', data);

                // JWT 토큰 저장
                localStorage.setItem('authToken', data.token);

                const userInfo = {
                    id: data.user.id,
                    name: data.user.name,
                    nickname: data.user.nickname || data.user.name,
                    email: data.user.email,
                    loginType: data.user.loginType || 'email',
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('저장된 userInfo:', userInfo);

                if (remember) {
                    localStorage.setItem('rememberLogin', 'true');
                }

                showNotification(`${data.user.name}님, 환영합니다!`, 'success');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // 로그인 실패
                console.log('❌ 로그인 실패:', data.message);
                showNotification(data.message || '로그인에 실패했습니다.', 'error');
            }
        })
        .catch(error => {
            console.error('로그인 API 오류:', error);

            // 네트워크 오류 유형에 따른 상세 메시지
            let errorMessage = '서버 연결에 문제가 발생했습니다.';

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = '네트워크 연결을 확인해주세요. (인터넷 연결 또는 서버 상태)';
            } else if (error.message.includes('CORS')) {
                errorMessage = '보안 정책으로 인한 접근 제한입니다. 페이지를 새로고침해보세요.';
            } else if (error.message.includes('404')) {
                errorMessage = 'API 경로를 찾을 수 없습니다. 서버 상태를 확인해주세요.';
            } else if (error.message.includes('500')) {
                errorMessage = '서버 내부 오류입니다. 잠시 후 다시 시도해주세요.';
            }

            showNotification(errorMessage, 'error');
        })
        .finally(() => {
            // 로딩 상태 해제
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
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

// 카카오 로그인 성공 후 처리 - 서버 API 기반
function handleKakaoLoginSuccess(userId, nickname, email) {
    console.log('=== 카카오 로그인 서버 API 처리 시작 ===');
    console.log('카카오 사용자 정보:', { userId, nickname, email });

    // 서버 API로 카카오 로그인 처리
    fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            kakaoId: userId.toString(),
            nickname: nickname,
            email: email
        })
    })
        .then(response => {
            console.log('카카오 API 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 카카오 로그인 성공
                console.log('✅ PostgreSQL 카카오 로그인 성공!', data);

                // JWT 토큰 저장
                localStorage.setItem('authToken', data.token);

                const userInfo = {
                    id: data.user.id,
                    name: data.user.name,
                    nickname: data.user.nickname || nickname,
                    email: data.user.email,
                    loginType: 'kakao',
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('카카오 로그인 완료:', userInfo);

                // 자동 로그인 설정
                localStorage.setItem('rememberLogin', 'true');

                showNotification(`${data.user.name}님, 환영합니다!`, 'success');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                // 카카오 로그인 실패
                console.log('❌ 카카오 로그인 실패:', data.message);
                showNotification(data.message || '카카오 로그인에 실패했습니다.', 'error');
            }
        })
        .catch(error => {
            console.error('카카오 로그인 API 오류:', error);

            // 에러 유형에 따른 메시지
            let errorMessage = '카카오 로그인 처리 중 오류가 발생했습니다.';

            if (error.message.includes('404')) {
                errorMessage = '카카오 로그인 API를 찾을 수 없습니다.';
            } else if (error.message.includes('500')) {
                errorMessage = '서버 오류로 카카오 로그인에 실패했습니다.';
            }

            showNotification(errorMessage, 'error');
        });
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

// 로그인 상태 유지 확인 - 서버 API 기반
window.addEventListener('load', function () {
    const authToken = localStorage.getItem('authToken');
    const rememberLogin = localStorage.getItem('rememberLogin');
    const userInfo = localStorage.getItem('userInfo');

    if (rememberLogin && authToken && userInfo) {
        // 서버에서 JWT 토큰 유효성 검증
        fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        })
            .then(response => {
                console.log('토큰 검증 응답 상태:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.valid) {
                    // 토큰이 유효하면 자동 로그인
                    console.log('✅ JWT 토큰 유효, 자동 로그인');
                    showNotification('이미 로그인된 상태입니다.', 'info');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    // 토큰이 무효하면 로그인 정보 삭제
                    console.log('❌ JWT 토큰 무효, 로그인 정보 삭제');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userInfo');
                    localStorage.removeItem('rememberLogin');
                    showNotification('로그인이 만료되었습니다. 다시 로그인해주세요.', 'info');
                }
            })
            .catch(error => {
                console.error('토큰 검증 오류:', error);
                // 네트워크 오류 등의 경우 자동 로그인 시도하지 않고 현재 페이지 유지
            });
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
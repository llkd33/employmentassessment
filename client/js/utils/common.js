// 공통 설정 정보 (동적으로 로드됨)
let APP_CONFIG = {
    KAKAO_API_KEY: null  // 서버에서 동적으로 로드
};

// 서버에서 설정 정보 가져오기
async function loadAppConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        APP_CONFIG.KAKAO_API_KEY = config.kakaoApiKey;

        // 상세 디버깅 로그
        console.log('✅ 서버에서 설정 정보 로드 완료');
        console.log('🔑 카카오 API 키 디버깅:');
        console.log(`   - 서버 응답: ${JSON.stringify(config)}`);
        console.log(`   - 키 존재 여부: ${config.kakaoApiKey ? 'YES' : 'NO'}`);
        console.log(`   - 키 타입: ${typeof config.kakaoApiKey}`);
        console.log(`   - 키 길이: ${config.kakaoApiKey ? config.kakaoApiKey.length : 0}자`);
        console.log(`   - 키 앞 8자리: ${config.kakaoApiKey ? config.kakaoApiKey.substring(0, 8) + '...' : 'null'}`);

        return APP_CONFIG;
    } catch (error) {
        console.error('❌ 설정 정보 로드 실패:', error);
        return APP_CONFIG;
    }
}

// 알림 표시 함수 (통합)
function showNotification(message, type = 'info', duration = 3000) {
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
    }, duration);
}

// 홈 이동 함수 (통합)
function goHome() {
    window.location.href = '/';
}

// 카카오 SDK 초기화 함수 (설정 동적 로드 포함)
async function initKakaoSDK(callback = null) {
    try {
        // 먼저 서버에서 설정 정보 로드
        if (!APP_CONFIG.KAKAO_API_KEY) {
            console.log('🔄 서버에서 카카오 API 키 로드 중...');
            await loadAppConfig();
        }

        // 카카오 SDK가 로드될 때까지 대기
        if (!window.Kakao) {
            console.log('⏳ 카카오 SDK 로딩 대기 중...');
            setTimeout(() => initKakaoSDK(callback), 1000);
            return;
        }

        // API 키가 없으면 경고만 출력 (버튼은 유지)
        if (!APP_CONFIG.KAKAO_API_KEY) {
            console.log('⚠️ 카카오 API 키가 설정되지 않음. 카카오 로그인 기능 제한됨');
            if (callback) callback();
            return;
        }

        // 카카오 SDK 초기화
        if (!window.Kakao.isInitialized()) {
            console.log('🔄 카카오 SDK 초기화 시작:');
            console.log(`   - 사용할 키: ${APP_CONFIG.KAKAO_API_KEY ? APP_CONFIG.KAKAO_API_KEY.substring(0, 8) + '...' : 'null'}`);

            window.Kakao.init(APP_CONFIG.KAKAO_API_KEY);

            const isInitialized = window.Kakao.isInitialized();
            console.log(`✅ 카카오 SDK 초기화 결과: ${isInitialized ? '성공' : '실패'}`);
            console.log(`   - SDK 상태: ${isInitialized}`);

            if (!isInitialized) {
                console.error('❌ 카카오 SDK 초기화 실패 - 키 확인 필요');
            }
        }

        if (callback) callback();
    } catch (error) {
        console.error('❌ 카카오 SDK 초기화 오류:', error);
        if (callback) callback();
    }
}

// 로그아웃 처리 함수 (통합)
function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('rememberLogin');

        // 카카오 로그아웃 처리
        if (window.Kakao && window.Kakao.Auth && window.Kakao.Auth.getAccessToken()) {
            try {
                window.Kakao.Auth.logout(() => {
                    console.log('카카오 로그아웃 완료');
                });
            } catch (error) {
                console.log('카카오 로그아웃 처리 중 오류 (무시됨):', error);
            }
        }

        showNotification('로그아웃되었습니다.', 'info');

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }
}

// 페이지 애니메이션 함수 (통합)
function animatePageLoad(selectors = ['.header', 'main', '.container']) {
    const elements = [];

    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            elements.push(element);
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
        }
    });

    setTimeout(() => {
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.style.transition = 'all 0.5s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }, 100);
}

// 사용자 정보 유틸리티 함수들
const UserUtils = {
    // 표시용 이름 생성
    getDisplayName(user, maxLength = 8) {
        let displayName = '사용자';

        if (user.name && user.name !== user.email) {
            displayName = user.name;
        } else if (user.nickname && user.nickname !== user.email && user.nickname !== user.email.split('@')[0]) {
            displayName = user.nickname;
        } else if (user.email && user.email.includes('@')) {
            displayName = user.email.split('@')[0];
        }

        if (displayName.length > maxLength) {
            displayName = displayName.substring(0, maxLength);
        }

        return displayName;
    },

    // 등록된 사용자 목록에서 사용자 찾기
    findRegisteredUser(email) {
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        return registeredUsers.find(u => u.email === email);
    },

    // 현재 로그인된 사용자 정보 업데이트
    updateCurrentUserInfo() {
        const currentUserInfo = localStorage.getItem('userInfo');
        if (!currentUserInfo) return null;

        const currentUser = JSON.parse(currentUserInfo);
        const matchedUser = this.findRegisteredUser(currentUser.email);

        if (matchedUser && matchedUser.name) {
            currentUser.name = matchedUser.name;
            currentUser.nickname = matchedUser.nickname || matchedUser.name;
            localStorage.setItem('userInfo', JSON.stringify(currentUser));
        }

        return currentUser;
    }
};

// API 호출 유틸리티
const ApiUtils = {
    // 기본 헤더 생성
    getHeaders(includeAuth = false) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = localStorage.getItem('authToken');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    },

    // 에러 처리
    handleApiError(error, defaultMessage = '오류가 발생했습니다.') {
        console.error('API 오류:', error);
        showNotification(error.message || defaultMessage, 'error');
    }
};

// 공통 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function () {
    // 앱 설정 정보 미리 로드
    loadAppConfig();

    // 전역 키보드 이벤트 (ESC 키로 모달 닫기 등)
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal, .kakao-signup-modal');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                }
            });
        }
    });
});

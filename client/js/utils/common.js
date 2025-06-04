// 공통 설정 정보
const APP_CONFIG = {
    KAKAO_API_KEY: window.location.hostname === 'localhost'
        ? 'your_kakao_javascript_key_here'  // 개발용 (카카오 개발자 콘솔에서 발급)
        : 'your_kakao_javascript_key_here'  // 프로덕션용 (카카오 개발자 콘솔에서 발급)
};

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

// 카카오 SDK 초기화 함수 (통합)
function initKakaoSDK(callback = null) {
    if (window.Kakao) {
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(APP_CONFIG.KAKAO_API_KEY);
            console.log('카카오 SDK 초기화 완료:', window.Kakao.isInitialized());
        }
        if (callback) callback();
    } else {
        console.log('카카오 SDK 로딩 중...');
        setTimeout(() => initKakaoSDK(callback), 1000);
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

// 뒤로가기 확인 기능
const BackNavigation = {
    enabled: false,

    // 뒤로가기 확인 활성화
    enable(options = {}) {
        if (this.enabled) return;

        const config = {
            message: '페이지를 나가시겠습니까?',
            title: '확인',
            redirectUrl: '/',
            ...options
        };

        this.enabled = true;

        // 히스토리에 현재 상태 추가 (뒤로가기 감지용)
        if (window.history && window.history.pushState) {
            window.history.pushState({ backNavigationEnabled: true }, '', window.location.href);
        }

        // popstate 이벤트 리스너 등록
        this.handlePopState = async (event) => {
            if (this.enabled) {
                // 히스토리를 다시 앞으로 이동 (뒤로가기 취소)
                window.history.pushState({ backNavigationEnabled: true }, '', window.location.href);

                // UI.Modal.confirm 사용 (마이페이지와 동일한 스타일)
                if (window.UI && window.UI.Modal) {
                    const confirmed = await window.UI.Modal.confirm(config.message, config.title);
                    if (confirmed) {
                        this.disable();
                        window.location.href = config.redirectUrl;
                    }
                } else {
                    // UI 모달이 없는 경우 기본 confirm 사용
                    const confirmed = confirm(config.message);
                    if (confirmed) {
                        this.disable();
                        window.location.href = config.redirectUrl;
                    }
                }
            }
        };

        window.addEventListener('popstate', this.handlePopState);
    },

    // 뒤로가기 확인 비활성화
    disable() {
        if (!this.enabled) return;

        this.enabled = false;
        if (this.handlePopState) {
            window.removeEventListener('popstate', this.handlePopState);
            this.handlePopState = null;
        }
    }
};

// 전역에서 사용할 수 있도록 노출
window.BackNavigation = BackNavigation;

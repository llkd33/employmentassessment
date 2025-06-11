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

// 카카오 자동 로그인 강제 해제 함수
function forceKakaoLogout() {
    if (window.Kakao && window.Kakao.Auth) {
        try {
            // 탈퇴한 계정인지 확인
            const deletedTime = localStorage.getItem('kakao_account_deleted');
            if (deletedTime) {
                console.log('🚫 탈퇴한 카카오 계정 감지, 강제 로그아웃 실행');

                // 카카오 자동 로그인 상태 확인 및 강제 해제
                if (window.Kakao.Auth.getAccessToken()) {
                    console.log('🔄 카카오 자동 로그인 상태 감지, 강제 로그아웃');
                    window.Kakao.Auth.logout(() => {
                        console.log('✅ 카카오 강제 로그아웃 완료');
                    });
                    window.Kakao.Auth.setAccessToken(null);
                }

                // 추가 정리
                forceKakaoCleanup();
                return true; // 강제 로그아웃 실행됨
            }
        } catch (error) {
            console.log('카카오 강제 로그아웃 중 오류 (무시됨):', error);
        }
    }
    return false; // 강제 로그아웃 없음
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

        // 카카오 SDK 초기화 후 강제 로그아웃 확인
        setTimeout(() => {
            forceKakaoLogout();
        }, 1000);

        if (callback) callback();
    } catch (error) {
        console.error('❌ 카카오 SDK 초기화 오류:', error);
        if (callback) callback();
    }
}

// 글로벌 카카오 완전 정리 함수
function forceKakaoCleanup() {
    try {
        console.log('🧹 강제 카카오 정리 시작...');

        // 1. 카카오 SDK 정리
        if (window.Kakao && window.Kakao.Auth) {
            try {
                // 카카오 로그아웃
                window.Kakao.Auth.logout(() => {
                    console.log('✓ 강제 카카오 로그아웃 완료');
                });

                // 액세스 토큰 제거
                window.Kakao.Auth.setAccessToken(null);

                // 카카오 SDK 재초기화 (완전 리셋)
                if (window.Kakao.isInitialized()) {
                    console.log('🔄 카카오 SDK 재초기화 시도...');
                    // SDK를 완전히 리셋하기 위해 내부 상태 초기화
                    try {
                        delete window.Kakao._isInitialized;
                    } catch (e) { }
                }
            } catch (error) {
                console.log('카카오 SDK 정리 중 오류 (무시됨):', error);
            }
        }

        // 2. 모든 저장소에서 카카오 관련 데이터 제거
        const allKakaoKeys = [
            'tempKakaoInfo', 'kakao_auth_state', 'kakao_sdk', 'kakao_app_key',
            'kakao_login_state', 'KAKAO_SDK_INITIALIZED'
        ];

        allKakaoKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // 3. 동적으로 찾은 카카오 관련 키들도 제거
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.includes('kakao') || key.includes('Kakao') || key.includes('KAKAO'))) {
                localStorage.removeItem(key);
                console.log('✓ localStorage에서 카카오 데이터 제거:', key);
            }
        }

        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('kakao') || key.includes('Kakao') || key.includes('KAKAO'))) {
                sessionStorage.removeItem(key);
                console.log('✓ sessionStorage에서 카카오 데이터 제거:', key);
            }
        }

        // 4. 브라우저 쿠키에서 카카오 관련 데이터 제거 시도
        try {
            const cookies = document.cookie.split(";");
            cookies.forEach(function (cookie) {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

                if (name.toLowerCase().includes('kakao') || name.toLowerCase().includes('k_')) {
                    // 다양한 도메인과 경로로 쿠키 삭제 시도
                    const domains = [window.location.hostname, '.kakao.com', '.kakao.net'];
                    const paths = ['/', '/auth/', '/login/'];

                    domains.forEach(domain => {
                        paths.forEach(path => {
                            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`;
                        });
                    });
                    console.log('✓ 카카오 쿠키 삭제 시도:', name);
                }
            });
        } catch (cookieError) {
            console.log('쿠키 정리 중 오류 (무시됨):', cookieError);
        }

        // 5. IndexedDB에서 카카오 관련 데이터 제거 시도
        try {
            if ('indexedDB' in window) {
                const deleteDB = indexedDB.deleteDatabase('kakao');
                deleteDB.onsuccess = () => console.log('✓ 카카오 IndexedDB 삭제 완료');
                deleteDB.onerror = () => console.log('카카오 IndexedDB 삭제 실패 (무시됨)');
            }
        } catch (idbError) {
            console.log('IndexedDB 정리 중 오류 (무시됨):', idbError);
        }

        console.log('✅ 강제 카카오 정리 완료');
    } catch (error) {
        console.log('강제 카카오 정리 중 오류 (무시됨):', error);
    }
}

// 핵폭탄급 브라우저 저장소 완전 정리 (탈퇴 시에만 사용)
function nuclearCleanup() {
    console.log('💥 핵폭탄급 브라우저 정리 시작...');

    try {
        // 1. 카카오 완전 정리
        forceKakaoCleanup();

        // 2. 현재 도메인의 모든 저장소 정리
        if (confirm('브라우저의 모든 저장된 데이터를 완전히 정리하시겠습니까? (로그인 상태 등이 모두 초기화됩니다)')) {
            // localStorage 완전 정리
            localStorage.clear();

            // sessionStorage 완전 정리
            sessionStorage.clear();

            // 서비스 워커 정리
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                });
            }

            // 캐시 정리
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }

            console.log('💥 핵폭탄급 정리 완료 - 페이지 새로고침');
            window.location.reload(true);
        }
    } catch (error) {
        console.log('핵폭탄급 정리 중 오류 (무시됨):', error);
    }
}

// 로그아웃 처리 함수 (통합)
function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('rememberLogin');

        // 강화된 카카오 정리
        forceKakaoCleanup();

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

// 페이지별 카카오 상태 확인 및 정리
function checkAndCleanKakaoOnPageLoad() {
    // 현재 페이지가 로그인/회원가입 페이지인 경우에만 실행
    const currentPage = window.location.pathname;
    const isAuthPage = currentPage.includes('login') || currentPage.includes('signup') || currentPage === '/';

    if (isAuthPage) {
        console.log('🔍 인증 페이지에서 카카오 상태 확인 중...');

        // 2초 후에 카카오 상태 확인 (SDK 로드 완료 대기)
        setTimeout(() => {
            const deletedTime = localStorage.getItem('kakao_account_deleted');
            if (deletedTime && window.Kakao && window.Kakao.Auth) {
                try {
                    if (window.Kakao.Auth.getAccessToken()) {
                        console.log('🚫 탈퇴한 계정의 카카오 자동 로그인 감지, 강제 정리');
                        window.Kakao.Auth.logout(() => {
                            console.log('✅ 페이지 로드 시 카카오 강제 로그아웃 완료');
                        });
                        window.Kakao.Auth.setAccessToken(null);
                        forceKakaoCleanup();
                    }
                } catch (error) {
                    console.log('페이지 로드 시 카카오 정리 중 오류 (무시됨):', error);
                }
            }
        }, 2000);
    }
}

// 공통 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function () {
    // 앱 설정 정보 미리 로드
    loadAppConfig();

    // 페이지 로드 시 카카오 상태 확인
    checkAndCleanKakaoOnPageLoad();

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

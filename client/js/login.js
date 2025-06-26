// 로그인 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('로그인 페이지 JavaScript 로드 완료');

    // common.js의 개선된 카카오 SDK 초기화 사용
    initKakaoSDK();

    // 카카오 로그인 상태 초기화
    initKakaoLoginState();

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

            // 응답 본문을 먼저 읽기 (성공/실패 관계없이)
            return response.json().then(data => {
                return { response, data };
            }).catch(jsonError => {
                // JSON 파싱 실패 시 기본 에러 데이터 반환
                console.error('JSON 파싱 실패:', jsonError);
                return {
                    response,
                    data: {
                        success: false,
                        message: '아이디와 비밀번호가 일치하지 않습니다.'
                    }
                };
            });
        })
        .then(({ response, data }) => {
            if (response.ok && data.success) {
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
                // 로그인 실패 - 아이디/비밀번호 불일치 등
                console.log('❌ 로그인 실패:', response.status, data.message);

                // 401: 아이디/비밀번호 불일치
                if (response.status === 401) {
                    showNotification('아이디와 비밀번호가 일치하지 않습니다.', 'error');
                }
                // 400-499: 기타 클라이언트 오류 (아이디/비밀번호 관련)
                else if (response.status >= 400 && response.status < 500) {
                    showNotification('아이디와 비밀번호가 일치하지 않습니다.', 'error');
                }
                // 503: 데이터베이스 연결 오류
                else if (response.status === 503) {
                    showNotification(data.message || '데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.', 'error');
                }
                // 500+: 기타 서버 오류
                else if (response.status >= 500) {
                    showNotification(data.message || '시스템 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
                }
                // 기타 오류 (일반적으로 아이디/비밀번호 불일치)
                else {
                    showNotification('아이디와 비밀번호가 일치하지 않습니다.', 'error');
                }
            }
        })
        .catch(error => {
            console.error('로그인 API 오류:', error);

            // 기본적으로 아이디/비밀번호 불일치로 처리
            let errorMessage = '아이디와 비밀번호가 일치하지 않습니다.';

            // 모든 오류를 로그인 실패로 처리
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                // 서버 연결 실패 확인을 위한 추가 체크
                // 하지만 대부분의 경우 로그인 실패로 간주
                errorMessage = '아이디와 비밀번호가 일치하지 않습니다.';
            }
            // CORS 정책 오류도 로그인 실패로 처리
            else if (error.message.includes('CORS')) {
                errorMessage = '아이디와 비밀번호가 일치하지 않습니다.';
            }
            // 그 외의 모든 오류는 로그인 실패로 처리

            showNotification(errorMessage, 'error');
        })
        .finally(() => {
            // 로딩 상태 해제
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

// 카카오 로그인 상태 초기화
function initKakaoLoginState() {
    if (window.Kakao && window.Kakao.isInitialized()) {
        // 기존 카카오 로그인 상태가 있다면 정리
        if (window.Kakao.Auth.getAccessToken()) {
            console.log('🔄 기존 카카오 로그인 상태 감지됨, 완전 로그아웃 진행');

            // 사용자에게 알림
            showNotification('카카오 로그인을 초기화하고 있습니다...', 'info');

            // 카카오 로그아웃
            window.Kakao.Auth.logout(() => {
                console.log('✅ 카카오 완전 로그아웃 완료');
                window.Kakao.Auth.setAccessToken(null);

                // 로컬 스토리지 정리
                localStorage.removeItem('kakao_access_token');
                localStorage.removeItem('kakao_user_info');

                showNotification('카카오 로그인 준비가 완료되었습니다. 이제 새로 로그인할 수 있습니다.', 'success');
            });
        }
    }
}

// 카카오 로그인 함수
function kakaoLogin() {
    // 탈퇴한 카카오 계정인지 확인
    const deletedTime = localStorage.getItem('kakao_account_deleted');
    if (deletedTime) {
        const deletedDate = new Date(parseInt(deletedTime));
        const timeSinceDeleted = Date.now() - parseInt(deletedTime);

        // 탈퇴 후 1시간 이내라면 재로그인 차단
        if (timeSinceDeleted < 60 * 60 * 1000) { // 1시간 = 60분 * 60초 * 1000ms
            const remainingTime = Math.ceil((60 * 60 * 1000 - timeSinceDeleted) / (60 * 1000)); // 남은 분
            showNotification(`최근에 탈퇴한 카카오 계정입니다. ${remainingTime}분 후에 다시 시도해주세요.`, 'error');
            return;
        } else {
            // 1시간이 지났으면 탈퇴 마크 제거
            localStorage.removeItem('kakao_account_deleted');
            console.log('✓ 카카오 탈퇴 제한 시간 만료, 재로그인 허용');
        }
    }

    // API 키 확인
    if (!APP_CONFIG.KAKAO_API_KEY) {
        showNotification('카카오 로그인 서비스가 일시적으로 사용할 수 없습니다. 이메일 로그인을 사용해주세요.', 'error');
        return;
    }

    if (!window.Kakao || !window.Kakao.isInitialized()) {
        showNotification('카카오 SDK가 초기화되지 않았습니다. 페이지를 새로고침해주세요.', 'error');
        return;
    }

    console.log('🔄 카카오 로그인 시작 (자동로그인 허용)');

    try {
        window.Kakao.Auth.login({
            success: function (authObj) {
                console.log('✅ 카카오 로그인 성공:', authObj);
                getUserInfoFromKakao();
            },
            fail: function (err) {
                console.error('❌ 카카오 로그인 실패:', err);

                // 상세한 오류 메시지
                let errorMessage = '카카오 로그인에 실패했습니다.';
                if (err.error === 'cancelled') {
                    errorMessage = '로그인이 취소되었습니다.';
                } else if (err.error === 'access_denied') {
                    errorMessage = '로그인 권한이 거부되었습니다.';
                } else if (err.error === 'popup_blocked') {
                    errorMessage = '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.';
                }

                showNotification(errorMessage, 'error');
            }
        });
    } catch (error) {
        console.error('카카오 로그인 호출 중 예외:', error);
        showNotification('카카오 로그인 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.', 'error');
    }
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

    // 서버 API로 카카오 로그인 처리 (기존 사용자만)
    fetch('/api/auth/kakao/login', {
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

            // 응답 본문을 먼저 읽기 (성공/실패 관계없이)
            return response.json().then(data => {
                return { response, data };
            }).catch(jsonError => {
                // JSON 파싱 실패 시 기본 에러 데이터 반환
                console.error('카카오 로그인 JSON 파싱 실패:', jsonError);
                return {
                    response,
                    data: {
                        success: false,
                        message: '카카오 로그인 중 오류가 발생했습니다.'
                    }
                };
            });
        })
        .then(({ response, data }) => {
            if (response.ok && data.success) {
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
                // 카카오 로그인 실패 처리
                console.log('❌ 카카오 로그인 실패:', response.status, data.message);

                // 404: 등록되지 않은 계정 (회원가입 필요)
                if (response.status === 404 && data.needSignup) {
                    console.log('🔄 등록되지 않은 카카오 계정, 회원가입 페이지로 이동');

                    // 카카오 정보를 임시 저장
                    if (data.kakaoData) {
                        localStorage.setItem('tempKakaoInfo', JSON.stringify({
                            userId: data.kakaoData.kakaoId,
                            nickname: data.kakaoData.nickname,
                            email: data.kakaoData.email,
                            loginType: 'kakao'
                        }));
                    }

                    showNotification('등록되지 않은 계정입니다. 회원가입 페이지로 이동합니다.', 'info');

                    setTimeout(() => {
                        window.location.href = '/signup.html';
                    }, 1500);
                }
                // 400: 다른 로그인 방식으로 가입된 계정
                else if (response.status === 400 && data.existingLoginType) {
                    const loginTypeText = data.existingLoginType === 'email' ? '이메일' : '다른 방식';
                    showNotification(`이미 ${loginTypeText}으로 가입된 계정입니다. ${loginTypeText} 로그인을 사용해주세요.`, 'error');
                }
                // 기타 오류
                else {
                    const errorMessage = data.message || '카카오 로그인에 실패했습니다.';

                    // 503: 데이터베이스 연결 오류
                    if (response.status === 503) {
                        showNotification(data.message || '데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.', 'error');
                    }
                    // 500+: 기타 서버 오류  
                    else if (response.status >= 500) {
                        showNotification(data.message || '시스템 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
                    } else {
                        showNotification(errorMessage, 'error');
                    }
                }
            }
        })
        .catch(error => {
            console.error('카카오 로그인 API 오류:', error);

            // 카카오 로그인 실패로 통일
            let errorMessage = '카카오 로그인 중 오류가 발생했습니다.';

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
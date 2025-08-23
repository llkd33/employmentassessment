// Kakao SDK Configuration
// Replace 'YOUR_JAVASCRIPT_KEY' with your actual Kakao JavaScript key
const KAKAO_JAVASCRIPT_KEY = 'YOUR_JAVASCRIPT_KEY'; // TODO: Replace with actual key

// Initialize Kakao SDK
function initializeKakao() {
    try {
        // Check if Kakao SDK is loaded
        if (typeof Kakao === 'undefined') {
            console.error('Kakao SDK not loaded');
            return false;
        }

        // Initialize only if not already initialized
        if (!Kakao.isInitialized()) {
            Kakao.init(KAKAO_JAVASCRIPT_KEY);
            console.log('Kakao SDK initialized:', Kakao.isInitialized());
            
            // Verify initialization
            if (Kakao.isInitialized()) {
                console.log('✅ Kakao SDK 초기화 성공');
                return true;
            } else {
                console.error('❌ Kakao SDK 초기화 실패');
                return false;
            }
        } else {
            console.log('Kakao SDK already initialized');
            return true;
        }
    } catch (error) {
        console.error('Kakao SDK initialization error:', error);
        return false;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeKakao);
} else {
    // DOM is already loaded
    initializeKakao();
}

// Kakao Login function
function loginWithKakao() {
    if (!Kakao.isInitialized()) {
        alert('Kakao SDK가 초기화되지 않았습니다.');
        return;
    }

    Kakao.Auth.login({
        success: function(authObj) {
            console.log('Kakao login success:', authObj);
            
            // Get user info
            Kakao.API.request({
                url: '/v2/user/me',
                success: function(response) {
                    console.log('User info:', response);
                    handleKakaoLogin(response);
                },
                fail: function(error) {
                    console.error('Failed to get user info:', error);
                    alert('사용자 정보를 가져오는데 실패했습니다.');
                }
            });
        },
        fail: function(err) {
            console.error('Kakao login failed:', err);
            alert('카카오 로그인에 실패했습니다.');
        }
    });
}

// Handle Kakao login response
function handleKakaoLogin(userInfo) {
    // Extract user information
    const kakaoAccount = userInfo.kakao_account || {};
    const profile = kakaoAccount.profile || {};
    
    const userData = {
        kakaoId: userInfo.id,
        email: kakaoAccount.email,
        name: profile.nickname,
        profileImage: profile.profile_image_url
    };

    // Send to server for authentication
    fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.token) {
            // Store token
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.user.role);
            
            // Redirect based on role
            if (data.user.role === 'super_admin' || data.user.role === 'company_admin') {
                window.location.href = '/super-admin-dashboard.html';
            } else {
                window.location.href = '/dashboard.html';
            }
        } else {
            alert(data.message || '로그인에 실패했습니다.');
        }
    })
    .catch(error => {
        console.error('Server authentication error:', error);
        alert('서버 인증 중 오류가 발생했습니다.');
    });
}

// Kakao Logout function
function logoutFromKakao() {
    if (!Kakao.isInitialized()) {
        return;
    }

    Kakao.Auth.logout(function() {
        console.log('Kakao logout success');
        // Clear local storage
        localStorage.clear();
        // Redirect to login
        window.location.href = '/login.html';
    });
}

// Export functions for global use
window.kakaoAuth = {
    initialize: initializeKakao,
    login: loginWithKakao,
    logout: logoutFromKakao,
    isInitialized: () => Kakao && Kakao.isInitialized()
};
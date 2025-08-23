// Kakao SDK Configuration
// Replace 'YOUR_JAVASCRIPT_KEY' with your actual Kakao JavaScript key
const KAKAO_JAVASCRIPT_KEY = 'YOUR_JAVASCRIPT_KEY'; // TODO: Replace with actual key

// Initialize Kakao SDK
function initializeKakao() {
    try {
        // Check if Kakao SDK is loaded
        if (typeof Kakao === 'undefined') {
            console.error('❌ Kakao SDK not loaded. Please check:');
            console.error('1. Internet connection');
            console.error('2. CSP settings allow developers.kakao.com');
            console.error('3. Script tag is properly included');
            return false;
        }

        // Check if key is configured
        if (KAKAO_JAVASCRIPT_KEY === 'YOUR_JAVASCRIPT_KEY') {
            console.warn('⚠️ Kakao JavaScript key not configured.');
            console.warn('Please update KAKAO_JAVASCRIPT_KEY in kakao-config.js');
            return false;
        }

        // Initialize only if not already initialized
        if (!Kakao.isInitialized()) {
            console.log('🔄 Initializing Kakao SDK...');
            Kakao.init(KAKAO_JAVASCRIPT_KEY);
            
            // Verify initialization
            if (Kakao.isInitialized()) {
                console.log('✅ Kakao SDK 초기화 성공');
                console.log('SDK Version:', Kakao.VERSION);
                window.KAKAO_INITIALIZED = true;
                return true;
            } else {
                console.error('❌ Kakao SDK 초기화 실패');
                console.error('Please check if the JavaScript key is correct');
                return false;
            }
        } else {
            console.log('✅ Kakao SDK already initialized');
            window.KAKAO_INITIALIZED = true;
            return true;
        }
    } catch (error) {
        console.error('❌ Kakao SDK initialization error:', error);
        console.error('Error details:', error.message);
        return false;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for Kakao SDK to fully load
        setTimeout(initializeKakao, 500);
    });
} else {
    // DOM is already loaded, but still wait for SDK
    setTimeout(initializeKakao, 500);
}

// Also try to initialize when window fully loads
window.addEventListener('load', () => {
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
        initializeKakao();
    }
});

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

// Helper function to check SDK status
function checkKakaoStatus() {
    console.log('=== Kakao SDK Status ===');
    console.log('Kakao object exists:', typeof Kakao !== 'undefined');
    if (typeof Kakao !== 'undefined') {
        console.log('Kakao.isInitialized():', Kakao.isInitialized());
        console.log('Kakao.VERSION:', Kakao.VERSION);
        console.log('JavaScript Key configured:', KAKAO_JAVASCRIPT_KEY !== 'YOUR_JAVASCRIPT_KEY');
    } else {
        console.log('Kakao SDK not loaded. Check network tab for blocked requests.');
    }
    console.log('=======================');
}

// Export functions for global use
window.kakaoAuth = {
    initialize: initializeKakao,
    login: loginWithKakao,
    logout: logoutFromKakao,
    isInitialized: () => typeof Kakao !== 'undefined' && Kakao.isInitialized(),
    checkStatus: checkKakaoStatus
};

// Add global shortcut for debugging
window.checkKakao = checkKakaoStatus;
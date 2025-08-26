/**
 * Admin Authentication Helper
 * 관리자 인증 관련 공통 유틸리티
 */

class AdminAuth {
    constructor() {
        this.token = null;
        this.user = null;
        this.tokenRefreshInterval = null;
        this.init();
    }

    init() {
        // 로컬 스토리지에서 토큰과 사용자 정보 로드
        this.token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
        const userStr = localStorage.getItem('adminUser');
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (e) {
                console.error('Failed to parse user data:', e);
            }
        }
    }

    /**
     * 토큰이 유효한지 확인
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * 토큰 가져오기
     */
    getToken() {
        return this.token;
    }

    /**
     * 사용자 정보 가져오기
     */
    getUser() {
        return this.user;
    }

    /**
     * 토큰 저장
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('adminToken', token);
    }

    /**
     * 사용자 정보 저장
     */
    setUser(user) {
        this.user = user;
        localStorage.setItem('adminUser', JSON.stringify(user));
    }

    /**
     * API 요청 헬퍼 - 자동으로 토큰 추가 및 갱신 처리
     */
    async fetchWithAuth(url, options = {}) {
        if (!this.token) {
            throw new Error('No authentication token found');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.token}`
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // 토큰 갱신 확인
            const newToken = response.headers.get('X-New-Token');
            if (newToken) {
                console.log('Token refreshed');
                this.setToken(newToken);
            }

            // 401 또는 403 에러 처리
            if (response.status === 401 || response.status === 403) {
                // 토큰이 만료되었거나 유효하지 않음
                console.error('Authentication failed:', response.status);
                
                // 한 번 재시도
                if (!options._retry) {
                    console.log('Retrying with existing token...');
                    return this.fetchWithAuth(url, { ...options, _retry: true });
                }
                
                // 재시도도 실패하면 로그아웃
                this.logout();
                return response;
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    /**
     * 프로필 로드
     */
    async loadProfile() {
        try {
            const response = await this.fetchWithAuth('/api/admin/profile');
            
            if (response.ok) {
                const profile = await response.json();
                this.setUser(profile);
                return profile;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to load profile:', error);
            return null;
        }
    }

    /**
     * 로그아웃
     */
    logout() {
        // 토큰 및 사용자 정보 삭제
        this.token = null;
        this.user = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminUser');
        
        // 토큰 갱신 인터벌 정리
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }
        
        // 로그인 페이지로 리다이렉션
        window.location.href = '/admin-login.html';
    }

    /**
     * 인증 필요 페이지 체크
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            console.log('Authentication required, redirecting to login...');
            window.location.href = '/admin-login.html';
            return false;
        }
        return true;
    }

    /**
     * 토큰 자동 갱신 시작
     */
    startTokenRefresh(interval = 30 * 60 * 1000) { // 30분마다
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        this.tokenRefreshInterval = setInterval(async () => {
            console.log('Refreshing token...');
            await this.loadProfile();
        }, interval);
    }

    /**
     * 토큰 자동 갱신 중지
     */
    stopTokenRefresh() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }
}

// 전역 인스턴스 생성
window.adminAuth = new AdminAuth();
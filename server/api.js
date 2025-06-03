// API 기본 설정
const API_BASE_URL = 'http://localhost:5000/api';

// 토큰 관리
const getToken = () => localStorage.getItem('authToken');
const setToken = (token) => localStorage.setItem('authToken', token);
const removeToken = () => localStorage.removeItem('authToken');

// API 헬퍼 함수
const apiCall = async (endpoint, options = {}) => {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || '요청 실패');
    }

    return data;
};

// 인증 API
const authAPI = {
    // 회원가입
    signup: async (userData) => {
        const data = await apiCall('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        setToken(data.token);
        return data;
    },

    // 로그인
    login: async (email, password) => {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        return data;
    },

    // 카카오 로그인
    kakaoLogin: async (kakaoData) => {
        const data = await apiCall('/auth/kakao', {
            method: 'POST',
            body: JSON.stringify(kakaoData),
        });
        setToken(data.token);
        return data;
    },

    // 로그아웃
    logout: () => {
        removeToken();
        localStorage.removeItem('userInfo');
    }
};

// 역량검사 API
const testAPI = {
    // 문제 가져오기
    getQuestions: () => apiCall('/test/questions'),

    // 결과 제출
    submitAnswers: (answers) => apiCall('/test/submit', {
        method: 'POST',
        body: JSON.stringify(answers),
    }),

    // 결과 조회
    getResults: (userId) => apiCall(`/test/results/${userId}`),
};

// 사용자 API
const userAPI = {
    // 프로필 조회
    getProfile: (userId) => apiCall(`/user/profile/${userId}`),

    // 프로필 수정
    updateProfile: (userId, data) => apiCall(`/user/profile/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
};

// export
window.API = {
    auth: authAPI,
    test: testAPI,
    user: userAPI,
}; 
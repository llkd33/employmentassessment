/**
 * User Management - 사용자 관리 모듈
 * @author Employee Test System
 * @version 1.0.0
 */

const User = (() => {
    'use strict';

    let currentUser = null;

    /**
     * 데모 계정 데이터
     */
    const DEMO_ACCOUNTS = [
        {
            id: 'demo_user',
            name: '데모 사용자',
            nickname: '데모',
            email: 'demo@example.com',
            password: 'demo123',
            loginType: 'email',
            joinDate: new Date().toISOString()
        },
        {
            id: 'test_user',
            name: '테스트',
            nickname: '테스트',
            email: 'test@test.com',
            password: 'test123',
            loginType: 'email',
            joinDate: new Date().toISOString()
        },
        {
            id: 'test123_user',
            name: '테스트',
            nickname: '테스트123',
            email: 'test123@test.com',
            password: 'test123',
            loginType: 'email',
            joinDate: new Date().toISOString()
        }
    ];

    /**
     * 초기화
     */
    function init() {
        initDemoAccounts();
        loadUserFromStorage();
    }

    /**
     * 데모 계정 초기화
     */
    function initDemoAccounts() {
        const registeredUsers = Core.Storage.get('registeredUsers', []);
        let updated = false;

        DEMO_ACCOUNTS.forEach(account => {
            if (!registeredUsers.find(u => u.email === account.email)) {
                registeredUsers.push(account);
                updated = true;
            }
        });

        if (updated) {
            Core.Storage.set('registeredUsers', registeredUsers);
        }
    }

    /**
     * 스토리지에서 사용자 정보 로드
     */
    function loadUserFromStorage() {
        const userData = Core.Storage.get('userInfo');
        if (userData) {
            currentUser = userData;

            // 등록된 사용자 정보와 동기화
            const registeredUsers = Core.Storage.get('registeredUsers', []);
            const matchedUser = registeredUsers.find(u => u.email === userData.email);

            if (matchedUser && matchedUser.name && (!userData.name || userData.name !== matchedUser.name)) {
                currentUser.name = matchedUser.name;
                currentUser.nickname = matchedUser.nickname || matchedUser.name;
                Core.Storage.set('userInfo', currentUser);
            }
        }
    }

    /**
     * 사용자 이름 표시 포맷
     * @param {Object} user 
     * @returns {string}
     */
    function getDisplayName(user) {
        if (!user) return '사용자';

        // 이름 우선, 없으면 닉네임, 없으면 이메일 앞부분
        if (user.name && user.name.trim()) {
            return user.name.trim().length > 8 ? user.name.trim().substring(0, 8) + '...' : user.name.trim();
        }

        if (user.nickname && user.nickname.trim()) {
            return user.nickname.trim().length > 8 ? user.nickname.trim().substring(0, 8) + '...' : user.nickname.trim();
        }

        if (user.email) {
            const emailPart = user.email.split('@')[0];
            return emailPart.length > 8 ? emailPart.substring(0, 8) + '...' : emailPart;
        }

        return '사용자';
    }

    /**
     * 로그인
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>}
     */
    async function login(email, password) {
        try {
            const registeredUsers = Core.Storage.get('registeredUsers', []);
            const user = registeredUsers.find(u => u.email === email && u.password === password);

            if (!user) {
                throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
            }

            const userData = {
                id: user.id,
                email: user.email,
                name: user.name,
                nickname: user.nickname,
                loginType: user.loginType || 'email',
                loginTime: new Date().toISOString()
            };

            currentUser = userData;
            Core.Storage.set('userInfo', userData);

            UI.Notification.show('로그인되었습니다.', 'success');
            return userData;

        } catch (error) {
            UI.Notification.show(error.message, 'error');
            throw error;
        }
    }

    /**
     * 회원가입
     * @param {Object} userData 
     * @returns {Promise<Object>}
     */
    async function signup(userData) {
        try {
            const { name, email, password, confirmPassword } = userData;

            // 유효성 검사
            if (!name || name.trim().length < 2) {
                throw new Error('이름은 2자 이상 입력해주세요.');
            }

            if (!email || !isValidEmail(email)) {
                throw new Error('올바른 이메일 주소를 입력해주세요.');
            }

            if (!password || password.length < 6) {
                throw new Error('비밀번호는 6자 이상 입력해주세요.');
            }

            if (password !== confirmPassword) {
                throw new Error('비밀번호가 일치하지 않습니다.');
            }

            const registeredUsers = Core.Storage.get('registeredUsers', []);

            // 중복 체크
            if (registeredUsers.find(u => u.email === email)) {
                throw new Error('이미 가입된 이메일입니다.');
            }

            // 새 사용자 정보
            const newUser = {
                id: Core.Utils.generateUUID(),
                name: name.trim(),
                nickname: name.trim(),
                email: email.toLowerCase(),
                password,
                loginType: 'email',
                joinDate: new Date().toISOString()
            };

            registeredUsers.push(newUser);
            Core.Storage.set('registeredUsers', registeredUsers);

            UI.Notification.show('회원가입이 완료되었습니다.', 'success');
            return newUser;

        } catch (error) {
            UI.Notification.show(error.message, 'error');
            throw error;
        }
    }

    /**
     * 로그아웃
     */
    function logout() {
        currentUser = null;
        Core.Storage.remove('userInfo');
        UI.Notification.show('로그아웃되었습니다.', 'info');

        // 메인 페이지로 이동
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }

    /**
     * 회원 탈퇴
     * @returns {Promise<void>}
     */
    async function deleteAccount() {
        try {
            if (!currentUser) {
                throw new Error('로그인 상태가 아닙니다.');
            }

            const confirmed = await UI.Modal.confirm(
                '정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.',
                '회원 탈퇴'
            );

            if (!confirmed) return;

            const registeredUsers = Core.Storage.get('registeredUsers', []);
            const updatedUsers = registeredUsers.filter(u => u.id !== currentUser.id);

            Core.Storage.set('registeredUsers', updatedUsers);
            Core.Storage.remove('userInfo');

            // 테스트 결과도 삭제
            Core.Storage.remove(`testResults_${currentUser.id}`);

            currentUser = null;

            UI.Notification.show('회원 탈퇴가 완료되었습니다.', 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (error) {
            UI.Notification.show(error.message, 'error');
            throw error;
        }
    }

    /**
     * 사용자 정보 업데이트
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async function updateProfile(updates) {
        try {
            if (!currentUser) {
                throw new Error('로그인 상태가 아닙니다.');
            }

            const { name, nickname } = updates;

            if (name && name.trim().length < 2) {
                throw new Error('이름은 2자 이상 입력해주세요.');
            }

            // 현재 사용자 정보 업데이트
            if (name) currentUser.name = name.trim();
            if (nickname) currentUser.nickname = nickname.trim();

            // 스토리지 업데이트
            Core.Storage.set('userInfo', currentUser);

            // 등록된 사용자 목록도 업데이트
            const registeredUsers = Core.Storage.get('registeredUsers', []);
            const userIndex = registeredUsers.findIndex(u => u.id === currentUser.id);

            if (userIndex !== -1) {
                if (name) registeredUsers[userIndex].name = name.trim();
                if (nickname) registeredUsers[userIndex].nickname = nickname.trim();
                Core.Storage.set('registeredUsers', registeredUsers);
            }

            UI.Notification.show('프로필이 업데이트되었습니다.', 'success');
            return currentUser;

        } catch (error) {
            UI.Notification.show(error.message, 'error');
            throw error;
        }
    }

    /**
     * 비밀번호 변경
     * @param {string} currentPassword 
     * @param {string} newPassword 
     * @param {string} confirmPassword 
     * @returns {Promise<void>}
     */
    async function changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            if (!currentUser) {
                throw new Error('로그인 상태가 아닙니다.');
            }

            const registeredUsers = Core.Storage.get('registeredUsers', []);
            const user = registeredUsers.find(u => u.id === currentUser.id);

            if (!user || user.password !== currentPassword) {
                throw new Error('현재 비밀번호가 올바르지 않습니다.');
            }

            if (newPassword.length < 6) {
                throw new Error('새 비밀번호는 6자 이상 입력해주세요.');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('새 비밀번호가 일치하지 않습니다.');
            }

            // 비밀번호 업데이트
            user.password = newPassword;
            Core.Storage.set('registeredUsers', registeredUsers);

            UI.Notification.show('비밀번호가 변경되었습니다.', 'success');

        } catch (error) {
            UI.Notification.show(error.message, 'error');
            throw error;
        }
    }

    /**
     * 이메일 유효성 검사
     * @param {string} email 
     * @returns {boolean}
     */
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * 현재 사용자 정보 반환
     * @returns {Object|null}
     */
    function getCurrentUser() {
        return currentUser;
    }

    /**
     * 로그인 상태 확인
     * @returns {boolean}
     */
    function isLoggedIn() {
        return !!currentUser;
    }

    /**
     * 사용자 테스트 결과 저장
     * @param {Object} testData 
     * @returns {Promise<void>}
     */
    async function saveTestResult(testData) {
        try {
            if (!currentUser) {
                throw new Error('로그인 상태가 아닙니다.');
            }

            const resultData = {
                ...testData,
                userId: currentUser.id,
                userName: currentUser.name,
                userEmail: currentUser.email,
                submittedAt: new Date().toISOString()
            };

            const key = `testResults_${currentUser.id}`;
            const existingResults = Core.Storage.get(key, []);
            existingResults.push(resultData);

            Core.Storage.set(key, existingResults);

            UI.Notification.show('테스트 결과가 저장되었습니다.', 'success');

        } catch (error) {
            UI.Notification.show(error.message, 'error');
            throw error;
        }
    }

    /**
     * 사용자 테스트 결과 조회
     * @returns {Array}
     */
    function getTestResults() {
        if (!currentUser) return [];

        const key = `testResults_${currentUser.id}`;
        return Core.Storage.get(key, []);
    }

    // Public API
    return {
        init,
        login,
        signup,
        logout,
        deleteAccount,
        updateProfile,
        changePassword,
        getCurrentUser,
        isLoggedIn,
        getDisplayName,
        saveTestResult,
        getTestResults
    };
})();

// 전역 스코프에 노출
window.User = User; 
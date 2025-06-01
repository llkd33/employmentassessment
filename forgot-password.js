// 현재 단계 상태
let currentStep = 1;
let userEmail = '';
let generatedCode = '';

// 뒤로가기 함수
function goBack() {
    window.history.back();
}

// 가입된 이메일인지 확인하는 함수
function checkEmailExists(email) {
    // registeredUsers 배열에서 사용자 검색
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    // 등록된 사용자들 중에서 해당 이메일 찾기
    const user = registeredUsers.find(u => u.email === email);
    return user !== undefined;
}

// 단계 변경 함수
function changeStep(step) {
    // 현재 단계 숨기기
    const currentStepEl = document.getElementById(`step${currentStep}`);
    const currentIndicator = document.getElementById(`step${currentStep}-indicator`);

    if (currentStepEl) currentStepEl.classList.add('hidden');
    if (currentIndicator) {
        currentIndicator.classList.remove('active');
        if (step > currentStep) {
            currentIndicator.classList.add('completed');
        }
    }

    // 새 단계 보이기
    currentStep = step;
    const newStepEl = document.getElementById(`step${currentStep}`);
    const newIndicator = document.getElementById(`step${currentStep}-indicator`);

    if (newStepEl) newStepEl.classList.remove('hidden');
    if (newIndicator) newIndicator.classList.add('active');
}

// 인증코드 생성
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 유효성 검사
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 비밀번호 유효성 검사
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// 1단계: 이메일 제출
function handleEmailSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get('email').trim();

    if (!validateEmail(email)) {
        alert('올바른 이메일 형식을 입력해주세요.');
        return;
    }

    // 가입된 이메일인지 확인
    if (!checkEmailExists(email)) {
        alert('해당 이메일 주소로 가입된 계정이 없습니다.\n회원가입을 진행해주세요.');
        return;
    }

    // 이메일이 존재하는 경우 인증코드 생성
    userEmail = email;
    generatedCode = generateVerificationCode();

    // 실제로는 이메일로 인증코드 전송
    console.log('생성된 인증코드:', generatedCode);

    // 이메일 표시 업데이트
    const emailDisplay = document.getElementById('emailDisplay');
    if (emailDisplay) {
        emailDisplay.textContent = email;
    }

    alert(`인증코드가 ${email}로 전송되었습니다.\n테스트용 코드: ${generatedCode}`);

    // 2단계로 이동
    changeStep(2);
}

// 2단계: 인증코드 확인
function handleCodeSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const code = formData.get('verification-code').trim();

    if (!code) {
        alert('인증코드를 입력해주세요.');
        return;
    }

    if (code !== generatedCode) {
        alert('인증코드가 일치하지 않습니다. 다시 확인해주세요.');
        return;
    }

    alert('인증이 완료되었습니다!');

    // 3단계로 이동
    changeStep(3);
}

// 3단계: 비밀번호 재설정
function handlePasswordReset(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const newPassword = formData.get('new-password');
    const confirmPassword = formData.get('confirm-password');

    if (!validatePassword(newPassword)) {
        alert('비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    // 실제로는 서버에 비밀번호 변경 요청
    console.log('비밀번호 변경:', { email: userEmail, newPassword });

    // localStorage에 저장된 사용자 정보 업데이트 (실제로는 서버에서 처리)
    updateUserPassword(userEmail, newPassword);

    alert('비밀번호가 성공적으로 변경되었습니다!\n로그인 페이지로 이동합니다.');

    // 로그인 페이지로 이동
    window.location.href = '/login.html';
}

// 사용자 비밀번호 업데이트
function updateUserPassword(email, newPassword) {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    // 해당 이메일을 가진 사용자 찾기
    const userIndex = registeredUsers.findIndex(user => user.email === email);

    if (userIndex !== -1) {
        registeredUsers[userIndex].password = newPassword;
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        console.log('비밀번호 업데이트 완료');
        return true;
    }

    return false;
}

// 인증코드 재전송
function resendCode() {
    if (!userEmail) {
        alert('먼저 이메일을 입력해주세요.');
        return;
    }

    generatedCode = generateVerificationCode();
    console.log('새로운 인증코드:', generatedCode);

    alert(`새로운 인증코드가 ${userEmail}로 전송되었습니다.\n테스트용 코드: ${generatedCode}`);
}

// 실시간 비밀번호 확인
document.addEventListener('DOMContentLoaded', function () {
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    function checkPasswords() {
        const newPassword = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('비밀번호가 일치하지 않습니다.');
        } else {
            confirmPasswordInput?.setCustomValidity('');
        }
    }

    if (newPasswordInput && confirmPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswords);
        confirmPasswordInput.addEventListener('input', checkPasswords);
    }
});

// 임시 비밀번호 생성
function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return tempPassword;
}

// 알림 표시 함수
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 알림 요소 생성
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 400px;
        word-wrap: break-word;
        white-space: pre-line;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;

    // 타입별 색상 설정
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // 5초 후 자동 제거
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// 애니메이션 CSS 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 홈으로 가기 함수
function goHome() {
    window.location.href = 'index.html';
}

// DOM 로드 완료 시 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function () {
    console.log('비밀번호 찾기 페이지 로드됨');
}); 
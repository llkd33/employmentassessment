// 뒤로가기 함수
function goBack() {
    window.history.back();
}

// 비밀번호 유효성 검사
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// 이메일 유효성 검사 (엄격한 검증)
function validateEmail(email) {
    // 기본 이메일 형식 체크
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
        return false;
    }

    // 최상위 도메인 추가 검증
    const parts = email.split('@');
    if (parts.length !== 2) {
        return false;
    }

    const domain = parts[1];
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
        return false;
    }

    // 최상위 도메인 검증
    const topLevelDomain = domainParts[domainParts.length - 1].toLowerCase();

    // 3글자 이상의 TLD는 허용
    if (topLevelDomain.length >= 3) {
        return true;
    }

    // 2글자 TLD는 일반적으로 사용되는 것만 허용
    const validTwoLetterTLDs = ['kr', 'jp', 'cn', 'uk', 'de', 'fr', 'it', 'es', 'ru', 'au', 'ca', 'in', 'br', 'mx'];

    if (topLevelDomain.length === 2 && validTwoLetterTLDs.includes(topLevelDomain)) {
        return true;
    }

    // "co" 같은 불완전한 도메인 거부
    return false;
}

// 비밀번호 일치 확인
function checkPasswordMatch(password, confirmPassword) {
    return password === confirmPassword;
}

// 폼 제출 처리
function handleSignupSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const password = formData.get('password');
    const passwordConfirm = formData.get('password-confirm');
    const terms = formData.get('terms');

    // 유효성 검사
    if (!name) {
        alert('이름을 입력해주세요.');
        return;
    }

    if (!validateEmail(email)) {
        alert('올바른 이메일 형식을 입력해주세요.\n예: example@naver.com, user@gmail.com\n\n※ 최상위 도메인(.com, .net 등)을 정확히 입력해주세요.');
        return;
    }

    if (!validatePassword(password)) {
        alert('비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다.');
        return;
    }

    if (!checkPasswordMatch(password, passwordConfirm)) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    if (!terms) {
        alert('이용약관에 동의해주세요.');
        return;
    }

    // 서버 API로 회원가입 처리 - PostgreSQL 데이터베이스 사용
    console.log('서버 API로 회원가입 정보 전송:', { name, email });

    // 버튼 비활성화 및 로딩 표시
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '회원가입 중...';
    submitBtn.disabled = true;

    fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            name: name,
            nickname: name, // 닉네임은 이름과 동일하게 설정
            email: email,
            password: password
        })
    })
        .then(response => {
            console.log('회원가입 API 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 회원가입 성공
                console.log('✅ PostgreSQL 회원가입 성공!', data);

                // JWT 토큰 저장
                localStorage.setItem('authToken', data.token);

                // 사용자 정보 저장
                const userInfo = {
                    id: data.user.id,
                    name: data.user.name,
                    nickname: data.user.nickname,
                    email: data.user.email,
                    loginType: 'email',
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem('userInfo', JSON.stringify(userInfo));

                // 자동 로그인 설정
                localStorage.setItem('rememberLogin', 'true');

                console.log('회원가입 완료:', userInfo);
                alert(`${data.user.name}님, 회원가입이 완료되었습니다! 자동으로 로그인됩니다.`);

                // 메인 페이지로 이동 (자동 로그인)
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // 회원가입 실패
                console.log('❌ 회원가입 실패:', data.message);
                alert(data.message || '회원가입에 실패했습니다.');
            }
        })
        .catch(error => {
            console.error('회원가입 API 오류:', error);

            let errorMessage = '회원가입 처리 중 오류가 발생했습니다.';

            if (error.message.includes('404')) {
                errorMessage = '회원가입 API를 찾을 수 없습니다. 서버 상태를 확인해주세요.';
            } else if (error.message.includes('500')) {
                errorMessage = '서버 내부 오류입니다. 잠시 후 다시 시도해주세요.';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = '네트워크 연결을 확인해주세요.';
            }

            alert(errorMessage);
        })
        .finally(() => {
            // 버튼 상태 복원
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

// 실시간 비밀번호 확인
document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('password-confirm');

    function checkPasswords() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword && !checkPasswordMatch(password, confirmPassword)) {
            confirmPasswordInput.setCustomValidity('비밀번호가 일치하지 않습니다.');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    }

    if (passwordInput && confirmPasswordInput) {
        passwordInput.addEventListener('input', checkPasswords);
        confirmPasswordInput.addEventListener('input', checkPasswords);
    }
}); 
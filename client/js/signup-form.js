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

    // 회원가입 처리 (실제로는 서버에 요청)
    console.log('회원가입 정보:', { name, email, password });

    // 기존 사용자 데이터 가져오기
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    // 이메일 중복 검사
    if (existingUsers.find(user => user.email === email)) {
        alert('이미 가입된 이메일입니다.');
        return;
    }

    // 새 사용자 추가
    const newUser = {
        id: Date.now().toString(),
        name: name,
        email: email,
        password: password, // 실제로는 해시화해서 서버에 저장해야 함
        joinDate: new Date().toISOString(),
        loginType: 'email'
    };

    existingUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

    // 디버깅: 저장된 사용자 확인
    console.log('새로 등록된 사용자:', newUser);
    console.log('전체 사용자 목록:', existingUsers);

    alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');

    // 로그인 페이지로 이동
    window.location.href = 'login.html';
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
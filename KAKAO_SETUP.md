# Kakao JavaScript SDK 설정 가이드

## 1. Kakao JavaScript 키 발급

1. [Kakao Developers](https://developers.kakao.com) 접속
2. 로그인 후 "내 애플리케이션" 클릭
3. 애플리케이션 생성 또는 기존 앱 선택
4. "앱 키" 메뉴에서 **JavaScript 키** 복사

## 2. JavaScript 키 설정

### 방법 1: 직접 설정 (권장)
`client/js/kakao-config.js` 파일을 열고 다음 부분을 수정:

```javascript
// 기존 코드
const KAKAO_JAVASCRIPT_KEY = 'YOUR_JAVASCRIPT_KEY'; // TODO: Replace with actual key

// 실제 키로 변경 (예시)
const KAKAO_JAVASCRIPT_KEY = 'abc123def456...'; // 실제 JavaScript 키 입력
```

### 방법 2: 환경 변수 사용 (서버 사이드)
`.env` 파일에 추가:
```
KAKAO_JAVASCRIPT_KEY=your_actual_javascript_key_here
```

## 3. 플랫폼 등록

Kakao Developers 콘솔에서:

1. "플랫폼" 메뉴 클릭
2. "Web 플랫폼 등록" 클릭
3. 사이트 도메인 추가:
   - 개발: `http://localhost:3000`
   - 운영: `https://your-railway-domain.up.railway.app`

## 4. 카카오 로그인 설정

1. "카카오 로그인" 메뉴 클릭
2. 활성화 설정: ON
3. Redirect URI 등록:
   - `http://localhost:3000/auth/kakao/callback`
   - `https://your-railway-domain.up.railway.app/auth/kakao/callback`

## 5. 동의 항목 설정

1. "동의항목" 메뉴 클릭
2. 필요한 정보 설정:
   - 닉네임: 필수 동의
   - 이메일: 선택 동의
   - 프로필 사진: 선택 동의

## 6. 초기화 확인

브라우저 개발자 콘솔(F12)에서 확인:

```javascript
// 초기화 상태 확인
Kakao.isInitialized()  // true가 반환되면 성공

// 수동 초기화 테스트
kakaoAuth.initialize()  // ✅ Kakao SDK 초기화 성공 메시지 확인
```

## 7. 기능 테스트

### 로그인 테스트
```javascript
// 콘솔에서 직접 테스트
kakaoAuth.login()
```

### 로그아웃 테스트
```javascript
kakaoAuth.logout()
```

## 주의사항

- JavaScript 키는 클라이언트에 노출되므로 **도메인 제한**을 반드시 설정
- REST API 키와 JavaScript 키를 혼동하지 말 것
- 프로덕션 환경에서는 HTTPS 필수

## 문제 해결

### "Kakao SDK not loaded" 오류
- 인터넷 연결 확인
- Content Security Policy 설정 확인

### "Kakao SDK 초기화 실패" 오류
- JavaScript 키가 올바른지 확인
- 도메인이 등록되어 있는지 확인

### CORS 오류
- Kakao Developers 콘솔에서 도메인 등록 확인
- 프로토콜(http/https) 일치 확인
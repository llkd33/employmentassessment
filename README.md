# 신입사원 역량테스트 시스템

신입사원을 위한 종합 역량평가 웹 애플리케이션입니다.

## 🚀 **빠른 시작 (퍼블리셔용)**

### 📋 **필수 요구사항**
- **Node.js 20.0.0 이상** ([다운로드](https://nodejs.org/))
- **웹브라우저** (Chrome, Firefox, Safari, Edge)

### ⚡ **3단계로 바로 실행**

```bash
# 1. 의존성 설치
npm install

# 2. 카카오 API 키 설정 (필수!)
# client/js/utils/common.js 파일에서 카카오 키 교체 필요

# 3. 서버 실행
npm start
```

### 🌐 **접속 주소**
```
http://localhost:3000
```

## 🔑 **중요: 카카오 API 키 설정**

카카오 로그인 기능을 사용하려면 **반드시** API 키 설정이 필요합니다:

### 📄 `client/js/utils/common.js` 파일 수정
```javascript
KAKAO_API_KEY: window.location.hostname === 'localhost'
    ? 'your_development_kakao_key_here'     // 개발용 키
    : 'your_production_kakao_key_here'      // 프로덕션용 키
```

> 📖 **상세한 카카오 API 키 발급 방법은 [CLIENT_INSTALLATION_GUIDE.md](./CLIENT_INSTALLATION_GUIDE.md) 참조**

## 🏗️ **프로젝트 구조**

```
📦 outsourcingTEST/
├── 📁 server/               # Node.js 서버 코드
│   ├── server.js           # 메인 서버 파일
│   └── api.js              # API 엔드포인트
├── 📁 client/              # 프론트엔드 파일
│   ├── index.html          # 메인 페이지
│   ├── login.html          # 로그인 페이지
│   ├── signup.html         # 회원가입 페이지
│   ├── test.html           # 역량테스트 페이지
│   ├── result.html         # 결과 페이지
│   ├── mypage.html         # 마이페이지
│   ├── 📁 css/             # 스타일시트
│   └── 📁 js/              # JavaScript 파일
├── 📁 database/            # 데이터베이스 설정
├── package.json            # 프로젝트 설정
└── README.md              # 이 파일
```

## ✨ **주요 기능**

- 🔐 **사용자 인증**: 이메일 회원가입, 카카오 로그인
- 📊 **역량테스트**: 5개 영역별 15문항씩 총 75문항
- 📈 **결과분석**: 영역별 점수, 종합점수, 인재유형 분석
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- 💾 **데이터 저장**: PostgreSQL 데이터베이스
- 🔄 **실시간 동기화**: 다기기 간 결과 동기화

## 🛠️ **기술 스택**

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: JWT, 카카오 OAuth 2.0
- **Deployment**: Railway (클라우드 배포)

## 📋 **테스트 계정**

개발/테스트용 계정:
```
이메일: test@test.com
비밀번호: test123
```

## 🚨 **문제 해결**

### 서버가 시작되지 않는 경우
```bash
# 포트 충돌 해결
npx kill-port 3000
npm start
```

### 카카오 로그인 오류
- API 키가 올바르게 설정되었는지 확인
- 카카오 개발자 콘솔에서 도메인 등록 확인

### 브라우저 접속 안됨
- 브라우저 캐시 삭제 (Ctrl+F5)
- 방화벽 설정 확인

## 📚 **상세 가이드**

- 🔧 **설치 및 설정**: [CLIENT_INSTALLATION_GUIDE.md](./CLIENT_INSTALLATION_GUIDE.md)
- 🌐 **AWS 배포**: CLIENT_INSTALLATION_GUIDE.md 의 AWS 섹션 참조
- 🔐 **보안 설정**: 프로덕션 환경 보안 가이드 포함

## 📞 **지원**

문제 발생 시:
1. [CLIENT_INSTALLATION_GUIDE.md](./CLIENT_INSTALLATION_GUIDE.md) 문제해결 섹션 확인
2. 개발자 콘솔에서 오류 메시지 확인
3. 카카오 API 키 설정 재확인

---

> ⚠️ **주의**: 이 프로젝트는 **Node.js 서버가 필요한 동적 웹사이트**입니다. 
> 단순히 HTML 파일만 브라우저에서 열어서는 작동하지 않습니다. 
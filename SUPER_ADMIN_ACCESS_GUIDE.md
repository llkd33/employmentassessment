# 🔑 Super Admin 접근 가이드

## Super Admin 계정이 있습니다!

### 📌 현재 Super Admin 계정:
1. **Email**: `super@admin.com`
   - Name: 슈퍼관리자
   - Role: super_admin

2. **Email**: `admin@example.com`
   - Name: 회사관리자  
   - Role: super_admin

## 🚀 접속 방법:

### 방법 1: 일반 로그인 후 대시보드 접속
1. `http://localhost:3000/login.html` 또는 `http://localhost:3000/admin-login.html` 접속
2. Super Admin 계정으로 로그인:
   - Email: `super@admin.com` 또는 `admin@example.com`
   - Password: (설정된 비밀번호 사용)
3. 로그인 후 직접 URL 입력:
   - **기본 버전**: `http://localhost:3000/super-admin-dashboard.html`
   - **고급 버전 (추천)**: `http://localhost:3000/super-admin-dashboard-v2.html`

### 방법 2: 직접 URL 접속
브라우저에서 직접 다음 URL로 접속:
- **Super Admin Dashboard v2.0** (최신 버전):
  ```
  http://localhost:3000/super-admin-dashboard-v2.html
  ```
- **Super Admin Dashboard** (기본 버전):
  ```
  http://localhost:3000/super-admin-dashboard.html
  ```

## 📋 Super Admin 기능:

### 기업 관리
- ✅ **새 기업 추가**
- ✅ **기업 정보 수정**
- ✅ **기업 활성화/비활성화**
- ✅ **기업별 관리자 지정**

### 사용자 관리
- ✅ **모든 사용자 조회**
- ✅ **사용자 역할 변경**
- ✅ **사용자 계정 잠금/해제**
- ✅ **대량 사용자 초대**

### 테스트 관리
- ✅ **모든 테스트 결과 조회**
- ✅ **테스트 문제 관리**
- ✅ **점수 기준 설정**

### 분석 및 통계
- ✅ **전체 시스템 통계**
- ✅ **기업별 성과 비교**
- ✅ **사용자 활동 분석**
- ✅ **테스트 결과 트렌드**

## 🛠️ 문제 해결:

### "권한이 없습니다" 오류가 나올 때:
1. 로그인한 계정의 role이 'super_admin'인지 확인
2. 토큰이 만료되었을 수 있으니 다시 로그인

### 대시보드가 비어있을 때:
1. 브라우저 콘솔에서 에러 확인
2. API 엔드포인트가 제대로 연결되었는지 확인

## 🎯 추천 버전:
**`super-admin-dashboard-v2.html`** 사용을 추천합니다!
- 더 많은 기능
- 향상된 UI/UX
- 실시간 통계
- 고급 분석 도구

## 📝 비밀번호를 모르시나요?
비밀번호 재설정이 필요하시면:
```bash
node database/reset-super-admin-password.js
```

---
문제가 계속되면 시스템 관리자에게 문의하세요.
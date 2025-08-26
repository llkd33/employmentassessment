# 🎯 통합 관리자 대시보드 가이드

## 개요
모든 관리자가 하나의 통합된 대시보드에서 권한에 따라 필요한 기능만 볼 수 있도록 개선했습니다.

## 🚀 접속 방법

### 1. 로그인
- URL: `http://localhost:3000/admin-login.html`
- 로그인 후 자동으로 통합 대시보드로 이동

### 2. 통합 대시보드
- URL: `http://localhost:3000/unified-admin-dashboard.html`
- 로그인한 계정의 권한에 따라 메뉴가 자동으로 표시됨

## 👥 권한별 기능

### 🔴 Super Admin (최고 관리자)
**계정**: `super@admin.com` / `SuperAdmin123!`

모든 기능 사용 가능:
- ✅ **시스템 관리**
  - 기업 추가/수정/삭제
  - 전체 사용자 관리
  - 시스템 통계 확인
  - 시스템 설정
- ✅ **직원 관리**
  - 모든 기업의 직원 조회
  - 테스트 결과 확인
  - 피드백 관리
- ✅ **분석**
  - 전체 시스템 분석
  - 기업별 비교 분석

### 🟡 Company Admin (기업 관리자)
자기 회사 관련 기능만 사용 가능:
- ✅ **직원 관리**
  - 직원 목록 조회
  - 직원 초대
  - 테스트 결과 확인
  - 피드백 작성/관리
- ✅ **분석**
  - 회사 내 분석 리포트
  - 트렌드 분석
- ✅ **설정**
  - 회사 설정 관리

### 🟢 HR Manager (HR 매니저)
제한된 관리 기능:
- ✅ **직원 조회**
  - 직원 목록 확인
  - 테스트 결과 조회
- ✅ **분석**
  - 기본 리포트 조회

## 📋 주요 개선사항

### Before (이전)
```
❌ 여러 개의 분산된 admin 페이지
- admin-dashboard.html
- super-admin-dashboard.html
- super-admin-dashboard-v2.html
- sys-admin-dashboard.html
- 각 페이지마다 다른 로그인
- 권한에 따라 다른 URL 접속 필요
```

### After (현재)
```
✅ 하나의 통합 대시보드
- unified-admin-dashboard.html
- 한 번의 로그인으로 모든 기능 접근
- 권한에 따라 자동으로 메뉴 표시/숨김
- 일관된 UI/UX
```

## 🎨 UI 특징

### 사이드바 네비게이션
- 권한별로 자동으로 메뉴 표시
- 직관적인 아이콘과 그룹핑
- 모바일 반응형 지원

### 대시보드 위젯
- 실시간 통계 카드
- 최근 활동 테이블
- 빠른 작업 버튼

### 권한 표시
- 사용자 역할이 상단에 명확히 표시
- 한글로 표시 (최고 관리자, 기업 관리자 등)

## 🔧 기술적 구현

### 프론트엔드
```javascript
// 권한별 메뉴 자동 표시
function showMenusByRole(role) {
    switch(role) {
        case 'super_admin':
            // 모든 메뉴 표시
            break;
        case 'company_admin':
            // 회사 관련 메뉴만 표시
            break;
        case 'hr_manager':
            // 제한된 메뉴만 표시
            break;
    }
}
```

### 백엔드
```javascript
// 통합 API 엔드포인트
/api/admin/profile     // 프로필 정보
/api/admin/system-stats // 시스템 통계 (Super Admin)
/api/admin/company-stats // 회사 통계 (Company Admin)
/api/admin/employees    // 직원 목록
/api/admin/test-results // 테스트 결과
```

## 🚨 문제 해결

### "권한이 없습니다" 오류
1. 로그인 계정의 role 확인
2. 토큰 만료 확인 → 재로그인

### 메뉴가 보이지 않을 때
1. 계정 권한 확인
2. 브라우저 캐시 삭제
3. 콘솔에서 에러 확인

## 📝 다음 단계

### 추가 가능한 기능
- 대시보드 커스터마이징
- 위젯 드래그 앤 드롭
- 실시간 알림
- 다크 모드
- 다국어 지원

### 마이그레이션
기존 페이지들은 유지하되, 모든 로그인이 통합 대시보드로 리다이렉트되도록 설정했습니다.

---

이제 하나의 로그인, 하나의 대시보드로 모든 관리 기능을 사용할 수 있습니다! 🎉
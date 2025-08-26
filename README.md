# 신입사원 역량테스트 시작화면

신입사원을 위한 역량테스트 웹 애플리케이션의 시작화면입니다.

## 기능

- 회사 로고 (상단 왼쪽)
- 로그인/회원가입 버튼 (상단 오른쪽)
- 역량테스트 소개 이미지 (중앙)
- 바로가기 버튼 (하단)

## 파일 구조

```
├── index.html      # 메인 HTML 파일
├── styles.css      # CSS 스타일시트
├── script.js       # JavaScript 인터랙션
└── README.md       # 프로젝트 설명서
```

## 사용 방법

1. 웹 브라우저에서 `index.html` 파일을 열어주세요.
2. 화면이 로드되면 애니메이션과 함께 메인 페이지가 표시됩니다.
3. "바로가기" 버튼을 클릭하여 테스트를 시작할 수 있습니다.

## 필요한 이미지 파일

- `logo.png`: 회사 로고 이미지
- `test-image.png`: 역량테스트 소개 이미지

이미지가 없어도 대체 컨텐츠가 표시되도록 구현되어 있습니다.

## 기술 스택

- HTML5
- CSS3
- JavaScript (ES6+)

## 특징

- 반응형 디자인 (모바일, 태블릿, 데스크톱 지원)
- 부드러운 애니메이션 효과
- 이미지 로드 실패 시 대체 컨텐츠 표시
- 알림 메시지 기능 

## 관리자 대시보드 / 계정 분리(고급 기능)

본 레포는 관리자 시스템을 포함합니다. 두 종류의 관리자 계정이 분리되어 있습니다.

- 기업 관리자(Users 테이블): `client/admin-login.html` → `client/admin-dashboard-new.html`
- 시스템 어드민(Admin 테이블): `client/sys-admin-login.html` → `client/super-admin-dashboard-v2.html`

시스템 어드민은 기업 생성/수정/소프트삭제, 기업관리자 승인/직권생성 등 플랫폼 전역 기능을 `/api/sys-admin/*` 경로로 제공합니다.

자세한 내용은 `ADMIN_SYS_ADMIN_GUIDE.md`를 참고하세요.

### 데이터베이스 마이그레이션

- 초기 스키마: `database/init-schema.js`
- 제약조건/옵션 업데이트: `database/migrate-schema.js`
- 관리자 기능 스키마: `database/migrate-admin-feature.js`
- 기업 소프트삭제 스키마: `database/migrate-company-soft-delete.js`

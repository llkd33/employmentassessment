# 시스템 어드민 분리 가이드

본 문서는 플랫폼 시스템 어드민(슈퍼어드민)과 기업 어드민을 계정/토큰/엔드포인트 레벨에서 분리한 구조와 사용 방법을 설명합니다.

## 개요
- 시스템 어드민: 별도 `admin` 테이블 계정과 JWT(페이로드 `isAdmin: true`) 사용, 엔드포인트 `/api/sys-admin/*`.
- 기업 어드민/일반 사용자: `users` 테이블 계정과 JWT 사용, 엔드포인트 `/api/admin/*` 및 일반 사용자 API.
- 테스트 계정 유지: `admin` 테이블의 `testadmin`, `users` 테이블의 `test_admin` 유지.
- 기업 삭제 정책: 소프트 삭제(`companies.status='deleted'`, `deleted_at` 기록).

## 로그인
- 시스템 어드민 로그인 페이지: `/client/sys-admin-login.html`
  - 기본 계정: `superadmin / SuperAdmin@2024!` (초기 스크립트 시드)
  - 로그인 성공 시 `localStorage.sysAdminToken` 저장 → `client/super-admin-dashboard-v2.html` 이동

## 엔드포인트(시스템 어드민)
- 인증: `Authorization: Bearer <sysAdminToken>`

- Companies
  - GET `/api/sys-admin/companies` 목록 (유저/관리자 집계 포함)
  - POST `/api/sys-admin/companies` 추가 `{ name, code, domain? }`
  - PATCH `/api/sys-admin/companies/:id` 수정 `{ name?, domain?, status? }`
  - DELETE `/api/sys-admin/companies/:id` 소프트 삭제

- Company Admins
  - GET `/api/sys-admin/company-admins/pending` 승인 대기 목록
  - POST `/api/sys-admin/company-admins/:userId/approve` 승인
  - POST `/api/sys-admin/company-admins` 직권 생성 `{ email, name, companyId, password? }` (미입력 시 임시 PW 발급)

- Dashboard
  - GET `/api/sys-admin/stats` 통계(총 기업/유저/테스트/평균점수/대기 승인 수)
  - GET `/api/sys-admin/activities?limit=20` 활동 로그 축약
  - GET `/api/sys-admin/metrics` 간단 메트릭(최근 7일 테스트 수)

## 마이그레이션
- 파일: `database/migrate-company-soft-delete.js`
  - `companies.status('active'|'inactive'|'deleted')`, `deleted_at TIMESTAMP`
- 서버 부팅 시 자동 실행(존재 시 스킵)

## 감사 로깅
- 고위험/관리 엔드포인트 호출 시 `admin_logs`에 기록(
  `admin_id/admin_username/admin_role/action/description/details/ip/user-agent`)

## 대시보드 연동
- `client/super-admin-dashboard-v2.html`
  - 기업 관리: 시스템 어드민 API 사용
  - 통계/활동/메트릭: 시스템 어드민 API 사용
  - 승인 대기 관리자 테이블 + Approve 버튼 제공

## 수동 점검(샘플 curl)
```
# 1) 로그인
curl -sX POST http://localhost:3000/api/sys-admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","password":"SuperAdmin@2024!"}'

# 2) 기업 추가
curl -sX POST http://localhost:3000/api/sys-admin/companies \
  -H "Authorization: Bearer $SYS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Demo Corp","code":"DEMO2025","domain":"@demo.com"}'

# 3) 승인 대기 관리자 목록
curl -s http://localhost:3000/api/sys-admin/company-admins/pending \
  -H "Authorization: Bearer $SYS_TOKEN"

# 4) 승인
curl -sX POST http://localhost:3000/api/sys-admin/company-admins/<userId>/approve \
  -H "Authorization: Bearer $SYS_TOKEN"
```

## 주의 사항
- 운영 환경에서는 시스템 어드민 토큰과 기업 어드민 토큰을 혼용하지 않습니다.
- 기업 삭제는 소프트 삭제만 허용됩니다. 복구/완전삭제 정책은 별도 합의 필요.


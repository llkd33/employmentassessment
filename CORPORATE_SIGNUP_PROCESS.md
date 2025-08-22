# 기업 가입 프로세스 설계

## 1. 개요
기업이 시스템을 사용하기 위한 가입부터 근로자 관리까지의 전체 프로세스

## 2. 역할 정의

### 2.1 Super Admin (최고 관리자)
- 기업 가입 승인/거절 권한
- 기업 코드 발급 및 관리
- 모든 기업 및 사용자 관리
- 시스템 전체 설정 관리

### 2.2 Company Admin (기업 관리자)
- 해당 기업의 근로자 관리
- 기업 코드 확인 및 배포
- 근로자 테스트 결과 조회
- 근로자 계정 승인/관리

### 2.3 HR Manager (인사 담당자)
- Company Admin과 유사한 권한
- 근로자 테스트 결과 조회
- 근로자 정보 관리

### 2.4 Employee (근로자)
- 기업 코드를 통한 가입
- 역량 테스트 수행
- 본인 결과 조회

## 3. 기업 가입 프로세스

### 3.1 기업 가입 신청
```
1. 기업 담당자가 기업 가입 페이지 접속
2. 기업 정보 입력:
   - 기업명
   - 사업자등록번호
   - 대표자명
   - 업종
   - 주소
   - 담당자 정보 (이름, 이메일, 연락처)
3. 기업 관리자 계정 정보 입력:
   - 이름
   - 이메일
   - 비밀번호
   - 연락처
4. 이용약관 동의
5. 가입 신청 제출
```

### 3.2 Super Admin 승인 프로세스
```
1. Super Admin 대시보드에서 가입 신청 확인
2. 기업 정보 검증:
   - 사업자등록번호 확인
   - 중복 가입 확인
3. 승인 또는 거절 결정
4. 승인 시:
   - 고유 기업 코드 자동 생성 (예: COMPANY_2024_XXXX)
   - 기업 관리자 계정 활성화
   - 승인 이메일 발송 (기업 코드 포함)
5. 거절 시:
   - 거절 사유와 함께 이메일 발송
```

### 3.3 기업 코드 구조
```
구조: [기업약칭]_[연도]_[일련번호]
예시: SAMSUNG_2024_0001

특징:
- 유일성 보장
- 연도별 관리
- 쉬운 식별
```

## 4. 근로자 가입 프로세스

### 4.1 일반 가입 (기업 코드 사용)
```
1. 근로자가 회원가입 페이지 접속
2. 가입 유형 선택: "기업 소속 직원"
3. 기업 코드 입력
4. 기업 코드 검증:
   - 유효한 코드인지 확인
   - 해당 기업 정보 표시
5. 개인 정보 입력:
   - 이름
   - 이메일 (기업 도메인 확인)
   - 비밀번호
   - 부서/직급 (선택)
6. 가입 완료
7. 기업 관리자에게 알림 발송
```

### 4.2 배치 등록 (기업 관리자가 등록)
```
1. 기업 관리자가 CSV/Excel 파일 업로드
2. 파일 형식:
   - 이름, 이메일, 부서, 직급
3. 시스템이 자동으로:
   - 임시 비밀번호 생성
   - 계정 생성
   - 이메일 발송 (로그인 정보 포함)
4. 근로자는 첫 로그인 시 비밀번호 변경
```

## 5. 기업 관리자 대시보드 기능

### 5.1 근로자 관리
```
- 근로자 목록 조회
- 근로자 상세 정보 확인
- 근로자 계정 활성화/비활성화
- 근로자 삭제
- 배치 등록
```

### 5.2 테스트 결과 관리
```
- 전체 근로자 테스트 결과 조회
- 개별 근로자 테스트 이력 확인
- 통계 및 분석 리포트
- Excel 다운로드
```

### 5.3 기업 코드 관리
```
- 기업 코드 확인
- 기업 코드 재발급 요청 (Super Admin 승인 필요)
- 기업 코드 사용 현황
```

## 6. 데이터베이스 스키마 변경사항

### 6.1 기존 테이블 수정
```sql
-- users 테이블
ALTER TABLE users ADD COLUMN department VARCHAR(100);
ALTER TABLE users ADD COLUMN position VARCHAR(100);
ALTER TABLE users ADD COLUMN employee_number VARCHAR(50);
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- role 값 추가
ALTER TABLE users 
MODIFY COLUMN role VARCHAR(20) 
CHECK (role IN ('super_admin', 'company_admin', 'hr_manager', 'employee'));
```

### 6.2 신규 테이블
```sql
-- 기업 가입 신청 테이블
CREATE TABLE corporate_registrations (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    business_number VARCHAR(50) UNIQUE NOT NULL,
    ceo_name VARCHAR(100),
    industry VARCHAR(100),
    address TEXT,
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기업 코드 테이블
CREATE TABLE corporate_codes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    issued_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0
);

-- 기업-사용자 연결 로그
CREATE TABLE company_user_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id VARCHAR(50) REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL, -- 'joined', 'left', 'deactivated', 'reactivated'
    performed_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 7. API 엔드포인트

### 7.1 기업 가입 관련
```
POST /api/corporate/register - 기업 가입 신청
GET /api/admin/corporate/registrations - 가입 신청 목록 (Super Admin)
PUT /api/admin/corporate/registrations/:id/approve - 가입 승인
PUT /api/admin/corporate/registrations/:id/reject - 가입 거절
```

### 7.2 기업 코드 관련
```
POST /api/admin/corporate/codes/generate - 코드 생성 (Super Admin)
GET /api/corporate/codes/validate/:code - 코드 유효성 확인
GET /api/corporate/codes/:company_id - 기업별 코드 조회
PUT /api/corporate/codes/:id/deactivate - 코드 비활성화
```

### 7.3 근로자 관리
```
POST /api/auth/signup/corporate - 기업 코드로 가입
POST /api/corporate/employees/batch - 배치 등록
GET /api/corporate/employees - 근로자 목록
GET /api/corporate/employees/:id - 근로자 상세
PUT /api/corporate/employees/:id - 근로자 정보 수정
DELETE /api/corporate/employees/:id - 근로자 삭제
PUT /api/corporate/employees/:id/activate - 계정 활성화
PUT /api/corporate/employees/:id/deactivate - 계정 비활성화
```

### 7.4 대시보드 관련
```
GET /api/corporate/dashboard/stats - 기업 통계
GET /api/corporate/dashboard/test-results - 테스트 결과 조회
GET /api/corporate/dashboard/export - 데이터 내보내기
```

## 8. 보안 고려사항

### 8.1 권한 검증
- 모든 API 호출 시 사용자 role 확인
- 기업 관리자는 자신의 기업 데이터만 접근 가능
- JWT 토큰에 role과 company_id 포함

### 8.2 데이터 보호
- 개인정보 암호화
- 기업 코드 유효기간 설정 가능
- 실패한 로그인 시도 제한

### 8.3 감사 로그
- 모든 관리자 활동 로깅
- 근로자 계정 변경 이력 추적
- 데이터 다운로드 기록

## 9. 구현 우선순위

### Phase 1 (필수)
1. 데이터베이스 스키마 업데이트
2. 기업 가입 신청 및 승인 프로세스
3. 기업 코드 생성 및 관리
4. 근로자 기업 코드 가입

### Phase 2 (중요)
1. 기업 관리자 대시보드
2. 근로자 관리 기능
3. 테스트 결과 조회

### Phase 3 (선택)
1. 배치 등록 기능
2. 데이터 내보내기
3. 고급 통계 및 분석

## 10. 테스트 시나리오

### 10.1 기업 가입 플로우
1. 기업 가입 신청
2. Super Admin 승인
3. 기업 코드 발급 확인
4. 기업 관리자 로그인

### 10.2 근로자 가입 플로우
1. 기업 코드 입력
2. 회원가입 완료
3. 기업 관리자 대시보드에서 확인
4. 테스트 수행 및 결과 확인

### 10.3 권한 테스트
1. 각 role별 접근 가능 기능 확인
2. 타 기업 데이터 접근 차단 확인
3. 비활성화된 계정 접근 차단 확인
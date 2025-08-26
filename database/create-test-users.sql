-- 테스트용 일반 사용자 생성
-- 회사 ID 확인 및 생성
DO $$
DECLARE
    v_company_id INTEGER;
BEGIN
    -- 기존 회사 확인 또는 새로 생성
    SELECT id INTO v_company_id FROM companies WHERE name = 'Sample Company' LIMIT 1;
    
    IF v_company_id IS NULL THEN
        INSERT INTO companies (name, domain, code, is_active, status)
        VALUES ('Sample Company', 'sample.com', 'SAMPLE001', true, 'active')
        RETURNING id INTO v_company_id;
    END IF;

    -- 테스트 사용자 생성 (비밀번호: test123 - bcrypt 해시)
    INSERT INTO users (user_id, name, email, password, role, company_id, department, position, login_type, is_approved)
    VALUES 
        ('user_test_1', '김테스트', 'test1@sample.com', '$2a$10$YourHashedPasswordHere', 'user', v_company_id, '개발팀', '주니어 개발자', 'email', true),
        ('user_test_2', '이테스트', 'test2@sample.com', '$2a$10$YourHashedPasswordHere', 'user', v_company_id, '마케팅팀', '매니저', 'email', true),
        ('user_test_3', '박테스트', 'test3@sample.com', '$2a$10$YourHashedPasswordHere', 'user', v_company_id, '영업팀', '팀장', 'email', true)
    ON CONFLICT (email) DO NOTHING;

    RAISE NOTICE '테스트 사용자가 생성되었습니다.';
END $$;
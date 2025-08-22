const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../../database/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { apiResponse, apiError } = require('../utils/apiResponse');

// 기업 가입 신청
router.post('/register', async (req, res) => {
    try {
        const {
            company_name,
            business_number,
            ceo_name,
            industry,
            address,
            contact_name,
            contact_email,
            contact_phone,
            admin_name,
            admin_email,
            admin_password
        } = req.body;

        // 필수 필드 검증
        if (!company_name || !business_number || !contact_name || !contact_email || 
            !admin_name || !admin_email || !admin_password) {
            return apiError(res, '필수 정보를 모두 입력해주세요.', 400);
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact_email) || !emailRegex.test(admin_email)) {
            return apiError(res, '올바른 이메일 형식이 아닙니다.', 400);
        }

        // 비밀번호 강도 검증 (최소 8자, 대소문자, 숫자, 특수문자 포함)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(admin_password)) {
            return apiError(res, '비밀번호는 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다.', 400);
        }

        // 중복 체크 - 사업자등록번호
        const existingCompany = await db.getCorporateRegistrations();
        const duplicateBusinessNumber = existingCompany.find(reg => 
            reg.business_number === business_number && reg.status !== 'rejected'
        );
        
        if (duplicateBusinessNumber) {
            return apiError(res, '이미 가입 신청된 사업자등록번호입니다.', 409);
        }

        // 중복 체크 - 관리자 이메일
        const existingUser = await db.getUserByEmail(admin_email);
        if (existingUser) {
            return apiError(res, '이미 사용 중인 이메일입니다.', 409);
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(admin_password, 10);

        // 가입 신청 생성
        const registration = await db.createCorporateRegistration({
            company_name,
            business_number,
            ceo_name,
            industry,
            address,
            contact_name,
            contact_email,
            contact_phone,
            admin_name,
            admin_email,
            admin_password: hashedPassword
        });

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: 'system',
            action: 'corporate_registration',
            target_type: 'registration',
            target_id: registration.id,
            details: { company_name, business_number },
            ip_address: req.ip
        });

        return apiResponse(res, {
            message: '기업 가입 신청이 완료되었습니다. 승인 대기 중입니다.',
            registrationId: registration.id
        }, 201);

    } catch (error) {
        console.error('기업 가입 신청 오류:', error);
        return apiError(res, '가입 신청 처리 중 오류가 발생했습니다.', 500);
    }
});

// 가입 신청 목록 조회 (Super Admin만)
router.get('/registrations', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    try {
        const { status } = req.query;
        const registrations = await db.getCorporateRegistrations(status);
        
        // 비밀번호 필드 제거
        const sanitizedRegistrations = registrations.map(reg => {
            const { admin_password, ...rest } = reg;
            return rest;
        });

        return apiResponse(res, sanitizedRegistrations);
    } catch (error) {
        console.error('가입 신청 목록 조회 오류:', error);
        return apiError(res, '목록 조회 중 오류가 발생했습니다.', 500);
    }
});

// 가입 신청 상세 조회 (Super Admin만)
router.get('/registrations/:id', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const registration = await db.getCorporateRegistrationById(id);
        
        if (!registration) {
            return apiError(res, '가입 신청을 찾을 수 없습니다.', 404);
        }

        // 비밀번호 필드 제거
        const { admin_password, ...sanitizedRegistration } = registration;

        return apiResponse(res, sanitizedRegistration);
    } catch (error) {
        console.error('가입 신청 상세 조회 오류:', error);
        return apiError(res, '상세 조회 중 오류가 발생했습니다.', 500);
    }
});

// 가입 신청 승인 (Super Admin만)
router.put('/registrations/:id/approve', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // 가입 신청 조회
        const registration = await db.getCorporateRegistrationById(id);
        if (!registration) {
            return apiError(res, '가입 신청을 찾을 수 없습니다.', 404);
        }

        if (registration.status !== 'pending') {
            return apiError(res, '이미 처리된 신청입니다.', 400);
        }

        // 기업 코드 생성
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const corporate_code = `${registration.company_name.substring(0, 3).toUpperCase()}_${year}_${random}`;

        // 승인 처리
        const result = await db.approveCorporateRegistration(id, adminId, corporate_code);

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'approve_registration',
            target_type: 'registration',
            target_id: id,
            details: { 
                company_name: registration.company_name,
                corporate_code 
            },
            ip_address: req.ip
        });

        // TODO: 승인 이메일 발송
        // sendApprovalEmail(registration.contact_email, registration.admin_email, corporate_code);

        return apiResponse(res, {
            message: '기업 가입이 승인되었습니다.',
            company: result.company,
            corporate_code
        });

    } catch (error) {
        console.error('가입 승인 오류:', error);
        return apiError(res, '승인 처리 중 오류가 발생했습니다.', 500);
    }
});

// 가입 신청 거절 (Super Admin만)
router.put('/registrations/:id/reject', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;
        const adminId = req.user.id;

        if (!rejection_reason) {
            return apiError(res, '거절 사유를 입력해주세요.', 400);
        }

        // 가입 신청 조회
        const registration = await db.getCorporateRegistrationById(id);
        if (!registration) {
            return apiError(res, '가입 신청을 찾을 수 없습니다.', 404);
        }

        if (registration.status !== 'pending') {
            return apiError(res, '이미 처리된 신청입니다.', 400);
        }

        // 거절 처리
        const result = await db.rejectCorporateRegistration(id, adminId, rejection_reason);

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'reject_registration',
            target_type: 'registration',
            target_id: id,
            details: { 
                company_name: registration.company_name,
                rejection_reason 
            },
            ip_address: req.ip
        });

        // TODO: 거절 이메일 발송
        // sendRejectionEmail(registration.contact_email, rejection_reason);

        return apiResponse(res, {
            message: '기업 가입이 거절되었습니다.',
            result
        });

    } catch (error) {
        console.error('가입 거절 오류:', error);
        return apiError(res, '거절 처리 중 오류가 발생했습니다.', 500);
    }
});

// 기업 코드 검증
router.get('/codes/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        const codeInfo = await db.validateCorporateCode(code);
        
        if (!codeInfo) {
            return apiError(res, '유효하지 않은 기업 코드입니다.', 404);
        }

        return apiResponse(res, {
            valid: true,
            company_name: codeInfo.company_name,
            company_id: codeInfo.company_id
        });

    } catch (error) {
        console.error('기업 코드 검증 오류:', error);
        return apiError(res, '코드 검증 중 오류가 발생했습니다.', 500);
    }
});

// 기업 코드 생성 (Super Admin 또는 Company Admin)
router.post('/codes/generate', authenticateToken, authorizeRole(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { company_id, expires_at, max_usage, description } = req.body;
        const adminId = req.user.id;
        const userRole = req.user.role;

        // Company Admin은 자신의 회사 코드만 생성 가능
        if (userRole === 'company_admin' && req.user.company_id !== company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        if (!company_id) {
            return apiError(res, '회사 ID를 입력해주세요.', 400);
        }

        const code = await db.generateCorporateCode(company_id, adminId, {
            expires_at,
            max_usage,
            description
        });

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'generate_corporate_code',
            target_type: 'corporate_code',
            target_id: code.id,
            details: { 
                company_id,
                code: code.code,
                max_usage,
                expires_at
            },
            ip_address: req.ip
        });

        return apiResponse(res, {
            message: '기업 코드가 생성되었습니다.',
            code
        }, 201);

    } catch (error) {
        console.error('기업 코드 생성 오류:', error);
        return apiError(res, '코드 생성 중 오류가 발생했습니다.', 500);
    }
});

// 기업별 코드 목록 조회
router.get('/codes/company/:company_id', authenticateToken, authorizeRole(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { company_id } = req.params;
        const userRole = req.user.role;

        // Company Admin은 자신의 회사 코드만 조회 가능
        if (userRole === 'company_admin' && req.user.company_id !== parseInt(company_id)) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        const codes = await db.getCorporateCodesByCompany(company_id);

        return apiResponse(res, codes);

    } catch (error) {
        console.error('기업 코드 목록 조회 오류:', error);
        return apiError(res, '코드 목록 조회 중 오류가 발생했습니다.', 500);
    }
});

// 기업 코드 비활성화
router.put('/codes/:id/deactivate', authenticateToken, authorizeRole(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const userRole = req.user.role;

        // 코드 정보 조회
        const codes = await db.getCorporateCodesByCompany(req.user.company_id);
        const code = codes.find(c => c.id === parseInt(id));

        if (!code) {
            return apiError(res, '코드를 찾을 수 없습니다.', 404);
        }

        // Company Admin은 자신의 회사 코드만 비활성화 가능
        if (userRole === 'company_admin' && code.company_id !== req.user.company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        const result = await db.deactivateCorporateCode(id);

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'deactivate_corporate_code',
            target_type: 'corporate_code',
            target_id: id,
            details: { code: result.code },
            ip_address: req.ip
        });

        return apiResponse(res, {
            message: '기업 코드가 비활성화되었습니다.',
            result
        });

    } catch (error) {
        console.error('기업 코드 비활성화 오류:', error);
        return apiError(res, '코드 비활성화 중 오류가 발생했습니다.', 500);
    }
});

module.exports = router;
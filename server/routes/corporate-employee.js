const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../../database/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { apiResponse, apiError } = require('../utils/apiResponse');

// 기업 코드로 직원 가입
router.post('/signup', async (req, res) => {
    try {
        const {
            corporate_code,
            name,
            email,
            password,
            department,
            position,
            employee_number
        } = req.body;

        // 필수 필드 검증
        if (!corporate_code || !name || !email || !password) {
            return apiError(res, '필수 정보를 모두 입력해주세요.', 400);
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return apiError(res, '올바른 이메일 형식이 아닙니다.', 400);
        }

        // 비밀번호 강도 검증
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return apiError(res, '비밀번호는 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다.', 400);
        }

        // 기업 코드 검증
        const codeInfo = await db.validateCorporateCode(corporate_code);
        if (!codeInfo) {
            return apiError(res, '유효하지 않은 기업 코드입니다.', 400);
        }

        // 이메일 중복 체크
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return apiError(res, '이미 사용 중인 이메일입니다.', 409);
        }

        // 사원번호 중복 체크 (같은 회사 내에서)
        if (employee_number) {
            const employees = await db.getEmployeesByCompany(codeInfo.company_id);
            const duplicateEmployeeNumber = employees.find(emp => emp.employee_number === employee_number);
            if (duplicateEmployeeNumber) {
                return apiError(res, '이미 사용 중인 사원번호입니다.', 409);
            }
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const user_id = `emp_${codeInfo.company_id}_${Date.now()}`;
        const newUser = await db.createUser({
            user_id,
            name,
            email,
            password: hashedPassword,
            login_type: 'email',
            role: 'employee'
        });

        // 회사 정보 및 추가 정보 업데이트
        await db.updateUserCompany(user_id, codeInfo.company_id);
        await db.updateEmployee(user_id, {
            department,
            position,
            employee_number,
            is_active: true
        });

        // 기업 코드 사용 횟수 증가
        await db.incrementCorporateCodeUsage(corporate_code);

        // 기업-사용자 로그
        await db.logCompanyUserAction({
            company_id: codeInfo.company_id,
            user_id,
            action: 'joined',
            details: { 
                corporate_code,
                department,
                position 
            },
            performed_by: user_id
        });

        return apiResponse(res, {
            message: '회원가입이 완료되었습니다.',
            user: {
                user_id,
                name,
                email,
                company_name: codeInfo.company_name
            }
        }, 201);

    } catch (error) {
        console.error('기업 코드 가입 오류:', error);
        return apiError(res, '가입 처리 중 오류가 발생했습니다.', 500);
    }
});

// 직원 목록 조회 (Company Admin, HR Manager)
router.get('/', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { is_active, department, position, limit, offset } = req.query;
        const userRole = req.user.role;
        
        // Company Admin과 HR Manager는 자신의 회사 직원만 조회 가능
        let company_id;
        if (userRole === 'super_admin') {
            company_id = req.query.company_id;
            if (!company_id) {
                return apiError(res, '회사 ID를 입력해주세요.', 400);
            }
        } else {
            company_id = req.user.company_id;
        }

        const employees = await db.getEmployeesByCompany(company_id, {
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
            department,
            position,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });

        // 비밀번호 필드 제거
        const sanitizedEmployees = employees.map(emp => {
            const { password, ...rest } = emp;
            return rest;
        });

        return apiResponse(res, sanitizedEmployees);

    } catch (error) {
        console.error('직원 목록 조회 오류:', error);
        return apiError(res, '직원 목록 조회 중 오류가 발생했습니다.', 500);
    }
});

// 직원 상세 조회
router.get('/:user_id', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { user_id } = req.params;
        const userRole = req.user.role;

        const employee = await db.getUserByUserId(user_id);
        if (!employee) {
            return apiError(res, '직원을 찾을 수 없습니다.', 404);
        }

        // Company Admin과 HR Manager는 자신의 회사 직원만 조회 가능
        if (userRole !== 'super_admin' && employee.company_id !== req.user.company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        // 테스트 결과 포함
        const testResults = await db.getUserTestResults(user_id, 10);

        // 비밀번호 필드 제거
        const { password, ...sanitizedEmployee } = employee;

        return apiResponse(res, {
            ...sanitizedEmployee,
            testResults
        });

    } catch (error) {
        console.error('직원 상세 조회 오류:', error);
        return apiError(res, '직원 정보 조회 중 오류가 발생했습니다.', 500);
    }
});

// 직원 정보 수정
router.put('/:user_id', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { user_id } = req.params;
        const { department, position, employee_number, is_active } = req.body;
        const adminId = req.user.id;
        const userRole = req.user.role;

        const employee = await db.getUserByUserId(user_id);
        if (!employee) {
            return apiError(res, '직원을 찾을 수 없습니다.', 404);
        }

        // Company Admin과 HR Manager는 자신의 회사 직원만 수정 가능
        if (userRole !== 'super_admin' && employee.company_id !== req.user.company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        // 사원번호 중복 체크
        if (employee_number && employee_number !== employee.employee_number) {
            const employees = await db.getEmployeesByCompany(employee.company_id);
            const duplicate = employees.find(emp => 
                emp.employee_number === employee_number && emp.user_id !== user_id
            );
            if (duplicate) {
                return apiError(res, '이미 사용 중인 사원번호입니다.', 409);
            }
        }

        const updatedEmployee = await db.updateEmployee(user_id, {
            department,
            position,
            employee_number,
            is_active
        });

        // 활성화 상태 변경 로그
        if (is_active !== undefined && is_active !== employee.is_active) {
            await db.logCompanyUserAction({
                company_id: employee.company_id,
                user_id,
                action: is_active ? 'reactivated' : 'deactivated',
                performed_by: adminId
            });
        }

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'update_employee',
            target_type: 'user',
            target_id: user_id,
            details: { department, position, employee_number, is_active },
            ip_address: req.ip
        });

        // 비밀번호 필드 제거
        const { password, ...sanitizedEmployee } = updatedEmployee;

        return apiResponse(res, {
            message: '직원 정보가 수정되었습니다.',
            employee: sanitizedEmployee
        });

    } catch (error) {
        console.error('직원 정보 수정 오류:', error);
        return apiError(res, '직원 정보 수정 중 오류가 발생했습니다.', 500);
    }
});

// 직원 삭제
router.delete('/:user_id', authenticateToken, authorizeRole(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { user_id } = req.params;
        const adminId = req.user.id;
        const userRole = req.user.role;

        const employee = await db.getUserByUserId(user_id);
        if (!employee) {
            return apiError(res, '직원을 찾을 수 없습니다.', 404);
        }

        // Company Admin은 자신의 회사 직원만 삭제 가능
        if (userRole !== 'super_admin' && employee.company_id !== req.user.company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        // 삭제 전 로그
        await db.logCompanyUserAction({
            company_id: employee.company_id,
            user_id,
            action: 'left',
            details: { deleted_by: adminId },
            performed_by: adminId
        });

        await db.deleteUser(user_id);

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'delete_employee',
            target_type: 'user',
            target_id: user_id,
            details: { employee_name: employee.name },
            ip_address: req.ip
        });

        return apiResponse(res, {
            message: '직원이 삭제되었습니다.'
        });

    } catch (error) {
        console.error('직원 삭제 오류:', error);
        return apiError(res, '직원 삭제 중 오류가 발생했습니다.', 500);
    }
});

// 직원 활성화
router.put('/:user_id/activate', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { user_id } = req.params;
        const adminId = req.user.id;
        const userRole = req.user.role;

        const employee = await db.getUserByUserId(user_id);
        if (!employee) {
            return apiError(res, '직원을 찾을 수 없습니다.', 404);
        }

        // Company Admin과 HR Manager는 자신의 회사 직원만 활성화 가능
        if (userRole !== 'super_admin' && employee.company_id !== req.user.company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        if (employee.is_active) {
            return apiError(res, '이미 활성화된 계정입니다.', 400);
        }

        await db.updateEmployee(user_id, { is_active: true });

        // 활성화 로그
        await db.logCompanyUserAction({
            company_id: employee.company_id,
            user_id,
            action: 'reactivated',
            performed_by: adminId
        });

        return apiResponse(res, {
            message: '직원 계정이 활성화되었습니다.'
        });

    } catch (error) {
        console.error('직원 활성화 오류:', error);
        return apiError(res, '직원 활성화 중 오류가 발생했습니다.', 500);
    }
});

// 직원 비활성화
router.put('/:user_id/deactivate', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { user_id } = req.params;
        const adminId = req.user.id;
        const userRole = req.user.role;

        const employee = await db.getUserByUserId(user_id);
        if (!employee) {
            return apiError(res, '직원을 찾을 수 없습니다.', 404);
        }

        // Company Admin과 HR Manager는 자신의 회사 직원만 비활성화 가능
        if (userRole !== 'super_admin' && employee.company_id !== req.user.company_id) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        if (!employee.is_active) {
            return apiError(res, '이미 비활성화된 계정입니다.', 400);
        }

        await db.updateEmployee(user_id, { is_active: false });

        // 비활성화 로그
        await db.logCompanyUserAction({
            company_id: employee.company_id,
            user_id,
            action: 'deactivated',
            performed_by: adminId
        });

        return apiResponse(res, {
            message: '직원 계정이 비활성화되었습니다.'
        });

    } catch (error) {
        console.error('직원 비활성화 오류:', error);
        return apiError(res, '직원 비활성화 중 오류가 발생했습니다.', 500);
    }
});

// 배치 등록 (CSV/Excel 업로드)
router.post('/batch', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { employees } = req.body;
        const adminId = req.user.id;
        const userRole = req.user.role;
        const company_id = userRole === 'super_admin' ? req.body.company_id : req.user.company_id;

        if (!company_id) {
            return apiError(res, '회사 ID를 입력해주세요.', 400);
        }

        if (!employees || !Array.isArray(employees) || employees.length === 0) {
            return apiError(res, '등록할 직원 정보를 입력해주세요.', 400);
        }

        const results = {
            success: [],
            failed: []
        };

        for (const empData of employees) {
            try {
                const { name, email, department, position, employee_number } = empData;

                // 필수 필드 검증
                if (!name || !email) {
                    results.failed.push({
                        email,
                        reason: '이름과 이메일은 필수입니다.'
                    });
                    continue;
                }

                // 이메일 중복 체크
                const existingUser = await db.getUserByEmail(email);
                if (existingUser) {
                    results.failed.push({
                        email,
                        reason: '이미 사용 중인 이메일입니다.'
                    });
                    continue;
                }

                // 임시 비밀번호 생성
                const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!`;
                const hashedPassword = await bcrypt.hash(tempPassword, 10);

                // 사용자 생성
                const user_id = `emp_${company_id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                await db.createUser({
                    user_id,
                    name,
                    email,
                    password: hashedPassword,
                    login_type: 'email',
                    role: 'employee'
                });

                // 회사 정보 및 추가 정보 업데이트
                await db.updateUserCompany(user_id, company_id);
                await db.updateEmployee(user_id, {
                    department,
                    position,
                    employee_number,
                    is_active: true
                });

                // 기업-사용자 로그
                await db.logCompanyUserAction({
                    company_id,
                    user_id,
                    action: 'joined',
                    details: { 
                        batch_upload: true,
                        department,
                        position 
                    },
                    performed_by: adminId
                });

                results.success.push({
                    email,
                    user_id,
                    tempPassword
                });

                // TODO: 이메일 발송
                // sendWelcomeEmail(email, tempPassword);

            } catch (error) {
                results.failed.push({
                    email: empData.email,
                    reason: error.message
                });
            }
        }

        // 관리자 활동 로그
        await db.logAdminActivity({
            admin_id: adminId,
            action: 'batch_upload_employees',
            target_type: 'batch',
            target_id: `batch_${Date.now()}`,
            details: {
                total: employees.length,
                success: results.success.length,
                failed: results.failed.length
            },
            ip_address: req.ip
        });

        return apiResponse(res, {
            message: '배치 등록이 완료되었습니다.',
            results
        });

    } catch (error) {
        console.error('배치 등록 오류:', error);
        return apiError(res, '배치 등록 중 오류가 발생했습니다.', 500);
    }
});

// 기업 통계 조회
router.get('/stats/:company_id', authenticateToken, authorizeRole(['super_admin', 'company_admin', 'hr_manager']), async (req, res) => {
    try {
        const { company_id } = req.params;
        const userRole = req.user.role;

        // Company Admin과 HR Manager는 자신의 회사 통계만 조회 가능
        if (userRole !== 'super_admin' && req.user.company_id !== parseInt(company_id)) {
            return apiError(res, '권한이 없습니다.', 403);
        }

        const stats = await db.getCompanyStats(company_id);

        return apiResponse(res, stats);

    } catch (error) {
        console.error('기업 통계 조회 오류:', error);
        return apiError(res, '통계 조회 중 오류가 발생했습니다.', 500);
    }
});

module.exports = router;
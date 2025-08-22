const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// PostgreSQL 연결 풀 설정
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 DATABASE_URL 설정 여부:', process.env.DATABASE_URL ? '✅ 설정됨' : '❌ 설정되지 않음');
if (process.env.DATABASE_URL) {
    console.log('🔍 DATABASE_URL 프로토콜:', process.env.DATABASE_URL.split('://')[0]);
}

// Railway PostgreSQL 연결 설정
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Production 환경에서 SSL 설정
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    // Railway는 SSL을 사용하지만 자체 서명 인증서를 사용할 수 있음
    connectionConfig.ssl = {
        rejectUnauthorized: false
    };
    
    // Railway 데이터베이스 URL이 sslmode를 포함하는 경우 처리
    if (process.env.DATABASE_URL.includes('sslmode=')) {
        // DATABASE_URL에 이미 SSL 설정이 포함된 경우
        connectionConfig.ssl = true;
    }
}

const pool = new Pool(connectionConfig);

// 연결 테스트
pool.on('connect', () => {
    console.log('✅ PostgreSQL 데이터베이스에 연결되었습니다.');
});

pool.on('error', (err) => {
    console.error('❌ 데이터베이스 연결 오류:', err);
});

// 데이터베이스 함수들
const db = {
    // 사용자 관련 함수들
    async createUser(userData) {
        const { user_id, name, email, password, login_type } = userData;
        const query = `
            INSERT INTO users (user_id, name, email, password, login_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [user_id, name, email, password, login_type]);
            return result.rows[0];
        } catch (error) {
            console.error('사용자 생성 오류:', error);
            throw error;
        }
    },

    async getUserByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        try {
            const result = await pool.query(query, [email]);
            return result.rows[0];
        } catch (error) {
            console.error('이메일로 사용자 조회 오류:', error);
            throw error;
        }
    },

    async getUserByUserId(user_id) {
        const query = 'SELECT * FROM users WHERE user_id = $1';
        try {
            const result = await pool.query(query, [user_id]);
            return result.rows[0];
        } catch (error) {
            console.error('사용자 ID로 조회 오류:', error);
            throw error;
        }
    },

    // JWT 토큰 검증용 getUserById 함수 (getUserByUserId와 동일)
    async getUserById(user_id) {
        const query = 'SELECT * FROM users WHERE user_id = $1';
        try {
            const result = await pool.query(query, [user_id]);
            return result.rows[0];
        } catch (error) {
            console.error('JWT 토큰 검증용 사용자 ID 조회 오류:', error);
            throw error;
        }
    },

    async getAllUsers() {
        const query = 'SELECT * FROM users ORDER BY created_at DESC';
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('모든 사용자 조회 오류:', error);
            throw error;
        }
    },

    async deleteUser(user_id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 먼저 테스트 답변들 삭제
            await client.query(`
                DELETE FROM test_answers 
                WHERE result_id IN (
                    SELECT result_id FROM test_results WHERE user_id = $1
                )
            `, [user_id]);

            // 테스트 결과들 삭제
            await client.query('DELETE FROM test_results WHERE user_id = $1', [user_id]);

            // 사용자 삭제
            const result = await client.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [user_id]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('사용자 삭제 오류:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    // 테스트 결과 관련 함수들
    async createTestResult(testData) {
        const {
            result_id, session_id, user_id, overall_score,
            problem_solving_score, communication_score, leadership_score,
            creativity_score, teamwork_score, test_date, submitted_at, answers
        } = testData;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 테스트 결과 저장
            const resultQuery = `
                INSERT INTO test_results (
                    result_id, session_id, user_id, overall_score,
                    problem_solving_score, communication_score, leadership_score,
                    creativity_score, teamwork_score, test_date, submitted_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;

            const testResult = await client.query(resultQuery, [
                result_id, session_id, user_id, overall_score,
                problem_solving_score, communication_score, leadership_score,
                creativity_score, teamwork_score, test_date, submitted_at
            ]);

            // 답변들 저장
            for (const answer of answers) {
                await client.query(
                    'INSERT INTO test_answers (result_id, question_id, answer) VALUES ($1, $2, $3)',
                    [result_id, answer.id, answer.answer]
                );
            }

            await client.query('COMMIT');
            return testResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('테스트 결과 저장 오류:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    async getTestResultBySessionId(session_id) {
        const query = `
            SELECT tr.*, ta.question_id, ta.answer
            FROM test_results tr
            LEFT JOIN test_answers ta ON tr.result_id = ta.result_id
            WHERE tr.session_id = $1
            ORDER BY ta.question_id
        `;
        try {
            const result = await pool.query(query, [session_id]);
            if (result.rows.length === 0) return null;

            // 결과 구조화
            const testResult = {
                id: result.rows[0].result_id,
                sessionId: result.rows[0].session_id,
                userId: result.rows[0].user_id,
                overallScore: result.rows[0].overall_score,
                competencyScores: {
                    problemSolving: result.rows[0].problem_solving_score,
                    communication: result.rows[0].communication_score,
                    leadership: result.rows[0].leadership_score,
                    creativity: result.rows[0].creativity_score,
                    teamwork: result.rows[0].teamwork_score
                },
                testDate: result.rows[0].test_date,
                submittedAt: result.rows[0].submitted_at,
                answers: {}
            };

            // 답변들 추가
            result.rows.forEach(row => {
                if (row.question_id) {
                    testResult.answers[row.question_id] = row.answer;
                }
            });

            return testResult;
        } catch (error) {
            console.error('세션 ID로 테스트 결과 조회 오류:', error);
            throw error;
        }
    },

    async getUserTestResults(user_id, limit = 20) {
        const query = `
            SELECT result_id, session_id, overall_score,
                   problem_solving_score, communication_score, leadership_score,
                   creativity_score, teamwork_score, test_date, submitted_at
            FROM test_results 
            WHERE user_id = $1 
            ORDER BY test_date DESC 
            LIMIT $2
        `;
        try {
            const result = await pool.query(query, [user_id, limit]);
            return result.rows.map(row => ({
                id: row.result_id,
                sessionId: row.session_id,
                overallScore: row.overall_score,
                competencyScores: {
                    problemSolving: row.problem_solving_score,
                    communication: row.communication_score,
                    leadership: row.leadership_score,
                    creativity: row.creativity_score,
                    teamwork: row.teamwork_score
                },
                testDate: row.test_date,
                submittedAt: row.submitted_at
            }));
        } catch (error) {
            console.error('사용자 테스트 결과 조회 오류:', error);
            throw error;
        }
    },

    async getAllTestResults(limit = 100) {
        const query = `
            SELECT result_id, session_id, user_id, overall_score,
                   problem_solving_score, communication_score, leadership_score,
                   creativity_score, teamwork_score, test_date, submitted_at
            FROM test_results 
            ORDER BY test_date DESC 
            LIMIT $1
        `;
        try {
            const result = await pool.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('모든 테스트 결과 조회 오류:', error);
            throw error;
        }
    },

    // 통계 관련 함수들
    async getTestStats() {
        try {
            const totalTests = await pool.query('SELECT COUNT(*) as count FROM test_results');
            const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
            const avgScore = await pool.query('SELECT AVG(overall_score) as avg FROM test_results');

            return {
                totalTests: parseInt(totalTests.rows[0].count),
                totalUsers: parseInt(totalUsers.rows[0].count),
                averageScore: Math.round(parseFloat(avgScore.rows[0].avg) || 0)
            };
        } catch (error) {
            console.error('통계 조회 오류:', error);
            throw error;
        }
    },

    // 회사 관련 함수들
    async getCompanyById(company_id) {
        const query = 'SELECT * FROM companies WHERE id = $1';
        try {
            const result = await pool.query(query, [company_id]);
            return result.rows[0];
        } catch (error) {
            console.error('회사 ID로 조회 오류:', error);
            throw error;
        }
    },

    async getCompanyByCode(code) {
        const query = 'SELECT * FROM companies WHERE code = $1';
        try {
            const result = await pool.query(query, [code]);
            return result.rows[0];
        } catch (error) {
            console.error('회사 코드로 조회 오류:', error);
            throw error;
        }
    },

    async getAllCompanies() {
        const query = 'SELECT * FROM companies ORDER BY name';
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('모든 회사 조회 오류:', error);
            throw error;
        }
    },

    async createCompany(companyData) {
        const { name, code, domain } = companyData;
        const query = `
            INSERT INTO companies (name, code, domain)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [name, code, domain]);
            return result.rows[0];
        } catch (error) {
            console.error('회사 생성 오류:', error);
            throw error;
        }
    },

    // 관리자 관련 함수들
    async createAdmin(adminData) {
        const { user_id, name, email, password, role, company_id } = adminData;
        const query = `
            INSERT INTO users (user_id, name, email, password, login_type, role, company_id)
            VALUES ($1, $2, $3, $4, 'email', $5, $6)
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [user_id, name, email, password, role, company_id]);
            return result.rows[0];
        } catch (error) {
            console.error('관리자 생성 오류:', error);
            throw error;
        }
    },

    async getAdminsByCompany(company_id) {
        const query = `
            SELECT u.*, c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.company_id = $1 AND u.role IN ('company_admin', 'hr_manager')
            ORDER BY u.created_at DESC
        `;
        try {
            const result = await pool.query(query, [company_id]);
            return result.rows;
        } catch (error) {
            console.error('회사별 관리자 조회 오류:', error);
            throw error;
        }
    },

    async getAllAdmins() {
        const query = `
            SELECT u.*, c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.role IN ('super_admin', 'company_admin', 'hr_manager')
            ORDER BY u.role, u.created_at DESC
        `;
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('모든 관리자 조회 오류:', error);
            throw error;
        }
    },

    async updateUserRole(user_id, role) {
        const query = `
            UPDATE users
            SET role = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [role, user_id]);
            return result.rows[0];
        } catch (error) {
            console.error('사용자 역할 업데이트 오류:', error);
            throw error;
        }
    },

    async updateUserCompany(user_id, company_id) {
        const query = `
            UPDATE users
            SET company_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [company_id, user_id]);
            return result.rows[0];
        } catch (error) {
            console.error('사용자 회사 업데이트 오류:', error);
            throw error;
        }
    },

    // 초대 관련 함수들
    async createInvitation(invitationData) {
        const { token, email, company_id, role, invited_by, expires_at } = invitationData;
        const query = `
            INSERT INTO admin_invitations (token, email, company_id, role, invited_by, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [token, email, company_id, role, invited_by, expires_at]);
            return result.rows[0];
        } catch (error) {
            console.error('초대 생성 오류:', error);
            throw error;
        }
    },

    async getInvitationByToken(token) {
        const query = `
            SELECT i.*, c.name as company_name, u.name as inviter_name
            FROM admin_invitations i
            LEFT JOIN companies c ON i.company_id = c.id
            LEFT JOIN users u ON i.invited_by = u.user_id
            WHERE i.token = $1 AND i.used = FALSE AND i.expires_at > NOW()
        `;
        try {
            const result = await pool.query(query, [token]);
            return result.rows[0];
        } catch (error) {
            console.error('초대 토큰 조회 오류:', error);
            throw error;
        }
    },

    async markInvitationUsed(token) {
        const query = `
            UPDATE admin_invitations
            SET used = TRUE
            WHERE token = $1
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [token]);
            return result.rows[0];
        } catch (error) {
            console.error('초대 사용 처리 오류:', error);
            throw error;
        }
    },

    // 배치 업로드 관련 함수들
    async createBatchUpload(uploadData) {
        const { uploaded_by, company_id, file_name, total_count } = uploadData;
        const query = `
            INSERT INTO batch_user_uploads (uploaded_by, company_id, file_name, total_count, status)
            VALUES ($1, $2, $3, $4, 'processing')
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [uploaded_by, company_id, file_name, total_count]);
            return result.rows[0];
        } catch (error) {
            console.error('배치 업로드 생성 오류:', error);
            throw error;
        }
    },

    async updateBatchUpload(upload_id, updateData) {
        const { success_count, failed_count, status, error_details, completed_at } = updateData;
        const query = `
            UPDATE batch_user_uploads
            SET success_count = $1, failed_count = $2, status = $3, 
                error_details = $4, completed_at = $5
            WHERE id = $6
            RETURNING *
        `;
        try {
            const result = await pool.query(query, 
                [success_count, failed_count, status, error_details, completed_at, upload_id]);
            return result.rows[0];
        } catch (error) {
            console.error('배치 업로드 업데이트 오류:', error);
            throw error;
        }
    },

    async addBatchUploadDetail(detailData) {
        const { upload_id, row_number, email, name, status, error_message, user_id } = detailData;
        const query = `
            INSERT INTO batch_user_upload_details 
            (upload_id, row_number, email, name, status, error_message, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        try {
            const result = await pool.query(query, 
                [upload_id, row_number, email, name, status, error_message, user_id]);
            return result.rows[0];
        } catch (error) {
            console.error('배치 업로드 상세 추가 오류:', error);
            throw error;
        }
    },

    // 관리자 활동 로그 관련
    async logAdminActivity(activityData) {
        const { admin_id, action, target_type, target_id, details, ip_address } = activityData;
        const query = `
            INSERT INTO admin_activity_logs 
            (admin_id, action, target_type, target_id, details, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        try {
            const result = await pool.query(query, 
                [admin_id, action, target_type, target_id, details, ip_address]);
            return result.rows[0];
        } catch (error) {
            console.error('관리자 활동 로그 오류:', error);
            // 로그 실패시에도 메인 작업은 계속 진행
            return null;
        }
    },

    async getAdminActivityLogs(filters = {}) {
        const { admin_id, action, limit = 100, offset = 0 } = filters;
        let query = `
            SELECT al.*, u.name as admin_name, u.email as admin_email
            FROM admin_activity_logs al
            LEFT JOIN users u ON al.admin_id = u.user_id
            WHERE 1=1
        `;
        const params = [];
        
        if (admin_id) {
            params.push(admin_id);
            query += ` AND al.admin_id = $${params.length}`;
        }
        
        if (action) {
            params.push(action);
            query += ` AND al.action = $${params.length}`;
        }
        
        query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        try {
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('관리자 활동 로그 조회 오류:', error);
            throw error;
        }
    },

    // 연결 종료
    async close() {
        await pool.end();
        console.log('데이터베이스 연결이 종료되었습니다.');
    }
};

module.exports = db; 
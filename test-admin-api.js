// 어드민 API 테스트 스크립트
require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = process.env.APP_URL || 'http://localhost:3002';

async function testAdminAPIs() {
    console.log('=== 어드민 API 테스트 시작 ===\n');
    console.log('Base URL:', BASE_URL);
    
    // 1. 로그인
    console.log('\n1. 어드민 로그인 테스트');
    try {
        const loginResponse = await fetch(`${BASE_URL}/api/admin-auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok && loginData.token) {
            console.log('✅ 로그인 성공');
            const token = loginData.token;
            
            // 2. 프로필 조회
            console.log('\n2. 프로필 조회');
            const profileResponse = await fetch(`${BASE_URL}/api/admin/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                console.log('✅ 프로필 조회 성공:', profile);
            } else {
                console.log('❌ 프로필 조회 실패:', profileResponse.status);
            }
            
            // 3. 통계 조회
            console.log('\n3. 통계 조회');
            const statsEndpoint = loginData.user.role === 'super_admin' 
                ? '/api/admin/system-stats'
                : '/api/admin/company-stats';
                
            const statsResponse = await fetch(`${BASE_URL}${statsEndpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                console.log('✅ 통계 조회 성공:', stats);
            } else {
                console.log('❌ 통계 조회 실패:', statsResponse.status);
            }
            
            // 4. 회사 목록 조회 (Super Admin만)
            if (loginData.user.role === 'super_admin') {
                console.log('\n4. 회사 목록 조회');
                const companiesResponse = await fetch(`${BASE_URL}/api/admin/companies`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (companiesResponse.ok) {
                    const companies = await companiesResponse.json();
                    console.log('✅ 회사 목록 조회 성공. 회사 수:', companies.length);
                } else {
                    console.log('❌ 회사 목록 조회 실패:', companiesResponse.status);
                }
            }
            
            // 5. 직원 목록 조회
            console.log('\n5. 직원 목록 조회');
            const employeesResponse = await fetch(`${BASE_URL}/api/admin/employees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (employeesResponse.ok) {
                const employees = await employeesResponse.json();
                console.log('✅ 직원 목록 조회 성공. 직원 수:', employees.length);
            } else {
                console.log('❌ 직원 목록 조회 실패:', employeesResponse.status);
            }
            
            // 6. 테스트 결과 조회
            console.log('\n6. 테스트 결과 조회');
            const testResultsResponse = await fetch(`${BASE_URL}/api/admin/test-results`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (testResultsResponse.ok) {
                const results = await testResultsResponse.json();
                console.log('✅ 테스트 결과 조회 성공. 결과 수:', results.length);
            } else {
                console.log('❌ 테스트 결과 조회 실패:', testResultsResponse.status);
            }
            
        } else {
            console.log('❌ 로그인 실패:', loginData.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('테스트 중 오류:', error);
    }
    
    console.log('\n=== 테스트 완료 ===');
}

testAdminAPIs();
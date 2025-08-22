#!/usr/bin/env node

/**
 * Admin Authentication Test Script
 * 테스트 목적: 관리자 인증 API가 올바르게 작동하는지 확인
 */

const fetch = require('node-fetch');
const colors = require('colors/safe');

// 테스트 환경 설정
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_ADMIN_EMAIL = 'test.admin@example.com';
const TEST_ADMIN_PASSWORD = 'TestPassword123!';

// 색상 설정
const success = (msg) => console.log(colors.green('✅ ' + msg));
const error = (msg) => console.log(colors.red('❌ ' + msg));
const info = (msg) => console.log(colors.blue('ℹ️  ' + msg));
const warning = (msg) => console.log(colors.yellow('⚠️  ' + msg));

// 테스트 함수들
async function testAdminLogin() {
    info('Testing admin login endpoint...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: TEST_ADMIN_EMAIL,
                password: TEST_ADMIN_PASSWORD
            })
        });

        const data = await response.json();

        if (response.ok) {
            success(`Admin login successful: ${data.user?.email}`);
            return data.token;
        } else {
            error(`Admin login failed: ${data.error || 'Unknown error'}`);
            info('Response status: ' + response.status);
            return null;
        }
    } catch (err) {
        error(`Network error during admin login: ${err.message}`);
        return null;
    }
}

async function testProtectedRoute(token) {
    if (!token) {
        warning('Skipping protected route test - no token available');
        return;
    }

    info('Testing protected admin route...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (response.ok) {
            success('Protected route access successful');
            info(`Retrieved ${data.users?.length || 0} users`);
        } else {
            error(`Protected route access failed: ${data.error || 'Unknown error'}`);
        }
    } catch (err) {
        error(`Network error accessing protected route: ${err.message}`);
    }
}

async function testCORS() {
    info('Testing CORS configuration...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        if (response.ok) {
            const corsHeaders = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
                'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
            };

            success('CORS preflight successful');
            info('CORS Headers: ' + JSON.stringify(corsHeaders, null, 2));
        } else {
            error('CORS preflight failed with status: ' + response.status);
        }
    } catch (err) {
        error(`Network error during CORS test: ${err.message}`);
    }
}

async function testServerHealth() {
    info('Testing server health...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            success('Server is healthy');
            info('Server info: ' + JSON.stringify(data, null, 2));
        } else {
            warning('Health endpoint returned status: ' + response.status);
        }
    } catch (err) {
        error(`Cannot connect to server: ${err.message}`);
        info(`Make sure the server is running at ${API_BASE_URL}`);
        return false;
    }
    return true;
}

// 메인 테스트 실행
async function runTests() {
    console.log(colors.cyan('\n===================================='));
    console.log(colors.cyan('  Admin Authentication Test Suite'));
    console.log(colors.cyan('====================================\n'));
    
    info(`Testing against: ${API_BASE_URL}`);
    console.log('');

    // 1. 서버 상태 확인
    const serverHealthy = await testServerHealth();
    if (!serverHealthy) {
        error('Server is not responding. Aborting tests.');
        process.exit(1);
    }
    console.log('');

    // 2. CORS 테스트
    await testCORS();
    console.log('');

    // 3. 로그인 테스트
    const token = await testAdminLogin();
    console.log('');

    // 4. 보호된 라우트 테스트
    await testProtectedRoute(token);
    console.log('');

    console.log(colors.cyan('===================================='));
    console.log(colors.cyan('  Test Suite Completed'));
    console.log(colors.cyan('====================================\n'));
}

// 스크립트 실행
runTests().catch(err => {
    error('Unexpected error: ' + err.message);
    process.exit(1);
});
#!/usr/bin/env node
// Simple smoke test for admin endpoints.
// Usage:
//   BASE_URL=http://localhost:3000 \
//   ADMIN_USER_TOKEN=ey... \
//   ADMIN_SYS_TOKEN=ey... \
//   node scripts/smoke-admin.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_USER_TOKEN = process.env.ADMIN_USER_TOKEN || '';
const ADMIN_SYS_TOKEN = process.env.ADMIN_SYS_TOKEN || '';
const ADMIN_USER_EMAIL = process.env.ADMIN_USER_EMAIL || '';
const ADMIN_USER_PASSWORD = process.env.ADMIN_USER_PASSWORD || '';
const SYS_ADMIN_USERNAME = process.env.SYS_ADMIN_USERNAME || '';
const SYS_ADMIN_PASSWORD = process.env.SYS_ADMIN_PASSWORD || '';

const _fetch = typeof fetch === 'function' ? fetch : require('node-fetch');

async function req(path, token) {
  const url = `${BASE_URL}${path}`;
  const res = await _fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }).catch(err => ({ ok: false, status: 0, _err: err }));
  return res;
}

async function post(path, body) {
  const url = `${BASE_URL}${path}`;
  const res = await _fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }).catch(err => ({ ok: false, status: 0, _err: err }));
  return res;
}

async function loginAdminUser(email, password) {
  if (!email || !password) return '';
  try {
    const res = await post('/api/admin/auth/login', { email, password });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('  Admin user login failed:', res.status, t);
      return '';
    }
    const data = await res.json();
    const token = data?.token || '';
    if (!token) console.error('  Admin user login: token missing');
    return token;
  } catch (e) {
    console.error('  Admin user login error:', e.message);
    return '';
  }
}

async function loginSysAdmin(username, password) {
  if (!username || !password) return '';
  try {
    const res = await post('/api/sys-admin/login', { username, password });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('  Sys admin login failed:', res.status, t);
      return '';
    }
    const data = await res.json();
    const token = data?.token || '';
    if (!token) console.error('  Sys admin login: token missing');
    return token;
  } catch (e) {
    console.error('  Sys admin login error:', e.message);
    return '';
  }
}

async function testAdminUser() {
  console.log(`\n[Admin User] Using BASE_URL=${BASE_URL}`);
  let token = ADMIN_USER_TOKEN;
  if (!token && ADMIN_USER_EMAIL && ADMIN_USER_PASSWORD) {
    console.log('  Logging in with ADMIN_USER_EMAIL/ADMIN_USER_PASSWORD ...');
    token = await loginAdminUser(ADMIN_USER_EMAIL, ADMIN_USER_PASSWORD);
  }
  if (!token) {
    console.log('  Skipping: ADMIN_USER_TOKEN not set and no creds provided');
    return;
  }
  const endpoints = ['/api/admin/profile', '/api/admin/company-stats'];
  for (const ep of endpoints) {
    const res = await req(ep, token);
    const ok = res && res.ok;
    let body = '';
    try { body = ok ? await res.text() : (res?._err?.message || `HTTP ${res.status}`); } catch (_) {}
    console.log(`  GET ${ep} -> ${ok ? 'OK' : 'FAIL'} (${res?.status || '-'})`);
    if (ok) console.log(`    Body: ${truncate(body)}`);
    else console.log(`    Error: ${body}`);
  }
}

async function testSysAdmin() {
  console.log(`\n[System Admin] Using BASE_URL=${BASE_URL}`);
  let token = ADMIN_SYS_TOKEN;
  if (!token && SYS_ADMIN_USERNAME && SYS_ADMIN_PASSWORD) {
    console.log('  Logging in with SYS_ADMIN_USERNAME/SYS_ADMIN_PASSWORD ...');
    token = await loginSysAdmin(SYS_ADMIN_USERNAME, SYS_ADMIN_PASSWORD);
  }
  if (!token) {
    console.log('  Skipping: ADMIN_SYS_TOKEN not set and no creds provided');
    return;
  }
  const ep = '/api/sys-admin/companies';
  const res = await req(ep, token);
  const ok = res && res.ok;
  let body = '';
  try { body = ok ? await res.text() : (res?._err?.message || `HTTP ${res.status}`); } catch (_) {}
  console.log(`  GET ${ep} -> ${ok ? 'OK' : 'FAIL'} (${res?.status || '-'})`);
  if (ok) console.log(`    Body: ${truncate(body)}`);
  else console.log(`    Error: ${body}`);
}

function truncate(str, max = 200) {
  return (str || '').length > max ? str.slice(0, max) + '…' : str;
}

async function main() {
  await testAdminUser();
  await testSysAdmin();
}

main().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});

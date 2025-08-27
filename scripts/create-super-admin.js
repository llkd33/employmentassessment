#!/usr/bin/env node
// Create an email-based Super Admin using the protected endpoint.
// Usage:
//   EMAIL=superadmin@example.com PASSWORD='StrongPass!2024' NAME='Super Admin' \
//   BASE_URL=http://localhost:3001 node scripts/create-super-admin.js

const _fetch = typeof fetch === 'function' ? fetch : require('node-fetch');

const BASE_URL = process.env.BASE_URL || '';
const EMAIL = process.env.EMAIL || '';
const PASSWORD = process.env.PASSWORD || '';
const NAME = process.env.NAME || 'Super Admin';
const SECRET = process.env.SUPER_ADMIN_SECRET || process.env.SECRET || '';

async function tryCreate(baseUrl) {
  const url = `${baseUrl}/api/admin/auth/create-super-admin`;
  const body = { email: EMAIL, password: PASSWORD, name: NAME, secretKey: SECRET };
  const res = await _fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(err => ({ ok: false, status: 0, _err: err }));
  return res;
}

async function findBaseUrl() {
  if (BASE_URL) return BASE_URL;
  // Try common localhost ports
  const candidates = Array.from({ length: 11 }, (_, i) => `http://localhost:${3000 + i}`);
  for (const url of candidates) {
    const res = await _fetch(`${url}/api/health`).catch(() => null);
    if (res && res.ok) return url;
  }
  return '';
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Please set EMAIL and PASSWORD env variables.');
    process.exit(1);
  }
  if (!SECRET) {
    console.error('Please set SUPER_ADMIN_SECRET (or SECRET) env variable to match server .env.');
    process.exit(1);
  }
  const base = await findBaseUrl();
  if (!base) {
    console.error('Could not detect server base URL. Set BASE_URL explicitly.');
    process.exit(1);
  }
  console.log(`Using BASE_URL=${base}`);
  const res = await tryCreate(base);
  if (!res.ok) {
    const t = res._err?.message || (await res.text().catch(() => '')) || `HTTP ${res.status}`;
    console.error('Create super admin failed:', res.status, t);
    process.exit(1);
  }
  const data = await res.json().catch(() => ({}));
  console.log('Super admin created:', data?.user || data);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});


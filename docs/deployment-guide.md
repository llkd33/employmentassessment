# 🚀 신입사원 역량테스트 시스템 배포 가이드

## 📋 목차
1. [사전 준비](#사전-준비)
2. [데이터베이스 설정](#데이터베이스-설정)
3. [환경 설정](#환경-설정)
4. [데이터 마이그레이션](#데이터-마이그레이션)
5. [배포 플랫폼별 가이드](#배포-플랫폼별-가이드)
6. [배포 후 확인](#배포-후-확인)

## 🔧 사전 준비

### 1. 의존성 설치
```bash
npm install pg dotenv
npm install --save-dev nodemon
```

### 2. package.json에 스크립트 추가
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node migrate-data.js migrate",
    "backup": "node migrate-data.js backup",
    "init-db": "node migrate-data.js both"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5"
  }
}
```

## 🗄️ 데이터베이스 설정

### 옵션 1: Supabase (추천 - 무료)

1. **Supabase 프로젝트 생성**
   - https://supabase.com 접속
   - "New Project" 클릭
   - 프로젝트명, 암호 설정

2. **데이터베이스 스키마 생성**
   ```sql
   -- database-schema.sql 파일 내용을 SQL 에디터에서 실행
   ```

3. **연결 정보 확인**
   - Settings > Database
   - Connection string 복사

### 옵션 2: Railway

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 연동

2. **PostgreSQL 데이터베이스 생성**
   - "New Project" > "Provision PostgreSQL"
   - Variables 탭에서 `DATABASE_URL` 확인

### 옵션 3: Heroku

1. **Heroku Postgres 애드온**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

## ⚙️ 환경 설정

### 1. .env 파일 생성
```bash
# env-example.txt를 .env로 복사하고 실제 값으로 수정
cp env-example.txt .env
```

### 2. 환경 변수 설정
```env
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-super-secret-key
```

## 📊 데이터 마이그레이션

### 1. 기존 데이터 백업
```bash
npm run backup
```

### 2. 데이터베이스로 마이그레이션
```bash
npm run migrate
```

### 3. 전체 프로세스 (백업 + 마이그레이션)
```bash
npm run init-db
```

## 🌐 배포 플랫폼별 가이드

### 🚂 Railway 배포

1. **프로젝트 연결**
   ```bash
   # Railway CLI 설치
   npm install -g @railway/cli
   
   # 로그인
   railway login
   
   # 프로젝트 연결
   railway link
   ```

2. **환경 변수 설정**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set SESSION_SECRET=your-secret
   ```

3. **배포**
   ```bash
   railway up
   ```

### 🟣 Heroku 배포

1. **Heroku CLI 설정**
   ```bash
   # 앱 생성
   heroku create your-app-name
   
   # PostgreSQL 애드온 추가
   heroku addons:create heroku-postgresql:hobby-dev
   
   # 환경 변수 설정
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-secret
   ```

2. **배포**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push heroku main
   ```

3. **데이터베이스 초기화**
   ```bash
   heroku run npm run init-db
   ```

### ⚡ Vercel 배포 (Static + Serverless)

1. **vercel.json 설정**
   ```json
   {
     "functions": {
       "api/server.js": {
         "runtime": "@vercel/node"
       }
     },
     "routes": [
       { "src": "/api/(.*)", "dest": "/api/server.js" },
       { "src": "/(.*)", "dest": "/$1" }
     ]
   }
   ```

2. **배포**
   ```bash
   vercel --prod
   ```

### 🎯 Render 배포

1. **render.yaml 설정**
   ```yaml
   services:
     - type: web
       name: employee-assessment
       env: node
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
   ```

## ✅ 배포 후 확인

### 1. 헬스 체크
```bash
curl https://your-domain.com/api/health
```

### 2. 데이터베이스 연결 확인
```bash
# 통계 API 호출
curl https://your-domain.com/api/stats
```

### 3. 기본 기능 테스트
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 테스트 진행 및 결과 확인
- [ ] 마이페이지 접근

## 🔧 트러블슈팅

### 자주 발생하는 문제들

**1. 데이터베이스 연결 오류**
```bash
# 연결 문자열 확인
echo $DATABASE_URL

# SSL 설정 확인 (Heroku/Supabase)
DATABASE_URL="postgresql://...?sslmode=require"
```

**2. CORS 오류**
```javascript
// server.js에서 CORS 설정 확인
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
```

**3. 환경 변수 누락**
```bash
# 필수 환경 변수 확인
echo $DATABASE_URL
echo $NODE_ENV
echo $PORT
```

## 📈 성능 최적화

### 1. 데이터베이스 인덱스 확인
```sql
-- 인덱스 사용 현황 확인
EXPLAIN ANALYZE SELECT * FROM test_results WHERE user_id = 'test';
```

### 2. 연결 풀 최적화
```javascript
// database.js에서 풀 크기 조정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // 최대 연결 수
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

### 3. 캐싱 추가 (선택사항)
```bash
npm install redis
```

## 🔒 보안 설정

### 1. 환경 변수 보안
- SESSION_SECRET: 강력한 암호 사용
- DATABASE_URL: 접근 권한 최소화

### 2. HTTPS 강제
```javascript
// production에서 HTTPS 리다이렉트
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

## 📞 지원 및 문의

배포 과정에서 문제가 발생하면:
1. 로그 확인
2. 환경 변수 점검  
3. 데이터베이스 연결 상태 확인
4. 필요시 롤백 준비

---
**🎉 배포 완료 후 서비스를 즐겨보세요!** 
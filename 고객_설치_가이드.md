# 신입사원 역량테스트 시스템 - 설치 및 실행 가이드

<<< 📋 시스템 요구사항 >>>

### 필수 소프트웨어
- **Node.js** 20.0.0 이상 [다운로드](https://nodejs.org/)
- **웹브라우저** (Chrome, Firefox, Safari, Edge)

### 권장 환경
- **운영체제**: Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **메모리**: 4GB RAM 이상
- **디스크**: 500MB 여유 공간

## 🔑 **중요: API 키 설정 (필수)**

### 카카오 로그인 기능을 사용하려면 카카오 API 키가 필요합니다

#### 1. 카카오 개발자 계정 생성
1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 카카오 계정으로 로그인
3. "내 애플리케이션" > "애플리케이션 추가하기" 클릭

#### 2. 카카오 앱 생성 및 설정
1. **앱 이름**: `신입사원 역량테스트` (또는 원하는 이름)
2. **회사명**: 회사명 입력
3. 앱 생성 완료 후 **앱 키** 확인
4. **JavaScript 키**를 복사해둡니다

#### 3. 플랫폼 설정
1. **플랫폼** 탭에서 **Web 플랫폼 등록**
2. **사이트 도메인**: 
   - 개발용: `http://localhost:3000`
   - 운영용: 실제 도메인 입력 (예: `https://your-domain.com`)

#### 4. 카카오 로그인 활성화
1. **카카오 로그인** 탭에서 **활성화 설정** ON
2. **Redirect URI 등록**:
   - `http://localhost:3000` (개발용)
   - 실제 도메인 (운영용)
3. **동의항목** 설정:
   - 닉네임: 필수
   - 이메일: 선택 (권장)




<<< 🚀 빠른 시작 가이드 >>>

### 1단계: 파일 압축 해제
```bash
# 압축 파일을 원하는 폴더에 압축 해제
unzip outsourcingTEST_정리완료_20250604.zip
cd outsourcingTEST
```

### 2단계: 의존성 설치
```bash
# 프로젝트 폴더에서 실행

# 🔧 Node.js 설치 (nvm 권장 방법)
# macOS/Linux 사용자:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc  # 또는 source ~/.zshrc (zsh 사용 시)

# Windows 사용자는 nvm-windows 사용:
# https://github.com/coreybutler/nvm-windows

# Node.js 20 LTS 설치
nvm install 20
nvm use 20
nvm alias default 20

# 버전 확인
node --version  # v20.x.x
npm --version   # 10.x.x

# 프로젝트 의존성 설치
npm install
```

### 3단계: 카카오 API 키 설정 ⚠️ **반드시 필요**
다음 파일에서 `your_kakao_javascript_key_here`를 실제 카카오 JavaScript 키로 교체:

#### 📄 `client/js/utils/common.js` (3-4줄) - **이 파일만 수정하면 됩니다**
```javascript
KAKAO_API_KEY: window.location.hostname === 'localhost'
    ? 'development_kakao_key_here'     // 🔧 개발용 키 (localhost 전용)
    : 'production_kakao_key_here'      // 🚀 프로덕션용 키 (실제 도메인용)
```

### 4단계: 환경 설정 (선택사항)
#### JWT 비밀키 변경 (보안 강화)
`.env` 파일에서:
```bash
JWT_SECRET=your_custom_secret_key_here_make_it_long_and_secure
```

### 5단계: 서버 실행
```bash
# 서버 시작
npm start
```

### 6단계: 웹사이트 접속
브라우저에서 다음 주소로 접속:
```
http://localhost:3000
```

<<< 🔧 환경 설정 (선택사항) >>>

### 포트 변경
기본 포트(3000)를 변경하려면 `.env` 파일에서:
```bash
PORT=8080
```

### 데이터베이스 설정
```bash
# 초기 데이터베이스 설정 (선택사항)
npm run init-db
```

<<<📱 기능 테스트>>>

### 1. 회원가입/로그인 테스트
- **이메일 회원가입**: 메인 페이지에서 "회원가입" 클릭
- **카카오 로그인**: API 키 설정 후 "카카오톡으로 로그인" 클릭
- **테스트 계정**: `test@test.com` / `test123`

### 2. 역량테스트 실행
- 로그인 후 "검사 시작하기" 클릭
- 75개 문항 (5개 영역별 15문항씩)
- 각 문항: 5점 척도 ("전혀 그렇지 않다" ~ "매우 그렇다")

### 3. 결과 확인
- 테스트 완료 후 자동으로 결과 페이지 이동
- 마이페이지에서 과거 결과 조회 가능
- 5개 영역별 점수 및 종합 점수 확인



<<< 🛠️일반적인 문제 해결 >>>

## ⚠️ 카카오 로그인 문제 해결

### "Invalid app key" 오류
- 카카오 JavaScript 키가 올바르게 설정되었는지 확인
- 카카오 개발자 콘솔에서 앱 상태가 "서비스 중"인지 확인

### "허용되지 않은 도메인" 오류  
- 카카오 개발자 콘솔 > 플랫폼 설정에서 도메인 등록 확인
- `http://localhost:3000` 정확히 등록되었는지 확인

### 로그인 후 정보 수집 실패
- 카카오 로그인 > 동의항목에서 닉네임, 이메일 설정 확인
- 비즈니스 채널이 필요한 정보는 비즈 앱으로 전환 필요


### 서버 실행 오류
```bash
# 포트 충돌 시
lsof -ti:3000 | xargs kill -9
npm start
```

### 브라우저 접속 안됨
- 방화벽 설정 확인
- 브라우저 캐시 삭제 (Ctrl+F5)
- 다른 브라우저로 시도

### Node.js 버전 문제
```bash
# Node.js 버전 확인
node --version
# 16.0.0 이상이어야 함
```

<<< 🔐 보안 설정 체크리스트 >>>

### ✅ 완료해야 할 보안 설정
1. **카카오 API 키 설정** - `client/js/utils/common.js` 파일에서 교체 완료
2. **JWT_SECRET 변경** - `.env` 파일에서 고유한 값으로 설정
3. **카카오 앱 도메인 제한** - 개발자 콘솔에서 허용 도메인만 등록




<<<🌐 AWS 배포 가이드>>>

### 📋 AWS 배포 준비사항
- **AWS 계정** 및 EC2 인스턴스
- **도메인** (예: `your-domain.com`)
- **SSL 인증서** (Let's Encrypt 권장)
- **SSH 키 페어** (비밀번호 로그인 비활성화 권장)

### 🚀 AWS EC2 배포 단계별 가이드

#### 1단계: EC2 인스턴스 설정
```bash
# Ubuntu 22.04 LTS 기준
# 1. 인스턴스 연결 후 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20 LTS 설치 (⚠️ nvm 사용 권장 - AWS 공식 권장 방법)

# nvm(Node Version Manager) 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 터미널 재시작 또는 환경변수 즉시 로드
source ~/.bashrc
# 또는 source ~/.profile (Ubuntu/Debian)
# 또는 source ~/.zshrc (zsh 사용 시)

# nvm 설치 확인
nvm --version

# 사용 가능한 Node.js 버전 확인 (선택사항)
nvm list-remote --lts

# Node.js 20 LTS 설치 및 사용
nvm install 20              # 최신 20.x 버전 설치
nvm use 20                  # 현재 세션에서 20.x 사용
nvm alias default 20        # 기본 버전으로 설정 (중요!)

# 🔍 설치된 Node.js 버전 목록 확인
nvm list

# 3. Node.js 및 npm 버전 확인 (20.x 이상이어야 함)
node --version  # v20.x.x 확인 (예: v20.11.0)
npm --version   # 10.x.x 확인 (예: 10.2.4)

# 📝 추가 nvm 관리 명령어 (참고용)
# nvm install node          # 최신 버전 설치
# nvm use 18                # 18.x 버전으로 전환
# nvm uninstall 18          # 18.x 버전 제거

# 4. PM2 글로벌 설치 (프로세스 매니저)
sudo npm install -g pm2

# 5. 기본 도구 설치
sudo apt install -y nginx certbot python3-certbot-nginx htop ufw fail2ban

# 6. 방화벽 설정 (⚠️ 보안 강화)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from YOUR_IP_ADDRESS to any port 22  # SSH - 본인 IP만 허용
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw --force enable
```

#### 2단계: 보안 강화 설정
```bash
# 1. SSH 보안 설정
sudo nano /etc/ssh/sshd_config

# 다음 설정 추가/수정:
# PasswordAuthentication no
# PermitRootLogin no
# Protocol 2
# Port 22
# MaxAuthTries 3
# ClientAliveInterval 300
# ClientAliveCountMax 2

# SSH 서비스 재시작
sudo systemctl restart sshd

# 2. Fail2Ban 설정 (무차별 대입 공격 방지)
sudo nano /etc/fail2ban/jail.local
```

**Fail2Ban 설정 내용:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
# Fail2Ban 시작
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### 3단계: 프로젝트 배포
```bash
# 1. 애플리케이션 디렉토리 생성
sudo mkdir -p /var/www/assessment
sudo chown -R $USER:$USER /var/www/assessment
cd /var/www/assessment

# 2. 압축 파일 업로드 후 압축 해제
# (scp 또는 rsync 사용)
unzip outsourcingTEST_AWS배포가이드포함_20250604.zip
cd outsourcingTEST

# 3. 의존성 설치
npm install --production --no-optional

# 4. 로그 디렉토리 생성
mkdir -p logs uploads backups
chmod 755 logs uploads backups
```

#### 4단계: 환경설정 (.env 파일)
```bash
# env-example.txt를 .env로 복사
cp env-example.txt .env
nano .env
```

**프로덕션 .env 설정 (⚠️ 필수 변경 항목):**
```bash
# ===============================
# 기본 서버 설정
# ===============================
NODE_ENV=production
PORT=3000

# ===============================
# 보안 설정 (⚠️ 반드시 변경!)
# ===============================
# JWT 비밀키 생성 방법:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=여기에_32자_이상의_무작위_문자열_입력

# 세션 비밀키 생성 방법:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=여기에_32자_이상의_다른_무작위_문자열_입력

# HTTPS 환경에서만 true
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# ===============================
# 도메인 설정
# ===============================
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ===============================
# 로그 설정
# ===============================
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
MAX_LOG_SIZE=10MB
MAX_LOG_FILES=5

# ===============================
# 보안 비밀키 생성 스크립트
# ===============================
```

**보안 키 생성 도구:**
```bash
# JWT_SECRET과 SESSION_SECRET 생성
node -e "
console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'));
console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'));
"
```

#### 5단계: 카카오 API 설정 (⚠️ 개발/프로덕션 구분)
```bash
# 1. common.js 파일 수정
nano client/js/utils/common.js
```

**카카오 API 키 설정 (개발/프로덕션 구분):**
```javascript
KAKAO_API_KEY: window.location.hostname === 'localhost'
    ? 'development_kakao_key_here'     // 🔧 개발용 키 (localhost 전용)
    : 'production_kakao_key_here'      // 🚀 프로덕션용 키 (실제 도메인용)
```

#### 6단계: 카카오 개발자 콘솔 설정 변경
1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. **플랫폼 설정**에서 Web 플랫폼 도메인 추가:
   - `https://your-domain.com` (HTTPS 필수!)
   - `https://www.your-domain.com`
3. **카카오 로그인 Redirect URI** 추가:
   - `https://your-domain.com`
   - `https://www.your-domain.com`
4. **개발용 키와 프로덕션용 키를 별도로 발급받아 사용 권장**

#### 7단계: Nginx 설정 (보안 강화)
```bash
# 1. Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/assessment
```

**보안 강화된 Nginx 설정:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # HTTP to HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 설정
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 파일 업로드 크기 제한
    client_max_body_size 10M;
    
    # Gzip 압축
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # 레이트 리미팅
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 보안 설정
        proxy_hide_header X-Powered-By;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }
    
    # 정적 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 보안 파일 접근 차단
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log)$ {
        deny all;
    }
}
```

```bash
# 3. 설정 활성화
sudo ln -s /etc/nginx/sites-available/assessment /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8단계: SSL 인증서 설정 (Let's Encrypt)
```bash
# 1. Certbot으로 SSL 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com --email your-email@domain.com --agree-tos --no-eff-email

# 2. 자동 갱신 테스트
sudo certbot renew --dry-run

# 3. 자동 갱신 cron 작업 확인
sudo crontab -l | grep certbot
# 없다면 추가:
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

#### 9단계: PM2로 애플리케이션 실행 (클러스터 모드)
```bash
# 1. PM2로 프로덕션 모드 시작 (클러스터)
pm2 start ecosystem.config.js --env production

# 2. PM2 상태 확인
pm2 status
pm2 logs
pm2 monit

# 3. 시스템 재시작 시 자동 실행 설정
pm2 startup
pm2 save

# 4. PM2 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 🔧 AWS 보안 그룹 설정 (강화)

**인바운드 규칙:**
- **SSH (22)**: 본인 IP 주소만 허용 (예: 203.0.113.1/32)
- **HTTP (80)**: 0.0.0.0/0 (SSL 리다이렉트용)
- **HTTPS (443)**: 0.0.0.0/0 (모든 IP)

**아웃바운드 규칙:**
- **모든 트래픽**: 0.0.0.0/0 (필요시 제한 가능)




<<<📊 배포 후 확인사항>>>

#### ✅ 체크리스트
1. **웹사이트 접속**: `https://your-domain.com`
2. **SSL 인증서 확인**: 자물쇠 아이콘 표시
3. **카카오 로그인 테스트**
4. **회원가입/로그인 기능**
5. **역량테스트 실행**
6. **PM2 클러스터 상태 확인**: `pm2 status`
7. **로그 확인**: `pm2 logs`


<<<🛠️ AWS 배포 문제 해결>>>

**포트 연결 오류:**
```bash
# 서버 상태 확인
pm2 logs assessment-app
sudo netstat -tlnp | grep :3000
sudo systemctl status nginx
```

**SSL 인증서 오류:**
```bash
# 인증서 상태 확인
sudo certbot certificates
sudo nginx -t
sudo systemctl status nginx
```

**메모리/성능 문제:**
```bash
# 시스템 리소스 확인
htop
pm2 monit
df -h
free -h

# PM2 재시작
pm2 restart all
pm2 reload all  # 무중단 재시작
```

### 💾 백업 설정 (개선)
```bash
# 1. 백업 디렉토리 생성
mkdir -p ~/backups

# 2. 백업 스크립트 생성
nano ~/backup.sh
```

**백업 스크립트 내용:**
```bash
#!/bin/bash

# 백업 설정
BACKUP_DIR="$HOME/backups"
APP_DIR="/var/www/assessment/outsourcingTEST"
DATE=$(date +%Y%m%d_%H%M%S)

# 백업 디렉토리 확인/생성
mkdir -p "$BACKUP_DIR"

# 데이터 백업
echo "백업 시작: $DATE"
tar -czf "$BACKUP_DIR/data_backup_$DATE.tar.gz" -C "$APP_DIR" data/
tar -czf "$BACKUP_DIR/logs_backup_$DATE.tar.gz" -C "$APP_DIR" logs/

# 설정 파일 백업
cp "$APP_DIR/.env" "$BACKUP_DIR/env_backup_$DATE"
cp "$APP_DIR/ecosystem.config.js" "$BACKUP_DIR/ecosystem_backup_$DATE.js"

# 7일 이상 된 백업 파일 삭제
find "$BACKUP_DIR" -name "*backup*" -mtime +7 -delete

echo "백업 완료: $DATE"
```

```bash
# 3. 스크립트 실행 권한 부여
chmod +x ~/backup.sh

# 4. 백업 테스트
~/backup.sh

# 5. 자동 백업 cron 등록 (매일 새벽 2시)
echo "0 2 * * * $HOME/backup.sh >> $HOME/backup.log 2>&1" | crontab -
```

### 📈 모니터링 및 알림 설정
```bash
# 1. 로그 모니터링 스크립트
nano ~/monitor.sh
```

**모니터링 스크립트:**
```bash
#!/bin/bash

# PM2 상태 확인
pm2 list | grep -q "online" || echo "⚠️ PM2 프로세스 문제 발생!" >> ~/monitor.log

# 디스크 사용량 확인 (80% 이상 시 경고)
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️ 디스크 사용량 경고: ${DISK_USAGE}%" >> ~/monitor.log
fi

# 메모리 사용량 확인
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -gt 80 ]; then
    echo "⚠️ 메모리 사용량 경고: ${MEM_USAGE}%" >> ~/monitor.log
fi
```

```bash
# 2. 모니터링 cron 등록 (5분마다)
echo "*/5 * * * * $HOME/monitor.sh" | crontab -e
```

---

**프로젝트**: 신입사원 역량테스트 시스템  
**버전**: 1.0.0  
**마지막 업데이트**: 2025.06.04  
**배포 가이드 버전**: 2.0 (nvm 통합) 
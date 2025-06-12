# 🚀 빠른 시작 가이드

## 1분 안에 실행하기!

### Step 1: 파일 준비
프로젝트 폴더를 다운로드하고 압축을 해제하세요.

### Step 2: 실행
운영체제에 맞는 파일을 실행하세요:

**Windows 사용자**
```
start.bat 파일을 더블클릭
```

**Mac/Linux 사용자**
```bash
./start.sh
```

### Step 3: 접속
브라우저에서 http://localhost:5000 으로 접속

---

## 📋 필요한 프로그램

### Node.js (필수)
- [다운로드](https://nodejs.org)
- 설치 확인: 터미널에서 `node --version`

### PostgreSQL (필수)
- [Windows 다운로드](https://www.postgresql.org/download/windows/)
- Mac: `brew install postgresql`
- Ubuntu: `sudo apt install postgresql`

---

## 🆘 문제 해결

### "Node.js를 찾을 수 없습니다"
→ Node.js를 설치하고 컴퓨터를 재시작하세요.

### "데이터베이스 연결 실패"
→ PostgreSQL을 설치하고 다음 명령 실행:
```bash
createdb employee_assessment
```

### "포트 5000이 사용 중"
→ 실행 중인 다른 프로그램을 종료하거나, .env 파일에서 포트 변경

---

## ✅ 성공!
이 메시지가 보이면 성공입니다:
```
🚀 서버가 포트 5000에서 실행중입니다.
📱 브라우저에서 http://localhost:5000 으로 접속하세요
``` 
#!/bin/bash

# 한글 출력 지원
export LANG=ko_KR.UTF-8

echo "========================================"
echo "   신입사원 역량검사 시스템 시작"
echo "========================================"
echo ""

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    echo "   https://nodejs.org 에서 다운로드하여 설치해주세요."
    echo ""
    echo "Mac의 경우: brew install node"
    echo "Ubuntu의 경우: sudo apt-get install nodejs npm"
    echo ""
    exit 1
fi

echo "✅ Node.js 확인됨"
echo ""

# 첫 실행인지 확인 (.env 파일 존재 여부)
if [ ! -f ".env" ]; then
    echo "🔧 첫 실행을 감지했습니다. 초기 설정을 진행합니다..."
    echo ""
    npm run setup
    echo ""
    echo "설정이 완료되었습니다. 엔터를 눌러 서버를 시작하세요."
    read -p ""
fi

# 서버 시작
echo "🚀 서버를 시작합니다..."
echo ""
echo "📱 브라우저에서 http://localhost:5000 으로 접속하세요"
echo ""
echo "🛑 서버를 중지하려면 Ctrl+C를 누르세요"
echo ""
echo "========================================"
echo ""

npm start

echo ""
echo "서버가 종료되었습니다." 
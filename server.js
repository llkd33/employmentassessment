const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// 환경변수 설정
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 데이터 파일 경로
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RESULTS_FILE = path.join(DATA_DIR, 'test-results.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// 데이터 파일 초기화
function initDataFiles() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(RESULTS_FILE)) {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify([], null, 2));
    }
}

// 데이터 읽기/쓰기 함수
function readUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('사용자 데이터 읽기 오류:', error);
        return [];
    }
}

function writeUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('사용자 데이터 쓰기 오류:', error);
        return false;
    }
}

function readResults() {
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('테스트 결과 읽기 오류:', error);
        return [];
    }
}

function writeResults(results) {
    try {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        return true;
    } catch (error) {
        console.error('테스트 결과 쓰기 오류:', error);
        return false;
    }
}

// 초기화
initDataFiles();

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('./')); // 정적 파일 서빙

// JWT 토큰 생성
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret_key_2024', {
        expiresIn: '7d'
    });
};

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '토큰이 필요합니다.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key_2024', (err, user) => {
        if (err) {
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
};

// ===== 인증 API =====

// 회원가입
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, nickname, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: '필수 필드가 누락되었습니다.' });
        }

        const users = readUsers();

        // 이메일 중복 검사
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const user = {
            id: Date.now().toString(),
            name,
            nickname: nickname || name,
            email,
            password: hashedPassword,
            loginType: 'email',
            joinDate: new Date().toISOString()
        };

        users.push(user);
        writeUsers(users);

        // 토큰 생성
        const token = generateToken(user.id);

        res.json({
            message: '회원가입 성공',
            token,
            user: {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                email: user.email,
                joinDate: user.joinDate
            }
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: '이메일과 비밀번호가 필요합니다.' });
        }

        const users = readUsers();

        // 사용자 찾기
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // 토큰 생성
        const token = generateToken(user.id);

        res.json({
            message: '로그인 성공',
            token,
            user: {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                email: user.email,
                joinDate: user.joinDate
            }
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 카카오 로그인
app.post('/api/auth/kakao', async (req, res) => {
    try {
        const { kakaoId, nickname, email } = req.body;

        const users = readUsers();

        // 기존 사용자 찾기 또는 생성
        let user = users.find(u => u.kakaoId === kakaoId || u.email === email);

        if (!user) {
            user = {
                id: Date.now().toString(),
                kakaoId,
                name: nickname,
                nickname,
                email,
                loginType: 'kakao',
                joinDate: new Date().toISOString()
            };
            users.push(user);
            writeUsers(users);
        }

        const token = generateToken(user.id);

        res.json({
            message: '카카오 로그인 성공',
            token,
            user: {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                email: user.email,
                loginType: 'kakao',
                joinDate: user.joinDate
            }
        });
    } catch (error) {
        console.error('카카오 로그인 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// ===== 역량검사 API =====

// 검사 문제 조회
app.get('/api/test/questions', (req, res) => {
    const questions = [
        // 문제해결능력
        {
            id: 1,
            category: '문제해결능력',
            question: '복잡한 문제가 발생했을 때 체계적으로 분석하고 해결책을 찾는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 2,
            category: '문제해결능력',
            question: '어려운 상황에서도 포기하지 않고 끝까지 해결방법을 모색한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 3,
            category: '문제해결능력',
            question: '문제의 원인을 정확히 파악하기 위해 충분한 정보를 수집한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 4,
            category: '문제해결능력',
            question: '여러 가지 해결방안을 검토한 후 최적의 방법을 선택한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 5,
            category: '문제해결능력',
            question: '예상치 못한 상황에서도 빠르게 대응할 수 있다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 커뮤니케이션
        {
            id: 6,
            category: '커뮤니케이션',
            question: '다른 사람의 의견을 주의 깊게 듣고 이해하려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 7,
            category: '커뮤니케이션',
            question: '내 생각과 의견을 명확하고 이해하기 쉽게 전달한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 8,
            category: '커뮤니케이션',
            question: '상대방의 입장에서 생각하며 소통한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 9,
            category: '커뮤니케이션',
            question: '갈등 상황에서 상호 이해를 돕는 대화를 시도한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 10,
            category: '커뮤니케이션',
            question: '피드백을 받을 때 열린 마음으로 수용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 리더십
        {
            id: 11,
            category: '리더십',
            question: '팀이 목표를 달성할 수 있도록 방향을 제시한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 12,
            category: '리더십',
            question: '어려운 결정을 내려야 할 때 책임감을 가지고 결정한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 13,
            category: '리더십',
            question: '팀원들의 능력을 파악하고 적절한 역할을 부여한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 14,
            category: '리더십',
            question: '팀원들이 성장할 수 있도록 지원하고 격려한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 15,
            category: '리더십',
            question: '솔선수범하여 팀의 모범이 되려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 창의성
        {
            id: 16,
            category: '창의성',
            question: '기존과 다른 새로운 아이디어를 자주 제안한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 17,
            category: '창의성',
            question: '다양한 관점에서 문제를 바라보려고 한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 18,
            category: '창의성',
            question: '기존의 방식에 만족하지 않고 개선방안을 모색한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 19,
            category: '창의성',
            question: '상상력을 발휘하여 독창적인 해결책을 찾는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 20,
            category: '창의성',
            question: '새로운 변화나 도전을 두려워하지 않는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 팀워크
        {
            id: 21,
            category: '팀워크',
            question: '팀의 목표를 개인의 목표보다 우선시한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 22,
            category: '팀워크',
            question: '동료가 도움을 요청할 때 기꺼이 협력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 23,
            category: '팀워크',
            question: '팀원들과의 관계를 원만하게 유지한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 24,
            category: '팀워크',
            question: '팀 내에서 자신의 역할과 책임을 충실히 수행한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 25,
            category: '팀워크',
            question: '팀의 성과를 위해 개인적인 희생을 감수할 수 있다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 책임감
        {
            id: 26,
            category: '책임감',
            question: '맡은 일은 끝까지 완수하려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 27,
            category: '책임감',
            question: '실수를 했을 때 변명하지 않고 책임을 진다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 28,
            category: '책임감',
            question: '약속한 일은 반드시 지키려고 한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 29,
            category: '책임감',
            question: '업무의 질을 높이기 위해 지속적으로 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 30,
            category: '책임감',
            question: '주어진 권한 내에서 자율적으로 의사결정을 한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        }
    ];

    res.json({ questions });
});

// 검사 결과 제출
app.post('/api/test/submit', authenticateToken, async (req, res) => {
    try {
        const { answers } = req.body;
        const userId = req.user.userId;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: '답변 데이터가 유효하지 않습니다.' });
        }

        // 점수 계산 (실제로는 더 복잡한 로직)
        const competencyScores = {
            problemSolving: Math.floor(Math.random() * 30) + 70,
            communication: Math.floor(Math.random() * 30) + 70,
            leadership: Math.floor(Math.random() * 30) + 70,
            creativity: Math.floor(Math.random() * 30) + 70,
            teamwork: Math.floor(Math.random() * 30) + 70,
            responsibility: Math.floor(Math.random() * 30) + 70
        };

        const overallScore = Math.round(
            Object.values(competencyScores).reduce((sum, score) => sum + score, 0) / 6
        );

        const result = {
            id: Date.now().toString(),
            userId,
            answers,
            competencyScores,
            overallScore,
            testDate: new Date().toISOString(),
            savedAt: new Date().toISOString()
        };

        const results = readResults();
        results.push(result);
        writeResults(results);

        res.json({
            message: '검사 완료',
            result: {
                id: result.id,
                competencyScores: result.competencyScores,
                overallScore: result.overallScore,
                testDate: result.testDate
            }
        });
    } catch (error) {
        console.error('검사 제출 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// ===== 마이페이지 API =====

// 사용자 프로필 및 테스트 결과 조회
app.get('/api/user/profile', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const users = readUsers();
        const results = readResults();

        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 사용자의 모든 테스트 결과
        const userResults = results
            .filter(r => r.userId === userId)
            .sort((a, b) => new Date(b.testDate) - new Date(a.testDate));

        res.json({
            user: {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                email: user.email,
                joinDate: user.joinDate
            },
            testResults: userResults
        });
    } catch (error) {
        console.error('프로필 조회 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 계정 삭제
app.delete('/api/user/account', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const users = readUsers();
        const results = readResults();

        // 사용자 삭제
        const updatedUsers = users.filter(u => u.id !== userId);
        writeUsers(updatedUsers);

        // 사용자의 테스트 결과 삭제
        const updatedResults = results.filter(r => r.userId !== userId);
        writeResults(updatedResults);

        res.json({ message: '계정이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('계정 삭제 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 서버 상태 확인 API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: '서버가 정상적으로 작동중입니다.'
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 서버가 포트 ${PORT}에서 실행중입니다.`);
    console.log(`📋 API 테스트: http://localhost:${PORT}/api/health`);
    console.log(`🌐 웹사이트: http://localhost:${PORT}`);
    console.log(`===========================================`);
}); 
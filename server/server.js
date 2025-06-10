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
// Railway는 동적 포트를 할당하므로 환경 변수를 우선 사용
const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3000;

// 데이터 파일 경로
const DATA_DIR = path.join(__dirname, '../data');
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
app.use(express.static('../client')); // 정적 파일 서빙

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
        // 문제해결능력 (15문제)
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
        {
            id: 6,
            category: '문제해결능력',
            question: '문제 해결을 위해 창의적인 접근방법을 시도한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 7,
            category: '문제해결능력',
            question: '시간적 제약이 있어도 효율적으로 문제를 해결한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 8,
            category: '문제해결능력',
            question: '실패한 경험을 통해 더 나은 해결책을 찾는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 9,
            category: '문제해결능력',
            question: '논리적 사고를 바탕으로 문제를 분석한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 10,
            category: '문제해결능력',
            question: '문제 상황에서 우선순위를 정하여 체계적으로 접근한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 11,
            category: '문제해결능력',
            question: '다양한 관점에서 문제를 바라보려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 12,
            category: '문제해결능력',
            question: '문제 해결 과정에서 발생하는 장애물을 극복한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 13,
            category: '문제해결능력',
            question: '과거의 경험을 활용하여 현재 문제를 해결한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 14,
            category: '문제해결능력',
            question: '문제 해결을 위해 필요한 자원을 적극적으로 활용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 15,
            category: '문제해결능력',
            question: '문제 해결 후 결과를 평가하고 개선점을 찾는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 커뮤니케이션 (15문제)
        {
            id: 16,
            category: '커뮤니케이션',
            question: '다른 사람의 의견을 주의 깊게 듣고 이해하려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 17,
            category: '커뮤니케이션',
            question: '내 생각과 의견을 명확하고 이해하기 쉽게 전달한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 18,
            category: '커뮤니케이션',
            question: '상대방의 입장에서 생각하며 소통한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 19,
            category: '커뮤니케이션',
            question: '갈등 상황에서 상호 이해를 돕는 대화를 시도한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 20,
            category: '커뮤니케이션',
            question: '피드백을 받을 때 열린 마음으로 수용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 21,
            category: '커뮤니케이션',
            question: '비언어적 표현(몸짓, 표정 등)을 효과적으로 활용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 22,
            category: '커뮤니케이션',
            question: '상황에 맞는 적절한 언어를 사용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 23,
            category: '커뮤니케이션',
            question: '다른 사람의 감정을 이해하고 공감한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 24,
            category: '커뮤니케이션',
            question: '의견 차이가 있을 때 건설적인 토론을 이끈다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 25,
            category: '커뮤니케이션',
            question: '상대방이 이해할 수 있는 수준에 맞춰 설명한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 26,
            category: '커뮤니케이션',
            question: '중요한 내용은 반복하여 전달한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 27,
            category: '커뮤니케이션',
            question: '상대방의 말을 끝까지 들은 후에 응답한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 28,
            category: '커뮤니케이션',
            question: '질문을 통해 상대방의 의도를 명확히 파악한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 29,
            category: '커뮤니케이션',
            question: '긍정적인 분위기에서 대화하려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 30,
            category: '커뮤니케이션',
            question: '서면으로도 명확하고 체계적으로 의사소통한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 리더십 (15문제)
        {
            id: 31,
            category: '리더십',
            question: '팀이 목표를 달성할 수 있도록 방향을 제시한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 32,
            category: '리더십',
            question: '어려운 결정을 내려야 할 때 책임감을 가지고 결정한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 33,
            category: '리더십',
            question: '팀원들의 능력을 파악하고 적절한 역할을 부여한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 34,
            category: '리더십',
            question: '팀원들이 성장할 수 있도록 지원하고 격려한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 35,
            category: '리더십',
            question: '솔선수범하여 팀의 모범이 되려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 36,
            category: '리더십',
            question: '팀원들의 의견을 수렴하여 의사결정에 반영한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 37,
            category: '리더십',
            question: '변화가 필요한 상황에서 팀을 이끌어간다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 38,
            category: '리더십',
            question: '팀의 성과와 실패에 대해 책임을 진다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 39,
            category: '리더십',
            question: '팀원들에게 동기를 부여하고 영감을 준다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 40,
            category: '리더십',
            question: '갈등 상황에서 중재자 역할을 효과적으로 수행한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 41,
            category: '리더십',
            question: '팀의 비전과 목표를 명확히 전달한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 42,
            category: '리더십',
            question: '위기 상황에서 침착하게 팀을 이끈다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 43,
            category: '리더십',
            question: '팀원들의 다양성을 인정하고 활용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 44,
            category: '리더십',
            question: '성과에 대해 적절한 보상과 인정을 제공한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 45,
            category: '리더십',
            question: '지속적인 학습을 통해 리더십 역량을 개발한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 창의성 (15문제)
        {
            id: 46,
            category: '창의성',
            question: '기존과 다른 새로운 아이디어를 자주 제안한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 47,
            category: '창의성',
            question: '다양한 관점에서 문제를 바라보려고 한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 48,
            category: '창의성',
            question: '기존의 방식에 만족하지 않고 개선방안을 모색한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 49,
            category: '창의성',
            question: '상상력을 발휘하여 독창적인 해결책을 찾는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 50,
            category: '창의성',
            question: '새로운 변화나 도전을 두려워하지 않는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 51,
            category: '창의성',
            question: '실험적인 접근을 시도하는 것을 좋아한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 52,
            category: '창의성',
            question: '다른 사람의 아이디어에서 영감을 얻어 발전시킨다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 53,
            category: '창의성',
            question: '브레인스토밍과 같은 창의적 활동에 적극 참여한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 54,
            category: '창의성',
            question: '예술, 문화 등 다양한 분야에 관심이 많다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 55,
            category: '창의성',
            question: '실패를 두려워하지 않고 새로운 시도를 한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 56,
            category: '창의성',
            question: '일상적인 업무에서도 효율성을 높이는 방법을 찾는다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 57,
            category: '창의성',
            question: '다른 분야의 지식을 현재 업무에 적용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 58,
            category: '창의성',
            question: '호기심이 많고 새로운 것을 배우려고 한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 59,
            category: '창의성',
            question: '틀에 박힌 사고보다는 유연한 사고를 선호한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 60,
            category: '창의성',
            question: '혁신적인 아이디어를 실현 가능한 계획으로 구체화한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },

        // 팀워크 (15문제)
        {
            id: 61,
            category: '팀워크',
            question: '팀의 목표를 개인의 목표보다 우선시한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 62,
            category: '팀워크',
            question: '동료가 도움을 요청할 때 기꺼이 협력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 63,
            category: '팀워크',
            question: '팀원들과의 관계를 원만하게 유지한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 64,
            category: '팀워크',
            question: '팀 내에서 자신의 역할과 책임을 충실히 수행한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 65,
            category: '팀워크',
            question: '팀의 성과를 위해 개인적인 희생을 감수할 수 있다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 66,
            category: '팀워크',
            question: '팀원들의 의견을 존중하고 경청한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 67,
            category: '팀워크',
            question: '팀 프로젝트에서 적극적으로 참여한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 68,
            category: '팀워크',
            question: '팀원들과 정보와 지식을 공유한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 69,
            category: '팀워크',
            question: '팀의 결정에 대해 개인적으로 동의하지 않아도 지지한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 70,
            category: '팀워크',
            question: '팀원들의 강점을 인정하고 활용한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 71,
            category: '팀워크',
            question: '팀 내 갈등이 있을 때 해결하려고 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 72,
            category: '팀워크',
            question: '팀의 업무 분담이 공정하게 이루어지도록 노력한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 73,
            category: '팀워크',
            question: '팀원들에게 건설적인 피드백을 제공한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 74,
            category: '팀워크',
            question: '팀의 성공을 위해 개인적 성과보다 팀 성과를 중시한다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        },
        {
            id: 75,
            category: '팀워크',
            question: '새로운 팀원이 합류했을 때 적응을 도와준다.',
            options: ['매우 그렇다', '그렇다', '보통', '아니다', '매우 아니다']
        }
    ];

    res.json({ questions });
});

// 검사 결과 제출
app.post('/api/test/submit', async (req, res) => {
    try {
        const { answers, sessionId, submittedAt } = req.body;
        // 임시로 테스트용 사용자 ID 사용
        const userId = 'test-user-' + Date.now();

        // 간단한 요약 로그만 출력 (대용량 JSON 출력 제거)
        console.log(`테스트 제출 - 세션: ${sessionId}, 답변 수: ${answers?.length || 0}`);

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: '답변 데이터가 유효하지 않습니다.' });
        }

        if (!sessionId) {
            return res.status(400).json({ message: '세션 ID가 필요합니다.' });
        }

        // 기존 결과에서 같은 세션 ID가 있는지 확인
        const existingResults = readResults();
        const existingResult = existingResults.find(result => result.sessionId === sessionId);

        if (existingResult) {
            console.log(`세션 ID ${sessionId}에 대한 기존 결과 발견, 기존 결과 반환`);
            return res.json({
                message: '이미 제출된 검사입니다',
                result: {
                    id: existingResult.id,
                    sessionId: existingResult.sessionId,
                    competencyScores: existingResult.competencyScores,
                    overallScore: existingResult.overallScore,
                    testDate: existingResult.testDate,
                    submittedAt: existingResult.submittedAt,
                    isExisting: true // 기존 결과임을 표시
                }
            });
        }

        // 점수 계산 함수
        function calculateScore(answer) {
            switch (answer) {
                case '매우 그렇다': return 100;
                case '대체로 그렇다': return 75;
                case '보통이다': return 50;
                case '대체로 그렇지 않다': return 25;
                case '전혀 그렇지 않다': return 0;
                default:
                    console.log(`알 수 없는 답변: ${answer}`);
                    return 50; // 기본값
            }
        }

        // 역량별 점수 계산
        const competencyGroups = {
            problemSolving: [], // 1-15번 (문제해결능력)
            communication: [], // 16-30번 (커뮤니케이션)
            leadership: [], // 31-45번 (리더십)
            creativity: [], // 46-60번 (창의성)
            teamwork: [] // 61-75번 (팀워크)
        };

        // 답변을 역량별로 분류 (개별 문항 로그 제거)
        answers.forEach((answer, index) => {
            const questionId = answer.id || (index + 1);
            const score = calculateScore(answer.answer);
            // 75개 문항 개별 로그 제거 - 시스템 리소스 절약
            // console.log(`문항 ${questionId}: "${answer.answer}" -> ${score}점`);

            if (questionId >= 1 && questionId <= 15) {
                competencyGroups.problemSolving.push(score);
            } else if (questionId >= 16 && questionId <= 30) {
                competencyGroups.communication.push(score);
            } else if (questionId >= 31 && questionId <= 45) {
                competencyGroups.leadership.push(score);
            } else if (questionId >= 46 && questionId <= 60) {
                competencyGroups.creativity.push(score);
            } else if (questionId >= 61 && questionId <= 75) {
                competencyGroups.teamwork.push(score);
            }
        });

        // 각 역량별 평균 점수 계산
        const competencyScores = {
            problemSolving: Math.round(
                competencyGroups.problemSolving.reduce((sum, score) => sum + score, 0) /
                Math.max(competencyGroups.problemSolving.length, 1)
            ),
            communication: Math.round(
                competencyGroups.communication.reduce((sum, score) => sum + score, 0) /
                Math.max(competencyGroups.communication.length, 1)
            ),
            leadership: Math.round(
                competencyGroups.leadership.reduce((sum, score) => sum + score, 0) /
                Math.max(competencyGroups.leadership.length, 1)
            ),
            creativity: Math.round(
                competencyGroups.creativity.reduce((sum, score) => sum + score, 0) /
                Math.max(competencyGroups.creativity.length, 1)
            ),
            teamwork: Math.round(
                competencyGroups.teamwork.reduce((sum, score) => sum + score, 0) /
                Math.max(competencyGroups.teamwork.length, 1)
            )
        };

        // 전체 점수 (5개 역량의 평균)
        const overallScore = Math.round(
            Object.values(competencyScores).reduce((sum, score) => sum + score, 0) / 5
        );

        // 요약 로그만 출력
        console.log(`점수 계산 완료 - 전체: ${overallScore}점, 문제해결: ${competencyScores.problemSolving}, 커뮤니케이션: ${competencyScores.communication}, 리더십: ${competencyScores.leadership}, 창의성: ${competencyScores.creativity}, 팀워크: ${competencyScores.teamwork}`);

        const result = {
            id: Date.now().toString(),
            sessionId: sessionId, // 세션 ID 추가
            userId,
            answers,
            competencyScores,
            overallScore,
            testDate: submittedAt || new Date().toISOString(), // 클라이언트 제출 시간 사용
            submittedAt: submittedAt || new Date().toISOString() // 클라이언트 제출 시간 사용
        };

        const results = readResults();
        results.push(result);
        writeResults(results);

        console.log(`테스트 결과 저장 완료 - 세션: ${sessionId}, 전체점수: ${overallScore}점`);

        res.json({
            message: '검사 완료',
            result: {
                id: result.id,
                sessionId: result.sessionId,
                competencyScores: result.competencyScores,
                overallScore: result.overallScore,
                testDate: result.testDate,
                submittedAt: result.submittedAt,
                isExisting: false
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
    const isRailway = process.env.RAILWAY_ENVIRONMENT;
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || `localhost:${PORT}`;
    const protocol = isRailway ? 'https' : 'http';

    console.log(`===========================================`);
    console.log(`🚀 서버가 포트 ${PORT}에서 실행중입니다.`);
    if (isRailway) {
        console.log(`📋 API 테스트: ${protocol}://${domain}/api/health`);
        console.log(`🌐 웹사이트: ${protocol}://${domain}`);
        console.log(`🚂 Railway 환경에서 실행 중`);
    } else {
        console.log(`📋 API 테스트: http://localhost:${PORT}/api/health`);
        console.log(`🌐 웹사이트: http://localhost:${PORT}`);
        console.log(`💻 로컬 개발 환경에서 실행 중`);
    }
    console.log(`===========================================`);
});

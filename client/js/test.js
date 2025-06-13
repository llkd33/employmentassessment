// 전역 변수
let allQuestions = [];
let userAnswers = {};
let currentPage = 1;
const questionsPerPage = 15;
const totalPages = 5;
let isSubmitting = false;
let testSessionId = null; // 테스트 세션 ID 추가

// 카테고리별 정보 (스크린샷에 맞게 수정)
const categories = [
    { name: '조직 적응력', range: [1, 15], description: '(1-6차시)', stepLabel: '조직적응' },
    { name: '직무 전문성', range: [16, 30], description: '(7-12차시)', stepLabel: '직무전문성' },
    { name: '의사소통 능력', range: [31, 45], description: '(13-18차시)', stepLabel: '의사소통' },
    { name: '문제 해결역량', range: [46, 60], description: '(19-24차시)', stepLabel: '문제해결' },
    { name: '리더십', range: [61, 75], description: '(25-30차시)', stepLabel: '리더십' }
];

// 실제 문항 데이터
const questionTexts = [
    // 모듈 1 (1~15번): 조직 적응력 (1-6차시)
    "나는 모빌리티 산업의 전반적인 흐름과 주요 동향을 명확히 설명할 수 있다.",
    "우리 회사와 유사한 모빌리티 기업의 종류와 각각의 핵심 특징을 구분할 수 있다.",
    "국내외(특히 대구 지역) 모빌리티 기업의 구체적인 정보를 파악하고 있다.",
    "기업의 조직 문화가 업무 성과 및 개인의 만족도에 미치는 영향을 구체적인 사례로 설명할 수 있다는 것을 이해한다.",
    "우리 회사의 비전/미션이 경영 전략 및 회사의 방향 설정에 어떻게 반영되는지 이해하고 있다.",
    "기업의 일반적인 업무 프로세스를 시작부터 완료까지 단계별로 상세히 기술할 수 있다.",
    "조직 구성원으로서 업무가 할당되고 최종 결과물이 제출되기까지의 기본 절차를 정확히 이해하고 있다.",
    "조직, 팀, 개인의 KPI(핵심성과지표)가 무엇을 의미하며, 어떻게 설정되는지 명확히 알고 있다.",
    "나의 업무 목표(KPI)를 달성하기 위한 구체적이고 측정 가능한 실행 계획이 있다.",
    "나는 업무 내용을 기록하고 관리하는 도구의 필요성을 인지하고 있으며, 이를 적극적으로 활용한다.",
    "오늘 할 일 목록(TO DO 리스트)을 작성하고 우선순위를 설정하는 효과적인 방법을 알고 있다.",
    "복잡한 과업을 실행 가능한 세부 TO DO 항목으로 분해하여 구체화하여 만들 수 있다.",
    "시간 관리의 중요성을 깊이 이해하며, 시간 관리 부재가 가져올 수 있는 부정적인 결과를 구체적으로 인지하고 있다.",
    "나는 업무 효율을 극대화하기 위한 자신만의 구체적인 시간 관리 기법을 가지고 있다.",
    "신입으로서 회사 업무 프로세스를 신속하게 학습하기 위해 필요한 노력을 파악하고 있으며, 이를 실행할 의향이 있다.",

    // 모듈 2 (16~30번): 직무 전문성 (7-12차시)
    "회사 내 다양한 직무의 종류와 각 직무별 요구 역량을 구체적으로 설명할 수 있다.",
    "내가 지원하거나 맡게 될 직무에서 필수적으로 요구되는 핵심 역량 목록을 정확히 알고 있다.",
    "나의 현재 직무 역량이 신입사원에게 기대되는 수준에 객관적으로 부합한다고 생각한다.",
    "신입사원이 성공적인 업무 수행을 위해 반드시 갖춰야 할 필수 직무 역량 목록을 구체적으로 알고 있다.",
    "앞으로 나의 직무 역량을 체계적으로 발전시키기 위한 구체적인 학습 및 실행 계획이 있다.",
    "효율적인 업무 수행에 활용되는 다양한 종류의 소프트웨어 및 도구(툴)에 대해 알고 있다.",
    "문서 작성 도구(워드, 엑셀, PPT 등), 협업 서비스, 기본적인 ERP 시스템 등 필수 업무 툴 사용에 어려움이 없다.",
    "나의 직무 전문성 향상에 필요한 특정 업무 툴 활용 능력을 적극적으로 배양할 의지가 있다.",
    "모빌리티 산업의 최신 기술 트렌드와 향후 5년 이내의 발전 방향성에 대해 깊은 관심을 가지고 탐색하고 있다.",
    "모빌리티 산업 트렌드 중 특정 기술/동향이 나의 직무 수행 방식에 어떻게 적용될 수 있을지 구체적으로 고민해 본 경험이 있다.",
    "IoT, AI, 센싱 기술 등 모빌리티 분야에서 활용되는 주요 최신 기술의 개념 및 기본적인 작동 원리에 대해 설명할 수 있다.",
    "특정 최신 기술이 모빌리티 산업 생태계 및 미래 비즈니스 모델에 미칠 영향을 예측할 수 있다.",
    "나의 직무 역량 및 경험을 체계적으로 정리한 포트폴리오가 취업 경쟁력 강화에 핵심적이라고 생각한다.",
    "나의 강점과 차별화된 역량을 효과적으로 드러낼 수 있는 구체적인 포트폴리오 구성 아이디어가 있다.",
    "본 교육 과정에서 습득한 지식과 기술을 바탕으로 나의 취업 시장 경쟁력을 객관적으로 향상시킬 수 있다고 생각한다.",

    // 모듈 3 (31~45번): 의사소통 능력 (13-18차시)
    "머릿속의 아이디어와 정보를 구조화하고 체계적으로 정리하는 자신만의 명확한 방법을 가지고 있다.",
    "생각을 체계적으로 정리하는 능력이 복잡한 문제 해결 및 전반적인 업무 효율성에 직접적으로 기여한다는 것을 이해한다.",
    "정리된 아이디어나 정보를 상대방이 즉시 이해하도록 효과적으로 전달하는 능력이 매우 중요하다는 것을 생각한다.",
    "글, 말, 보고서 등 다양한 매체를 통해 정보를 전달할 때, 대상 청중이 쉽고 명확하게 이해하도록 표현할 수 있다.",
    "상대방의 의견을 경청하고 맥락을 정확히 파악하는 능력이 성공적인 업무 협력에 필수적임을 인지하고 있다.",
    "동료나 상사로부터 업무 및 역량에 대한 피드백을 받을 때, 개인적인 감정보다는 발전 기회로 여기며 열린 자세로 수용할 준비가 되어 있다.",
    "상대방의 성장을 돕는 건설적인 피드백을 명확하고 존중하는 방식으로 전달하는 구체적인 방법을 알고 있다.",
    "문서, 시스템 데이터, 구두 설명 등 다양한 형태의 정보를 신속하게 파악하고 핵심 내용을 분석할 수 있는 능력이 있다.",
    "일상적인 대화와 비즈니스 환경에서의 공식적인 커뮤니케이션 방식의 차이점을 명확히 이해하고 구분한다.",
    "업무 프레젠테이션 시 청중의 몰입도를 높이고 핵심 정보를 효과적으로 각인시키는 전문적인 스킬을 배우고 싶다.",
    "보고서, 이메일 등 비즈니스 문서 작성의 기본 원칙(명확성, 간결성, 정확성 등)과 그 중요성을 깊이 이해한다.",
    "특정 목적(정보 공유, 설득, 보고 등)과 상황에 맞춰 구조화되고 전문적인 비즈니스 문서를 작성할 수 있다.",
    "문서 작성을 통해 나의 생각이나 복잡한 정보를 상대방이 오해 없이 이해하도록 명확하고 간결하게 표현하는 구체적인 노하우를 배우고 싶다.",
    "동영상, 인포그래픽 등 시각적, 융복합적인 표현 방식이 정보 전달의 효과를 극대화할 수 있다고 생각한다.",
    "나의 역량이나 아이디어를 동영상 제작 또는 그래픽 디자인과 같은 새로운 방식으로 표현하는 도전을 기꺼이 시도할 의향이 있다.",

    // 모듈 4 (46~60번): 문제 해결역량 (19-24차시)
    "논리적으로 사고하고 문제를 체계적으로 분석하는 능력이 모든 업무 수행의 근간이라고 생각한다.",
    "MECE(Mutually Exclusive, Collectively Exhaustive)와 같은 구조적인 논리적 사고 프레임워크의 개념을 이해하고, 실제 문제 분석에 적용할 수 있다.",
    "복잡하게 얽힌 문제 상황 속에서 근본적인 원인과 핵심 문제를 정확하게 파악하고 정의하는 능력이 매우 중요하다는 것을 알고 있다.",
    "기존의 정해진 방식에 얽매이지 않고, 문제 해결을 위해 새롭고 창의적인 접근 방식을 탐색할 필요성을 느낀다.",
    "업무 중 예상치 못한 문제가 발생했을 때, 가능한 모든 해결책을 다각도로 모색하고 비교 분석하는 노력을 기울인다.",
    "데이터가 객관적인 업무 상황 파악, 효율성 측정 및 합리적인 의사결정에 결정적인 역할을 한다고 생각한다.",
    "다양한 출처에서 데이터를 수집하고 기본적인 통계 기법을 활용하여 의미 있는 정보를 도출하는 방법에 대해 설명할 수 있다.",
    "데이터 분석 결과를 근거로 문제의 원인을 규명하고, 가장 효과적인 해결책을 도출하거나 합리적인 의사결정을 내릴 수 있다.",
    "여러 대안 중에서 최적의 선택을 도출하기 위한 체계적이고 합리적인 의사 결정 프로세스가 무엇인지 명확히 이해한다.",
    "의사 결정 과정에서 발생할 수 있는 인지적 오류나 편향을 인지하고, 이를 최소화하기 위한 구체적인 방법을 알고 있다.",
    "AI 기술이 나의 직무와 관련된 반복적인 업무를 자동화하거나 복잡한 문제를 해결하는 데 실질적인 도움을 줄 수 있다고 생각한다.",
    "AI 기술 또는 도구를 나의 업무 프로세스에 통합하여 생산성을 구체적으로 향상시킬 수 있는 방안에 대해 생각해 본 경험이 있다.",
    "업무 중 발생하는 다양한 문제 상황의 근본 원인을 파악하고, 효과적인 해결 솔루션을 설계하는 과정에 큰 흥미와 관심이 있다.",
    "성공적인 문제 해결 사례들을 분석하고, 나만의 '문제 해결 솔루션 라이브러리'를 구축하는 것이 나의 전문성 향상에 크게 도움이 될 것이라고 생각한다.",
    "논리적 사고, 문제 해결 능력, 데이터 분석 능력, 그리고 합리적인 의사 결정 능력이 서로 유기적으로 연결되어 강력한 시너지를 창출한다고 이해하고 있다.",

    // 모듈 5 (61~75번): 리더십 (25-30차시)
    "기업가정신(Entrepreneurship)의 핵심 개념을 이해하며, 신입사원에게도 주도성과 혁신성을 발휘하는 데 필요하다고 생각한다.",
    "회사 환경에 빠르게 적응하고 업무에 기여하기 위해 진취적이고 긍정적인 태도로 임할 구체적인 준비가 되어 있다.",
    "모빌리티 산업 분야의 창업 트렌드 변화와 스타트업 생태계의 주요 특징에 대해 지속적인 관심을 가지고 탐색하고 있다.",
    "새로운 제품 또는 서비스 아이디어를 구체적인 비즈니스 모델로 발전시키는 체계적인 과정에 대해 자세히 알고 싶다.",
    "비즈니스 모델 설계 방법을 학습하는 것이 회사의 사업 구조와 운영 방식 전반을 깊이 이해하는 데 도움이 될 것이라고 생각한다.",
    "사업 운영에 필수적인 재무 요소(매출, 원가, 손익 분기점, 자금 흐름 등)의 기본적인 개념과 상호 관계를 명확히 이해하고 있다.",
    "회사의 사업 운영 전반에 대한 폭넓은 이해가 나의 직무 수행 역량 강화 및 회사 성장에 대한 기여도를 높이는 데 중요하다고 생각한다.",
    "조직 내부 구성원(동료, 상사)뿐만 아니라 외부 관계자(거래처, 고객 등)와 원활하게 소통하고 상호 협력하는 능력이 성공적인 비즈니스에 필수적이라고 생각한다.",
    "조직 내 리더의 핵심적인 역할과 책임을 이해하며, 주어진 업무를 넘어 스스로 목표를 설정하고 주도적으로 실행하는 직원이 되고 싶다.",
    "리더십의 관점에서 조직 및 업무를 바라보는 시각을 이해하는 것이 나의 개인적인 성장과 경력 개발에 도움이 될 것이라고 생각한다.",
    "기회가 주어진다면, 아이디어 구상부터 실행까지 스타트업 설립의 전 과정을 직접 경험해 보고 싶다.",
    "사업을 기획하고 실행하는 경험이 조직에 대한 주인의식을 함양하고 책임감을 강화하는 데 효과적인 방법이라고 생각한다.",
    "빠르게 변화하는 기술과 시장 환경 속에서 모빌리티 산업 분야에서 기존에 없던 새롭고 혁신적인 비즈니스 모델이 출현할 가능성이 매우 높다고 생각한다.",
    "본 교육 과정에서 습득한 지식과 역량을 실제 업무 환경에 적용하여 눈에 보이는 성과를 창출할 자신이 있다.",
    "본 교육 과정을 성공적으로 이수함으로써 앞으로 회사에 긍정적으로 기여하고 개인적으로도 지속적인 성장을 이루어 나갈 준비가 되었다."
];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('테스트 페이지 로딩 시작');

    // 로그인 상태 확인
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        showToast('로그인이 필요한 페이지입니다.', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }

    // 테스트 세션 ID 생성 또는 복원
    initializeTestSession();

    // 페이지 이탈 방지
    setupPageExitWarning();

    // 테스트 문항 로드
    loadQuestions();
});

// 테스트 세션 초기화
function initializeTestSession() {
    // 기존 세션 ID가 있는지 확인 (새로고침 등의 경우)
    const existingSessionId = sessionStorage.getItem('testSessionId');

    if (existingSessionId) {
        testSessionId = existingSessionId;
        console.log('기존 테스트 세션 복원:', testSessionId);
    } else {
        // 새로운 세션 ID 생성
        testSessionId = generateSessionId();
        sessionStorage.setItem('testSessionId', testSessionId);
        console.log('새로운 테스트 세션 생성:', testSessionId);

        // 새로운 테스트 시작 시 이전 결과 데이터 정리
        clearPreviousTestData();
    }
}

// 이전 테스트 데이터 정리
function clearPreviousTestData() {
    // localStorage에서 이전 테스트 결과 제거
    localStorage.removeItem('testResult');
    console.log('이전 테스트 결과 데이터가 정리되었습니다.');
}

// 세션 ID 생성 함수
function generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `test_${timestamp}_${random}`;
}

// 테스트 문항 로드 함수
async function loadQuestions() {
    try {
        showLoading(true);
        hideError();

        console.log('API에서 문항 로드 중...');
        const response = await fetch('/api/test/questions');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allQuestions = data.questions;

        console.log(`${allQuestions.length}개 문항 로드 완료`);

        if (allQuestions.length !== 75) {
            throw new Error(`예상된 75개 문항과 다릅니다. (실제: ${allQuestions.length}개)`);
        }

        showLoading(false);
        showToast('문항 로드 완료!', 'success');

        // 첫 번째 페이지 표시
        displayPage(1);

    } catch (error) {
        console.error('문항 로드 실패:', error);
        showLoading(false);
        showError(error.message);
    }
}

// 페이지 표시 함수
function displayPage(pageNumber) {
    currentPage = pageNumber;

    // 진행률 업데이트
    updateProgress();

    // 카테고리 헤더 업데이트
    const categoryHeader = document.getElementById('categoryHeader');
    categoryHeader.textContent = `${categories[pageNumber - 1].name} ${categories[pageNumber - 1].description}`;

    // 현재 페이지의 문항들 가져오기
    const startIndex = (pageNumber - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    const currentQuestions = allQuestions.slice(startIndex, endIndex);

    // 5점 척도 옵션 정의
    const scaleOptions = [
        { value: '전혀 그렇지 않다', label: '전혀<br>그렇지<br>않다' },
        { value: '대체로 그렇지 않다', label: '대체로<br>그렇지<br>않다' },
        { value: '보통이다', label: '보통<br>이다' },
        { value: '대체로 그렇다', label: '대체로<br>그렇다' },
        { value: '매우 그렇다', label: '매우<br>그렇다' }
    ];

    // 문항 컨테이너 업데이트
    const container = document.getElementById('questionsContainer');

    // 테이블 구조 생성
    container.innerHTML = `
            <table class="survey-table">
                <thead>
                    <tr>
                    <th></th>
                    <th>전혀<br>그렇지<br>않다</th>
                    <th>대체로<br>그렇지<br>않다</th>
                    <th>보통<br>이다</th>
                    <th>대체로<br>그렇다</th>
                    <th>매우<br>그렇다</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentQuestions.map((question, index) => `
                        <tr class="question-row" data-question-id="${question.id}">
                            <td class="question-text-cell">
                                ${startIndex + index + 1}. ${questionTexts[startIndex + index]}
                            </td>
                            ${scaleOptions.map((option, optionIndex) => `
                                <td class="scale-cell">
                                    <label class="scale-label">
                                        <input type="radio" 
                                               name="question_${question.id}" 
                                               value="${option.value}"
                                               onchange="saveAnswer(${question.id}, '${option.value}')"
                                               ${userAnswers[question.id] === option.value ? 'checked' : ''}>
                                        <span class="radio-custom"></span>
                                    </label>
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
    `;

    // 네비게이션 버튼 상태 업데이트
    updateNavigationButtons();

    // 페이지 정보 업데이트
    document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;

    console.log(`페이지 ${currentPage} 표시 완료 (문항 ${startIndex + 1}-${endIndex})`);
}

// 답변 저장 함수
function saveAnswer(questionId, answer) {
    userAnswers[questionId] = answer;

    // 조용히 저장 (토스트 메시지 제거)
    console.log(`문항 ${questionId} 답변 저장: ${answer}`);
}

// 진행률 업데이트 함수
function updateProgress() {
    const progressPercent = (currentPage / totalPages) * 100;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;

    // 진행률 텍스트 업데이트
    document.getElementById('progressText').textContent = `${currentPage}/${totalPages} 단계 (15문항)`;

    // 단계 표시기 업데이트
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const circle = item.querySelector('.step-circle');

        // 현재 페이지 활성화
        if (index + 1 === currentPage) {
            item.classList.add('active');
            circle.classList.add('active');
            circle.classList.remove('completed');
        }
        // 완료된 페이지
        else if (index + 1 < currentPage) {
            item.classList.remove('active');
            circle.classList.remove('active');
            circle.classList.add('completed');
        }
        // 미완료 페이지
        else {
            item.classList.remove('active');
            circle.classList.remove('active', 'completed');
        }
    });
}

// 네비게이션 버튼 상태 업데이트
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // 이전 버튼
    prevBtn.disabled = currentPage === 1;

    // 다음/제출 버튼
    if (currentPage === totalPages) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
}

// 이전 페이지로 이동
function previousPage() {
    if (currentPage > 1) {
        displayPage(currentPage - 1);
        scrollToTop();
    }
}

// 다음 페이지로 이동
function nextPage() {
    // 현재 페이지 답변 완료 여부 확인
    if (!isCurrentPageCompleted()) {
        showToast('현재 페이지의 모든 문항에 답변해주세요.', 'warning', 3000);
        return;
    }

    if (currentPage < totalPages) {
        displayPage(currentPage + 1);
        scrollToTop();
    }
}

// 현재 페이지 완료 여부 확인
function isCurrentPageCompleted() {
    const startIndex = (currentPage - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;

    for (let i = startIndex; i < endIndex; i++) {
        if (i < allQuestions.length) {
            const questionId = allQuestions[i].id;
            if (!userAnswers[questionId]) {
                return false;
            }
        }
    }
    return true;
}

// 헤더 버튼 함수들
function goBack() {
    if (confirm('테스트를 중단하고 메인 페이지로 돌아가시겠습니까?\n입력한 답변은 저장되지 않습니다.')) {
        window.location.href = '/';
    }
}

function goToMyPage() {
    if (confirm('마이페이지로 이동하시겠습니까?\n현재 진행 중인 테스트는 저장되지 않습니다.')) {
        window.location.href = '/mypage.html';
    }
}

function logout() {
    if (confirm('로그아웃하시겠습니까?\n현재 진행 중인 테스트는 저장되지 않습니다.')) {
        // localStorage에서 사용자 정보 제거
        localStorage.removeItem('userInfo');
        localStorage.removeItem('authToken');

        // 세션 정리
        sessionStorage.removeItem('testSessionId');

        // 로그인 페이지로 이동
        window.location.href = '/login.html';
    }
}

// goHome 함수 추가 (script.js에서 제거됨)
function goHome() {
    window.location.href = '/';
}

// 테스트 제출 함수
async function submitTest() {
    try {
        // 모든 답변 완료 여부 확인
        if (Object.keys(userAnswers).length !== 75) {
            showToast(`${75 - Object.keys(userAnswers).length}개 문항이 미완료되었습니다.`, 'warning', 3000);
            return;
        }

        isSubmitting = true;
        showLoading(true, '결과 계산 중...');

        // 답변 데이터 준비
        const submitTime = new Date().toISOString(); // 실제 제출 시간 기록
        const submitData = {
            answers: Object.keys(userAnswers).map(questionId => ({
                id: parseInt(questionId),
                answer: userAnswers[questionId]
            })),
            sessionId: testSessionId,
            submittedAt: submitTime // 제출 시간 추가
        };

        console.log('제출 데이터:', submitData);

        // 인증 토큰 및 사용자 정보 가져오기
        const userInfoRaw = localStorage.getItem('userInfo');
        const token = localStorage.getItem('authToken');

        console.log('🔍 localStorage 디버깅:');
        console.log('- userInfoRaw:', userInfoRaw);
        console.log('- userInfoRaw 타입:', typeof userInfoRaw);
        console.log('- token:', token);
        console.log('- token 타입:', typeof token);
        console.log('- localStorage 전체 키들:', Object.keys(localStorage));

        // localStorage 전체 내용 출력
        console.log('- localStorage 전체 내용:');
        for (let key of Object.keys(localStorage)) {
            console.log(`  ${key}: ${localStorage.getItem(key)}`);
        }

        let userInfo = null;
        try {
            userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
            console.log('✅ userInfo 파싱 성공:', userInfo);
        } catch (parseError) {
            console.error('❌ userInfo 파싱 실패:', parseError);
            console.log('원본 userInfoRaw:', userInfoRaw);
        }

        console.log('JWT 토큰 존재:', !!token);
        console.log('userInfo 존재:', !!userInfo);
        console.log('userInfo.id 존재:', !!(userInfo && userInfo.id));

        // 사용자 정보를 제출 데이터에 포함 (토큰이 없어도 userInfo로 인식 가능)
        if (userInfo && userInfo.id) {
            submitData.userInfo = {
                id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email
            };
            console.log('✅ userInfo를 서버에 전송:', JSON.stringify(submitData.userInfo, null, 2));
            console.log('✅ submitData에 userInfo 추가 후:', 'userInfo' in submitData);
        } else {
            console.log('❌ userInfo 전송 불가능');
            console.log('- localStorage userInfoRaw:', userInfoRaw);
            console.log('- 파싱된 userInfo:', userInfo);
            console.log('- userInfo가 존재:', !!userInfo);
            if (userInfo) {
                console.log('- userInfo.id 존재:', !!userInfo.id);
                console.log('- userInfo.id 값:', userInfo.id);
                console.log('- userInfo 구조:', Object.keys(userInfo));
                console.log('- userInfo 전체:', JSON.stringify(userInfo, null, 2));
            }
        }

        console.log('🚀 최종 제출 데이터:', JSON.stringify(submitData, null, 2));
        console.log('🚀 제출 데이터 크기:', JSON.stringify(submitData).length, '바이트');
        console.log('🚀 userInfo 포함 여부:', !!submitData.userInfo);
        if (submitData.userInfo) {
            console.log('🚀 전송할 userInfo:', JSON.stringify(submitData.userInfo, null, 2));
        } else {
            console.log('🚀 ❌ userInfo가 submitData에 포함되지 않았습니다!');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        console.log('🚀 요청 헤더:', headers);

        // API 호출
        const response = await fetch('/api/test/submit', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(submitData)
        });

        if (!response.ok) {
            throw new Error(`제출 실패: HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('제출 결과:', result);

        // 기존 결과인지 확인
        if (result.result.isExisting) {
            console.log('기존에 제출된 테스트 결과입니다.');
            showToast('이미 제출된 테스트입니다.', 'info');
        } else {
            console.log('새로운 테스트 결과가 저장되었습니다.');
        }

        // 결과 저장 - 서버에서 받은 전체 결과와 원본 답변 데이터를 합쳐서 저장
        const fullResult = {
            ...result.result, // 서버에서 계산한 점수들
            answers: submitData.answers, // 원본 답변 데이터
            message: result.message,
            sessionId: testSessionId, // 세션 ID 추가
            submittedAt: submitTime // 제출 시간 추가
        };

        localStorage.setItem('testResult', JSON.stringify(fullResult));
        console.log('저장된 결과:', fullResult);

        showLoading(false);
        showToast('결과 페이지로 이동합니다.', 'success');

        // 테스트 완료 후 세션 정리
        sessionStorage.removeItem('testSessionId');

        setTimeout(() => {
            window.location.href = '/result.html';
        }, 1000);

    } catch (error) {
        console.error('제출 오류:', error);
        isSubmitting = false;
        showLoading(false);
        showToast('제출 중 오류가 발생했습니다. 다시 시도해주세요.', 'error', 5000);
    }
}

// 재시도 함수
function retryLoadQuestions() {
    loadQuestions();
}

// 로딩 표시 함수
function showLoading(show, text = '문항을 불러오는 중입니다...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = overlay.querySelector('.loading-text');

    if (show) {
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

// 에러 표시 함수
function showError(message) {
    document.getElementById('questionsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// 에러 숨기기 함수
function hideError() {
    document.getElementById('questionsSection').style.display = 'block';
    document.getElementById('errorSection').style.display = 'none';
}

// 토스트 메시지 함수
function showToast(message, type = 'info', duration = 2000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    }[type] || 'ℹ️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // 애니메이션
    setTimeout(() => toast.classList.add('show'), 100);

    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, duration);
}

// 페이지 이탈 경고 설정
function setupPageExitWarning() {
    window.addEventListener('beforeunload', function (e) {
        if (isSubmitting || Object.keys(userAnswers).length === 0) {
            return; // 제출 중이거나 답변이 없으면 경고하지 않음
        }

        const message = '페이지를 벗어나면 입력한 답변이 사라집니다. 정말 나가시겠습니까?';
        e.preventDefault();
        e.returnValue = message;
        return message;
    });
}

// 맨 위로 스크롤
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
} 
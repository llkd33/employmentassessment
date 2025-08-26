const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createFeedbackSystem() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Creating feedback system tables...');
        
        await client.query('BEGIN');
        
        // 1. Create test_feedback table for overall feedback
        console.log('📝 Creating test_feedback table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_feedback (
                id SERIAL PRIMARY KEY,
                result_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                admin_id VARCHAR(255) NOT NULL,
                company_id INTEGER,
                
                -- Overall feedback
                overall_feedback TEXT,
                overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
                
                -- Status
                is_read BOOLEAN DEFAULT FALSE,
                is_archived BOOLEAN DEFAULT FALSE,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Foreign keys
                CONSTRAINT fk_feedback_result FOREIGN KEY (result_id) 
                    REFERENCES test_results(result_id) ON DELETE CASCADE,
                CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) 
                    REFERENCES users(user_id) ON DELETE CASCADE,
                CONSTRAINT fk_feedback_admin FOREIGN KEY (admin_id) 
                    REFERENCES users(user_id) ON DELETE SET NULL,
                CONSTRAINT fk_feedback_company FOREIGN KEY (company_id) 
                    REFERENCES companies(id) ON DELETE CASCADE
            )
        `);
        
        // 2. Create competency_feedback table for individual competency feedback
        console.log('📝 Creating competency_feedback table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS competency_feedback (
                id SERIAL PRIMARY KEY,
                feedback_id INTEGER NOT NULL,
                competency_type VARCHAR(50) NOT NULL,
                score INTEGER NOT NULL,
                feedback TEXT,
                strengths TEXT,
                improvements TEXT,
                action_items TEXT,
                
                -- Competency types: problem_solving, communication, leadership, creativity, teamwork
                CONSTRAINT check_competency_type CHECK (
                    competency_type IN (
                        'problem_solving', 
                        'communication', 
                        'leadership', 
                        'creativity', 
                        'teamwork'
                    )
                ),
                
                -- Foreign key
                CONSTRAINT fk_competency_feedback FOREIGN KEY (feedback_id) 
                    REFERENCES test_feedback(id) ON DELETE CASCADE
            )
        `);
        
        // 3. Create feedback_templates table for reusable feedback templates
        console.log('📝 Creating feedback_templates table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS feedback_templates (
                id SERIAL PRIMARY KEY,
                company_id INTEGER,
                admin_id VARCHAR(255),
                template_name VARCHAR(255) NOT NULL,
                competency_type VARCHAR(50),
                score_range_min INTEGER,
                score_range_max INTEGER,
                template_text TEXT NOT NULL,
                template_type VARCHAR(50) DEFAULT 'general',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Template types: strength, improvement, action_item, general
                CONSTRAINT check_template_type CHECK (
                    template_type IN ('strength', 'improvement', 'action_item', 'general')
                ),
                
                -- Foreign keys
                CONSTRAINT fk_template_company FOREIGN KEY (company_id) 
                    REFERENCES companies(id) ON DELETE CASCADE,
                CONSTRAINT fk_template_admin FOREIGN KEY (admin_id) 
                    REFERENCES users(user_id) ON DELETE SET NULL
            )
        `);
        
        // 4. Create feedback_notifications table
        console.log('📝 Creating feedback_notifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS feedback_notifications (
                id SERIAL PRIMARY KEY,
                feedback_id INTEGER NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                notification_type VARCHAR(50) DEFAULT 'new_feedback',
                is_read BOOLEAN DEFAULT FALSE,
                is_sent BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Notification types
                CONSTRAINT check_notification_type CHECK (
                    notification_type IN ('new_feedback', 'feedback_update', 'reminder')
                ),
                
                -- Foreign keys
                CONSTRAINT fk_notification_feedback FOREIGN KEY (feedback_id) 
                    REFERENCES test_feedback(id) ON DELETE CASCADE,
                CONSTRAINT fk_notification_user FOREIGN KEY (user_id) 
                    REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);
        
        // 5. Create indexes for better performance
        console.log('📝 Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_feedback_result_id ON test_feedback(result_id);
            CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON test_feedback(user_id);
            CREATE INDEX IF NOT EXISTS idx_feedback_admin_id ON test_feedback(admin_id);
            CREATE INDEX IF NOT EXISTS idx_feedback_company_id ON test_feedback(company_id);
            CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON test_feedback(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_competency_feedback_id ON competency_feedback(feedback_id);
            CREATE INDEX IF NOT EXISTS idx_template_company_id ON feedback_templates(company_id);
            CREATE INDEX IF NOT EXISTS idx_notification_user_id ON feedback_notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notification_read ON feedback_notifications(is_read);
        `);
        
        // 6. Insert sample feedback templates
        console.log('📝 Creating sample feedback templates...');
        await client.query(`
            INSERT INTO feedback_templates (template_name, competency_type, score_range_min, score_range_max, template_text, template_type)
            VALUES 
            -- Problem Solving Templates
            ('Excellent Problem Solver', 'problem_solving', 80, 100, '뛰어난 문제 해결 능력을 보여주셨습니다. 체계적인 접근과 창의적인 해결책을 제시하는 능력이 돋보입니다.', 'strength'),
            ('Good Problem Solving', 'problem_solving', 60, 79, '문제 해결 능력이 양호합니다. 더 다양한 관점에서 문제를 바라보시면 좋겠습니다.', 'general'),
            ('Needs Improvement - Problem Solving', 'problem_solving', 0, 59, '문제 해결 과정에서 체계적인 접근이 필요합니다. 문제 분석 단계를 강화하시기 바랍니다.', 'improvement'),
            
            -- Communication Templates
            ('Outstanding Communicator', 'communication', 80, 100, '탁월한 의사소통 능력을 갖추고 계십니다. 명확하고 효과적으로 메시지를 전달하십니다.', 'strength'),
            ('Effective Communication', 'communication', 60, 79, '의사소통 능력이 양호합니다. 경청 스킬을 더 개발하시면 좋겠습니다.', 'general'),
            ('Communication Development Needed', 'communication', 0, 59, '의사소통 능력 향상이 필요합니다. 적극적인 경청과 명확한 표현 연습을 권장합니다.', 'improvement'),
            
            -- Leadership Templates
            ('Natural Leader', 'leadership', 80, 100, '천부적인 리더십을 보여주셨습니다. 팀을 이끄는 능력과 비전 제시가 뛰어납니다.', 'strength'),
            ('Leadership Potential', 'leadership', 60, 79, '리더십 잠재력이 있습니다. 더 많은 리더십 기회를 경험하시기 바랍니다.', 'general'),
            ('Leadership Skills Development', 'leadership', 0, 59, '리더십 스킬 개발이 필요합니다. 팀워크와 의사결정 능력을 강화하시기 바랍니다.', 'improvement'),
            
            -- Creativity Templates
            ('Highly Creative', 'creativity', 80, 100, '매우 창의적인 사고를 갖추고 계십니다. 혁신적인 아이디어와 접근법이 인상적입니다.', 'strength'),
            ('Creative Thinker', 'creativity', 60, 79, '창의적 사고가 양호합니다. 더 다양한 분야의 지식을 접하시면 도움이 될 것입니다.', 'general'),
            ('Creativity Enhancement Needed', 'creativity', 0, 59, '창의성 개발이 필요합니다. 브레인스토밍과 다양한 관점 연습을 추천합니다.', 'improvement'),
            
            -- Teamwork Templates
            ('Excellent Team Player', 'teamwork', 80, 100, '훌륭한 팀 플레이어입니다. 협업 능력과 팀 기여도가 매우 높습니다.', 'strength'),
            ('Good Team Contributor', 'teamwork', 60, 79, '팀워크가 양호합니다. 더 적극적인 의견 제시를 기대합니다.', 'general'),
            ('Teamwork Improvement Needed', 'teamwork', 0, 59, '팀워크 향상이 필요합니다. 협업 스킬과 공감 능력을 개발하시기 바랍니다.', 'improvement'),
            
            -- Action Items
            ('Problem Solving Action', 'problem_solving', 0, 100, '1. 문제 분석 프레임워크 학습\n2. 케이스 스터디 연습\n3. 멘토와 정기 미팅', 'action_item'),
            ('Communication Action', 'communication', 0, 100, '1. 프레젠테이션 스킬 워크샵 참여\n2. 적극적 경청 연습\n3. 서면 커뮤니케이션 개선', 'action_item'),
            ('Leadership Action', 'leadership', 0, 100, '1. 리더십 교육 프로그램 이수\n2. 프로젝트 리드 경험 쌓기\n3. 리더십 도서 독서', 'action_item'),
            ('Creativity Action', 'creativity', 0, 100, '1. 창의적 사고 워크샵 참여\n2. 다양한 분야 학습\n3. 아이디어 저널 작성', 'action_item'),
            ('Teamwork Action', 'teamwork', 0, 100, '1. 팀 빌딩 활동 참여\n2. 협업 도구 활용 능력 향상\n3. 팀 프로젝트 적극 참여', 'action_item')
            ON CONFLICT DO NOTHING
        `);
        
        await client.query('COMMIT');
        console.log('✅ Feedback system tables created successfully!');
        
        // Display table structure
        const tables = ['test_feedback', 'competency_feedback', 'feedback_templates', 'feedback_notifications'];
        console.log('\n📊 Created tables:');
        for (const table of tables) {
            const result = await client.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_name = $1
            `, [table]);
            if (result.rows[0].count > 0) {
                console.log(`   ✅ ${table}`);
            }
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating feedback system:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run if executed directly
if (require.main === module) {
    createFeedbackSystem()
        .then(() => {
            console.log('✅ Feedback system setup complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed to create feedback system:', error);
            process.exit(1);
        });
}

module.exports = createFeedbackSystem;
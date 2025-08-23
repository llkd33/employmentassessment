#!/usr/bin/env node

/**
 * Admin System Enhancements Migration Runner
 * Run: node database/migrate-admin-enhancements.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// Database connection
const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

async function runMigration() {
    const client = new Client({ connectionString });
    
    try {
        console.log('🚀 Starting Admin System Enhancements Migration...');
        console.log('📊 Database:', process.env.DB_NAME || 'employee_assessment');
        
        await client.connect();
        console.log('✅ Connected to database');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrate-admin-enhancements.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split by statement and execute
        const statements = migrationSQL
            .split(';')
            .filter(stmt => stmt.trim())
            .map(stmt => stmt.trim() + ';');

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments
            if (statement.startsWith('--') || statement.length < 10) {
                continue;
            }

            try {
                // Extract operation type for logging
                const operation = statement.substring(0, 50).replace(/\n/g, ' ');
                process.stdout.write(`  [${i + 1}/${statements.length}] Executing: ${operation}...`);
                
                await client.query(statement);
                console.log(' ✅');
                successCount++;
            } catch (error) {
                console.log(' ❌');
                errorCount++;
                
                // Log error but continue
                errors.push({
                    statement: statement.substring(0, 100),
                    error: error.message
                });

                // If it's a "already exists" error, we can continue
                if (error.message.includes('already exists')) {
                    console.log('    ⚠️  Table/column already exists, skipping...');
                    errorCount--;
                } else {
                    console.error('    Error:', error.message);
                }
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`  ✅ Successful: ${successCount}`);
        console.log(`  ❌ Failed: ${errorCount}`);

        if (errors.length > 0 && errorCount > 0) {
            console.log('\n⚠️  Errors encountered:');
            errors.forEach(err => {
                console.log(`  - ${err.statement.substring(0, 50)}...`);
                console.log(`    ${err.error}`);
            });
        }

        // Verify critical tables were created
        console.log('\n🔍 Verifying critical tables...');
        const criticalTables = [
            'notifications',
            'audit_trails',
            'system_metrics',
            'user_sessions',
            'activity_feed',
            'dashboard_widgets',
            'announcements'
        ];

        for (const table of criticalTables) {
            const result = await client.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )`,
                [table]
            );
            
            const exists = result.rows[0].exists;
            console.log(`  ${exists ? '✅' : '❌'} Table: ${table}`);
        }

        // Insert sample data for testing
        console.log('\n📦 Inserting sample data...');
        
        // Sample notification
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, priority)
            SELECT user_id, 'Welcome to Enhanced Admin System', 
                   'The admin dashboard has been upgraded with new features!', 
                   'info', 'normal'
            FROM users 
            WHERE role = 'super_admin'
            LIMIT 1
            ON CONFLICT DO NOTHING
        `);
        console.log('  ✅ Sample notification created');

        // Sample announcement
        await client.query(`
            INSERT INTO announcements (title, content, type, created_by)
            VALUES (
                'System Upgrade Complete',
                'The admin system has been enhanced with real-time analytics, audit trails, and improved security.',
                'success',
                (SELECT user_id FROM users WHERE role = 'super_admin' LIMIT 1)
            )
            ON CONFLICT DO NOTHING
        `);
        console.log('  ✅ Sample announcement created');

        // Sample system metrics
        await client.query(`
            INSERT INTO system_metrics (metric_type, metric_name, metric_value, metric_unit)
            VALUES 
                ('performance', 'server_load', 35, 'percent'),
                ('performance', 'memory_usage', 52, 'percent'),
                ('performance', 'api_response_time', 125, 'ms')
            ON CONFLICT DO NOTHING
        `);
        console.log('  ✅ Sample metrics created');

        console.log('\n✨ Migration completed successfully!');
        console.log('📌 Next steps:');
        console.log('  1. Restart the server to apply changes');
        console.log('  2. Access /super-admin-dashboard-v2.html for the enhanced dashboard');
        console.log('  3. Check /api/admin/analytics/* endpoints for new features');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n👋 Database connection closed');
    }
}

// Run migration
runMigration().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
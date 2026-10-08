import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '12345678';
const dbName = process.env.DB_NAME || 'db_system_ap';

async function truncateAll() {
  console.log('====================================================');
  console.log('🧹  db:truncate — Delete ALL rows from every table');
  console.log(`    Database : ${dbName} @ ${dbHost}:${dbPort}`);
  console.log('====================================================');

  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  });

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tables = [
      'audit_logs',
      'daily_payments',
      'partial_payments',
      'invoice_line_items',
      'invoices',
      'vendors',
    ];

    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`   🧹  Cleared: ${table}`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('');
    console.log('✅  All tables are now empty. Schema & structure are preserved.');
    console.log('====================================================');
    await conn.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌  truncate failed:', err.message || err);
    await conn.end().catch(() => {});
    process.exit(1);
  }
}

truncateAll();

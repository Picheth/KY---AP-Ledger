import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '12345678';
const dbName = process.env.DB_NAME || 'db_system_ap';

async function migrateFresh() {
  console.log('====================================================');
  console.log('🔥  db:migrate:fresh — Drop ALL tables & re-create');
  console.log(`    Database : ${dbName}`);
  console.log(`    Host     : ${dbHost}:${dbPort}`);
  console.log(`    User     : ${dbUser}`);
  console.log('====================================================');

  let conn: mysql.Connection | null = null;

  try {
    // Connect without selecting a DB first so we can CREATE / DROP it
    conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true,
    });

    // ── 1. Ensure database exists ─────────────────────────────────
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.query(`USE \`${dbName}\`;`);
    console.log(`✅  Using database: ${dbName}`);

    // ── 2. Disable FK checks so we can drop in any order ─────────
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    // ── 3. Drop all tables ────────────────────────────────────────
    const tables = [
      'audit_logs',
      'daily_payments',
      'partial_payments',
      'invoice_line_items',
      'invoices',
      'vendors',
    ];

    for (const table of tables) {
      await conn.query(`DROP TABLE IF EXISTS \`${table}\`;`);
      console.log(`   🗑  Dropped table: ${table}`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('');

    // ── 4. Re-create all tables ───────────────────────────────────
    console.log('📐  Creating schema...');

    await conn.query(`
      CREATE TABLE \`vendors\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'General',
        \`tax_id\` VARCHAR(100) DEFAULT '',
        \`email\` VARCHAR(255) DEFAULT '',
        \`phone\` VARCHAR(100) DEFAULT '',
        \`address\` TEXT DEFAULT NULL,
        \`bank_name\` VARCHAR(100) DEFAULT 'ABA Bank',
        \`bank_routing_number\` VARCHAR(50) DEFAULT '',
        \`bank_account_number\` VARCHAR(100) DEFAULT '',
        \`default_payment_method\` VARCHAR(50) DEFAULT 'aba_pay',
        \`default_payment_terms\` VARCHAR(50) DEFAULT 'Net 30',
        \`rating\` DECIMAL(2,1) DEFAULT 5.0,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`contact_person\` VARCHAR(255) DEFAULT '',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅  vendors');

    await conn.query(`
      CREATE TABLE \`invoices\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`invoice_number\` VARCHAR(100) NOT NULL UNIQUE,
        \`type\` VARCHAR(30) NOT NULL DEFAULT 'payable',
        \`po_number\` VARCHAR(100) DEFAULT NULL,
        \`vendor_id\` VARCHAR(64) NOT NULL,
        \`vendor_name\` VARCHAR(255) NOT NULL,
        \`vendor_category\` VARCHAR(100) DEFAULT 'General',
        \`issue_date\` DATE NOT NULL,
        \`due_date\` DATE NOT NULL,
        \`currency\` VARCHAR(10) NOT NULL DEFAULT 'USD',
        \`subtotal\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`tax_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`total_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`base_amount_usd\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`amount_paid\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`remaining_balance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'approved',
        \`payment_terms\` VARCHAR(50) DEFAULT 'Net 30',
        \`department\` VARCHAR(100) DEFAULT 'Store Operations',
        \`assigned_approver_role\` VARCHAR(50) DEFAULT 'cfo',
        \`three_way_matched\` TINYINT(1) DEFAULT 1,
        \`payment_method\` VARCHAR(50) DEFAULT NULL,
        \`payment_reference\` VARCHAR(255) DEFAULT NULL,
        \`paid_at\` VARCHAR(50) DEFAULT NULL,
        \`reminders_sent_count\` INT DEFAULT 0,
        \`last_reminder_date\` VARCHAR(50) DEFAULT NULL,
        \`notes\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_vendor_name\` (\`vendor_name\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_due_date\` (\`due_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅  invoices');

    await conn.query(`
      CREATE TABLE \`invoice_line_items\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`invoice_id\` VARCHAR(64) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`quantity\` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        \`unit_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`tax_rate\` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
        \`total_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_line_items_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅  invoice_line_items');

    await conn.query(`
      CREATE TABLE \`partial_payments\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`invoice_id\` VARCHAR(64) NOT NULL,
        \`amount\` DECIMAL(15,2) NOT NULL,
        \`amount_usd\` DECIMAL(15,2) NOT NULL,
        \`payment_date\` DATE NOT NULL,
        \`payment_method\` VARCHAR(50) NOT NULL DEFAULT 'aba_pay',
        \`reference\` VARCHAR(255) DEFAULT '',
        \`notes\` TEXT DEFAULT NULL,
        \`recorded_by\` VARCHAR(100) DEFAULT 'Cashier',
        \`remaining_balance_after\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_partial_payments_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅  partial_payments');

    await conn.query(`
      CREATE TABLE \`daily_payments\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`date\` DATE NOT NULL,
        \`supplier\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(15,2) NOT NULL,
        \`payment_method\` VARCHAR(50) NOT NULL DEFAULT 'aba_pay',
        \`reference\` VARCHAR(255) DEFAULT '',
        \`notes\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅  daily_payments');

    await conn.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`invoice_id\` VARCHAR(64) DEFAULT NULL,
        \`timestamp\` VARCHAR(50) NOT NULL,
        \`user_name\` VARCHAR(100) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        \`action\` VARCHAR(255) NOT NULL,
        \`note\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✅  audit_logs');

    // ── 5. Seed vendors ───────────────────────────────────────────
    console.log('');
    console.log('🌱  Seeding data...');

    await conn.query(`
      INSERT INTO \`vendors\` (
        \`id\`, \`name\`, \`category\`, \`bank_name\`, \`bank_account_number\`,
        \`default_payment_method\`, \`default_payment_terms\`, \`status\`, \`contact_person\`
      ) VALUES
        ('vnd_s4_lh',      'S4 LH',       'Mobile Phones, Tablets and Accessories', 'ABA Bank',     '001 882 101', 'aba_pay', 'Net 15', 'active',    'Mr. Lim Heng'),
        ('vnd_s3_plp',     'S3 PLP',      'Mobile Phones (second-hand)',            'ABA Bank',     '002 449 202', 'aba_pay', 'Net 7',  'preferred', 'Mr. Po Long Pao'),
        ('vnd_s3_plp_new', 'S3 PLP-NEW',  'Mobile Phone (New)',                    'Canadia Bank', '100 892 301', 'acleda', 'Net 30', 'active',    'Mrs. Pao New'),
        ('vnd_s5_dn',      'S5 DN',       'Accessories',                           'ABA Bank',     '005 331 404', 'khqr',   'Net 30', 'active',    'Mr. Da Nang'),
        ('vnd_s6_vns',     'S6 VNS',      'Mobile Phone',                         'Wing Bank',    '092 555 606', 'wing',   'Net 15', 'active',    'Mr. Van Sopheak'),
        ('vnd_s7_pt',      'S7 PT',       'Tablets and Laptops',                  'ABA Bank',     '007 889 707', 'aba_pay', 'Net 30', 'active',    'Mrs. Pich Thida')
      ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);
    `);
    console.log('   ✅  vendors (6 rows)');

    // ── 6. Seed daily_payments ────────────────────────────────────
    await conn.query(`
      INSERT INTO \`daily_payments\` (\`id\`, \`date\`, \`supplier\`, \`amount\`, \`payment_method\`, \`reference\`, \`notes\`) VALUES
        ('spay_1',  '2026-10-01', 'S4 LH',      45000.00, 'aba_pay', 'ABA-S4-1001',  'Daily payment to S4 LH'),
        ('spay_2',  '2026-10-01', 'S3 PLP-NEW', 60000.00, 'aba_pay', 'ABA-PLN-1001', 'Daily payment to S3 PLP-NEW'),
        ('spay_3',  '2026-09-30', 'S3 PLP-NEW', 50000.00, 'aba_pay', 'ABA-PLN-0930', 'Daily payment to S3 PLP-NEW'),
        ('spay_4',  '2026-09-30', 'S4 LH',      30000.00, 'aba_pay', 'ABA-S4-0930',  'Daily payment to S4 LH'),
        ('spay_5',  '2026-09-29', 'S4 LH',      15000.00, 'aba_pay', 'ABA-S4-0929',  'Daily installment payout'),
        ('spay_6',  '2026-09-28', 'S3 PLP-NEW', 40000.00, 'aba_pay', 'ABA-PLN-0928', 'Daily payment to S3 PLP-NEW'),
        ('spay_7',  '2026-09-28', 'S4 LH',      30000.00, 'aba_pay', 'ABA-S4-0928',  'Daily payment to S4 LH'),
        ('spay_8',  '2026-09-27', 'S3 PLP-NEW', 40000.00, 'aba_pay', 'ABA-PLN-0927', 'Daily payment to S3 PLP-NEW'),
        ('spay_9',  '2026-09-27', 'S4 LH',      15000.00, 'aba_pay', 'ABA-S4-0927',  'Daily installment payout'),
        ('spay_10', '2026-09-26', 'S4 LH',      14000.00, 'aba_pay', 'ABA-S4-0926',  'Daily installment payout'),
        ('spay_11', '2026-09-25', 'S3 PLP-NEW', 50000.00, 'aba_pay', 'ABA-PLN-0925', 'Daily payment to S3 PLP-NEW'),
        ('spay_12', '2026-09-25', 'S4 LH',      29000.00, 'aba_pay', 'ABA-S4-0925',  'Daily installment payout'),
        ('spay_13', '2026-09-24', 'S3 PLP-NEW', 40000.00, 'aba_pay', 'ABA-PLN-0924', 'Daily payment to S3 PLP-NEW'),
        ('spay_14', '2026-09-24', 'S4 LH',      25000.00, 'aba_pay', 'ABA-S4-0924',  'Daily payment to S4 LH')
      ON DUPLICATE KEY UPDATE \`amount\` = VALUES(\`amount\`);
    `);
    console.log('   ✅  daily_payments (14 rows)');

    console.log('');
    console.log('====================================================');
    console.log('✅  migrate:fresh completed — database is clean & seeded!');
    console.log('====================================================');

    await conn.end();
    process.exit(0);
  } catch (err: any) {
    console.error('');
    console.error('❌  migrate:fresh failed:', err.message || err);
    if (conn) await conn.end().catch(() => {});
    process.exit(1);
  }
}

migrateFresh();

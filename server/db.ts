import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '12345678';
const dbName = process.env.DB_NAME || 'db_system_ap';

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  database: string;
}

export const currentDBConfig: DBConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  database: dbName,
};

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastError: string | null = null;

export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};

export const checkDatabaseConnection = async (): Promise<{
  connected: boolean;
  database: string;
  host: string;
  error?: string;
}> => {
  try {
    // First connect without specifying database to ensure MySQL server is reachable
    const testConn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
    });
    
    // Ensure database exists
    await testConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await testConn.end();

    // Now test with pool
    const p = getPool();
    const [rows] = await p.query('SELECT 1 + 1 AS result');
    isConnected = true;
    lastError = null;
    return {
      connected: true,
      database: dbName,
      host: `${dbHost}:${dbPort}`,
    };
  } catch (err: any) {
    isConnected = false;
    lastError = err.message || 'Unknown database error';
    return {
      connected: false,
      database: dbName,
      host: `${dbHost}:${dbPort}`,
      error: lastError || undefined,
    };
  }
};

export const initDatabaseSchema = async () => {
  try {
    const status = await checkDatabaseConnection();
    if (!status.connected) {
      console.warn(`[MySQL] Server at ${dbHost}:${dbPort} is not reachable yet. Error: ${status.error}`);
      return false;
    }

    const p = getPool();

    // 1. Vendors table
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`vendors\` (
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

    // 2. Invoices table
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`invoices\` (
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

    // 3. Invoice line items
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`invoice_line_items\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`invoice_id\` VARCHAR(64) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`quantity\` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        \`unit_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`tax_rate\` DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
        \`total_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_line_items_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Partial payments
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`partial_payments\` (
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

    // 5. Daily payments
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`daily_payments\` (
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

    // 6. Audit logs
    await p.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
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

    console.log(`[MySQL] Database \`${dbName}\` schema initialized successfully.`);
    return true;
  } catch (err) {
    console.error('[MySQL] Error initializing schema:', err);
    return false;
  }
};

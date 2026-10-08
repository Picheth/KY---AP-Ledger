import { initDatabaseSchema, checkDatabaseConnection } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('----------------------------------------------------');
  console.log('🚀 Running MySQL Schema Migration for KY AP Ledger...');
  console.log(`Database: ${process.env.DB_NAME || 'db_system_ap'} @ ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  console.log('----------------------------------------------------');

  const status = await checkDatabaseConnection();
  if (!status.connected) {
    console.error('❌ Migration failed: Could not connect to MySQL server.');
    console.error(`Error: ${status.error}`);
    process.exit(1);
  }

  const success = await initDatabaseSchema();
  if (success) {
    console.log('✅ Migration completed successfully! All tables are up to date.');
    process.exit(0);
  } else {
    console.error('❌ Migration encountered errors.');
    process.exit(1);
  }
}

runMigration().catch((err) => {
  console.error('❌ Unexpected migration error:', err);
  process.exit(1);
});

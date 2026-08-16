import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, closePool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log(`[Migration] Reading schema from ${schemaPath}...`);
  
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('[Migration] Executing PostgreSQL DDL migration...');
    await pool.query(schemaSql);
    console.log('✅ [Migration] PostgreSQL schema migration applied successfully!');
  } catch (error) {
    console.error('❌ [Migration Error]:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runMigration();
